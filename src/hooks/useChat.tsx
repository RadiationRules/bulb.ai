import { useState, useRef, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

const messageSchema = z.string().trim().min(1, 'Message cannot be empty').max(10000, 'Message too long');

export const useChat = (projectId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedRef = useRef(false);

  // Load persisted messages on mount
  useEffect(() => {
    if (!projectId || loadedRef.current) return;
    loadedRef.current = true;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data && data.length > 0) {
        setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      }
    };

    loadMessages();
  }, [projectId]);

  // Persist a message to Supabase
  const persistMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!projectId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('chat_messages').insert({
        project_id: projectId,
        user_id: user.id,
        role,
        content
      });
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
        images 
      };
      setMessages(prev => [...prev, newUserMessage]);
      setIsLoading(true);
      setCurrentFile(null);

      // Persist user message
      persistMessage('user', displayMessage || validatedMessage);

      abortControllerRef.current = new AbortController();
      
      const messagesWithContext = [...messages, { role: 'user' as const, content: userMessage }];
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in to use the AI assistant');
      }
      
      const response = await fetch(
        `https://thpdlrhpodjysrfsokqo.supabase.co/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            messages: messagesWithContext,
            images: images || null 
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        
        if (response.status === 429) throw new Error('Rate limit exceeded. Please wait.');
        if (response.status === 402) throw new Error('AI credits depleted.');
        
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const updateAssistant = (content: string) => {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content };
          return newMessages;
        });
      };

      const detectFile = (text: string) => {
        const createMatch = text.match(/CREATE_FILE:\s*([^\n]+)/);
        const codeMatch = text.match(/```(\w+)?[\s\S]*?```/);
        if (createMatch) {
          setCurrentFile(createMatch[1].trim());
        } else if (codeMatch && !currentFile) {
          setCurrentFile('code');
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
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              updateAssistant(assistantContent);
            }
          } catch {}
        }
      }

      // Persist assistant response
      if (assistantContent) {
        persistMessage('assistant', assistantContent);
      }

      setIsLoading(false);
      setCurrentFile(null);
      abortControllerRef.current = null;
    } catch (error: any) {
      console.error('Chat error:', error);
      setIsLoading(false);
      setCurrentFile(null);
      abortControllerRef.current = null;
      
      if (error.name === 'AbortError') return;
      
      const errorMsg = error instanceof z.ZodError 
        ? `Validation: ${error.errors[0].message}`
        : error.message || 'Unknown error';
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errorMsg}` }
      ]);
    }
  };

  const clearMessages = useCallback(async () => {
    setMessages([]);
    // Also clear persisted messages
    if (projectId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('chat_messages').delete().eq('project_id', projectId).eq('user_id', user.id);
      }
    }
  }, [projectId]);
  
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setCurrentFile(null);
  }, []);

  return {
    messages,
    isLoading,
    currentFile,
    sendMessage: streamChat,
    clearMessages,
    stopGeneration,
  };
};
