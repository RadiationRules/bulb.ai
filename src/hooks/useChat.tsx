import { useState, useRef, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

export type AiStage = 'idle' | 'reading' | 'thinking' | 'coding' | 'done';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

const messageSchema = z.string().trim().min(1, 'Message cannot be empty').max(10000, 'Message too long');

// Module-level cache so chat persists across tab switches/component remounts
const chatCache = new Map<string, Message[]>();
const inFlightRef = new Map<string, AbortController>();

export const useChat = (projectId?: string) => {
  const cacheKey = projectId || '__global__';
  const [messages, setMessages] = useState<Message[]>(() => chatCache.get(cacheKey) || []);
  const [isLoading, setIsLoading] = useState(() => inFlightRef.has(cacheKey));
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [aiStage, setAiStage] = useState<AiStage>('idle');
  const [stageDetail, setStageDetail] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedRef = useRef(false);

  // Sync local state with shared cache (when tabs swap)
  useEffect(() => {
    chatCache.set(cacheKey, messages);
  }, [messages, cacheKey]);

  // Load persisted messages on mount (only if cache empty)
  useEffect(() => {
    if (!projectId || loadedRef.current) return;
    loadedRef.current = true;
    if (chatCache.get(cacheKey)?.length) return;

    const loadMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100);
      if (data && data.length > 0) {
        const loaded = data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        chatCache.set(cacheKey, loaded);
        setMessages(loaded);
      }
    };
    loadMessages();
  }, [projectId, cacheKey]);

  const persistMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!projectId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('chat_messages').insert({ project_id: projectId, user_id: user.id, role, content });
    } catch (err) {
      console.error('Failed to persist message:', err);
    }
  };

  const streamChat = async (userMessage: string, displayMessage?: string, images?: string[]) => {
    try {
      const validatedMessage = messageSchema.parse(userMessage);

      const newUserMessage: Message = {
        role: 'user',
        content: displayMessage || validatedMessage,
        images,
      };
      setMessages(prev => {
        const next = [...prev, newUserMessage];
        chatCache.set(cacheKey, next);
        return next;
      });
      setIsLoading(true);
      setCurrentFile(null);
      setAiStage('thinking');
      setStageDetail('Planning approach...');

      persistMessage('user', displayMessage || validatedMessage);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      inFlightRef.set(cacheKey, controller);

      const messagesWithContext = [...(chatCache.get(cacheKey) || []), { role: 'user' as const, content: userMessage }];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to use the AI assistant');

      const response = await fetch(
        `https://thpdlrhpodjysrfsokqo.supabase.co/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: messagesWithContext, images: images || null }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment.');
        if (response.status === 402) throw new Error('Credits used for the day — switched to free tier. Upgrade at /pricing for more.');
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      setMessages(prev => {
        const next = [...prev, { role: 'assistant' as const, content: '' }];
        chatCache.set(cacheKey, next);
        return next;
      });

      // Smooth typewriter: drip incoming content out at a steady cadence (~80 chars/frame max)
      let pendingContent = '';
      let displayedLen = 0;
      let rafId: number | null = null;

      const flushUpdate = () => {
        // Reveal up to 4 chars per frame for a natural typing feel.
        // If the buffer is huge (e.g. paste), accelerate so we don't fall too far behind.
        const remaining = pendingContent.length - displayedLen;
        const step = remaining > 400 ? Math.ceil(remaining / 30) : Math.min(8, remaining);
        if (step > 0) {
          displayedLen = Math.min(pendingContent.length, displayedLen + step);
          const visible = pendingContent.slice(0, displayedLen);
          setMessages(prev => {
            if (!prev.length) return prev;
            const next = prev.slice();
            next[next.length - 1] = { role: 'assistant', content: visible };
            chatCache.set(cacheKey, next);
            return next;
          });
        }
        if (displayedLen < pendingContent.length) {
          rafId = requestAnimationFrame(flushUpdate);
        } else {
          rafId = null;
        }
      };

      const updateAssistant = (content: string) => {
        pendingContent = content;
        if (!rafId) rafId = requestAnimationFrame(flushUpdate);
      };

      let hasStartedCoding = false;
      const detectFile = (text: string) => {
        const createMatch = text.match(/CREATE_FILE:\s*([^\n]+)/);
        const codeMatch = text.match(/```(\w+)?[\s\S]*?```/);
        if (createMatch) {
          const fname = createMatch[1].trim();
          setCurrentFile(fname);
          setAiStage('coding');
          setStageDetail(`Writing ${fname}`);
          hasStartedCoding = true;
        } else if (codeMatch && !hasStartedCoding) {
          setCurrentFile('code');
          setAiStage('coding');
          setStageDetail('Writing code...');
          hasStartedCoding = true;
        }
        if (!hasStartedCoding && text.length > 10) {
          setAiStage('thinking');
          setStageDetail('Generating response...');
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              detectFile(assistantContent);
              updateAssistant(assistantContent);
            }
          } catch {}
        }
      }

      // Final flush — make sure full content is rendered even if RAF hasn't caught up
      if (rafId) cancelAnimationFrame(rafId);
      pendingContent = assistantContent;
      displayedLen = assistantContent.length;
      setMessages(prev => {
        if (!prev.length) return prev;
        const next = prev.slice();
        next[next.length - 1] = { role: 'assistant', content: assistantContent };
        chatCache.set(cacheKey, next);
        return next;
      });

      if (assistantContent) persistMessage('assistant', assistantContent);

      setAiStage('done');
      setStageDetail('Complete');
      setTimeout(() => { setAiStage('idle'); setStageDetail(''); }, 2000);
      setIsLoading(false);
      setCurrentFile(null);
      abortControllerRef.current = null;
      inFlightRef.delete(cacheKey);

      // Notify credit listeners
      window.dispatchEvent(new CustomEvent('bulbai:credits-changed'));
    } catch (error: any) {
      console.error('Chat error:', error);
      setIsLoading(false);
      setCurrentFile(null);
      setAiStage('idle');
      setStageDetail('');
      abortControllerRef.current = null;
      inFlightRef.delete(cacheKey);

      if (error.name === 'AbortError') return;

      const errorMsg = error instanceof z.ZodError
        ? `Validation: ${error.errors[0].message}`
        : error.message || 'Unknown error';

      setMessages(prev => {
        const next = [...prev, { role: 'assistant' as const, content: `⚠️ ${errorMsg}` }];
        chatCache.set(cacheKey, next);
        return next;
      });
    }
  };

  const clearMessages = useCallback(async () => {
    chatCache.set(cacheKey, []);
    setMessages([]);
    if (projectId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('chat_messages').delete().eq('project_id', projectId).eq('user_id', user.id);
      }
    }
  }, [projectId, cacheKey]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    inFlightRef.delete(cacheKey);
    setIsLoading(false);
    setCurrentFile(null);
  }, [cacheKey]);

  return {
    messages,
    isLoading,
    currentFile,
    aiStage,
    stageDetail,
    sendMessage: streamChat,
    clearMessages,
    stopGeneration,
  };
};
