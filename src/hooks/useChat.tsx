import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

export type AiStage = 'idle' | 'reading' | 'thinking' | 'coding' | 'done';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface ChatSessionState {
  messages: Message[];
  isLoading: boolean;
  currentFile: string | null;
  aiStage: AiStage;
  stageDetail: string;
  loaded: boolean;
  abortController: AbortController | null;
  visibleContent: string;
  targetContent: string;
  typingTimer: ReturnType<typeof setTimeout> | null;
  streamFinished: boolean;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

const messageSchema = z.string().trim().min(1, 'Message cannot be empty').max(10000, 'Message too long');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sessions = new Map<string, ChatSessionState>();
const listeners = new Map<string, Set<() => void>>();

const createSession = (): ChatSessionState => ({
  messages: [], isLoading: false, currentFile: null, aiStage: 'idle', stageDetail: '', loaded: false,
  abortController: null, visibleContent: '', targetContent: '', typingTimer: null, streamFinished: false, idleTimer: null,
});

const getKey = (projectId?: string) => projectId || 'anonymous-chat';
const getSession = (key: string) => {
  let session = sessions.get(key);
  if (!session) {
    session = createSession();
    sessions.set(key, session);
  }
  return session;
};

const emit = (key: string) => {
  const session = getSession(key);
  if (!UUID_RE.test(key) && key !== 'anonymous-chat') {
    try { localStorage.setItem(`bulbai:chat:${key}`, JSON.stringify(session.messages.slice(-100))); } catch { /* ignore */ }
  }
  listeners.get(key)?.forEach((listener) => listener());
};

const updateAssistantMessage = (key: string, content: string) => {
  const session = getSession(key);
  const next = [...session.messages];
  if (next[next.length - 1]?.role === 'assistant') next[next.length - 1] = { role: 'assistant', content };
  session.messages = next;
  emit(key);
};

const finishStream = (key: string) => {
  const session = getSession(key);
  session.aiStage = 'done';
  session.stageDetail = 'Complete';
  session.isLoading = false;
  session.currentFile = null;
  session.abortController = null;
  emit(key);
  window.dispatchEvent(new CustomEvent('bulbai:credits-changed'));
  if (session.idleTimer) clearTimeout(session.idleTimer);
  session.idleTimer = setTimeout(() => {
    session.aiStage = 'idle';
    session.stageDetail = '';
    emit(key);
  }, 2000);
};

const isHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

const typeNextFrame = (key: string) => {
  const session = getSession(key);
  if (session.visibleContent.length < session.targetContent.length) {
    // Background tabs throttle timers to ~1/s, which made typing appear frozen.
    // While hidden, jump straight to the latest text so nothing is ever lost.
    if (isHidden()) {
      session.visibleContent = session.targetContent;
      updateAssistantMessage(key, session.visibleContent);
      session.typingTimer = null;
      if (session.streamFinished) finishStream(key);
      return;
    }
    const backlog = session.targetContent.length - session.visibleContent.length;
    const step = Math.max(1, Math.min(120, Math.ceil(backlog / 20)));
    session.visibleContent = session.targetContent.slice(0, session.visibleContent.length + step);
    updateAssistantMessage(key, session.visibleContent);
    session.typingTimer = setTimeout(() => typeNextFrame(key), 16);
    return;
  }
  session.typingTimer = null;
  if (session.streamFinished) finishStream(key);
};

const queueAssistantContent = (key: string, content: string) => {
  const session = getSession(key);
  session.targetContent = content;
  if (!session.typingTimer) session.typingTimer = setTimeout(() => typeNextFrame(key), 16);
};

// Keep every in-flight session in sync across tab switches: flush buffered text
// when the tab is hidden and resume smooth typing as soon as it is visible again.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    sessions.forEach((session, key) => {
      if (session.visibleContent.length === session.targetContent.length) {
        if (session.streamFinished && session.isLoading && !session.typingTimer) finishStream(key);
        return;
      }
      if (session.typingTimer) clearTimeout(session.typingTimer);
      session.typingTimer = setTimeout(() => typeNextFrame(key), 0);
    });
  });
}

const persistMessage = async (projectId: string | undefined, role: 'user' | 'assistant', content: string) => {
  if (!projectId || !UUID_RE.test(projectId)) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('chat_messages').insert({ project_id: projectId, user_id: user.id, role, content });
  if (error) console.error('Failed to persist message:', error.message);
};

const loadSession = async (key: string, projectId?: string) => {
  const session = getSession(key);
  if (session.loaded) return;
  session.loaded = true;
  if (!projectId || !UUID_RE.test(projectId)) {
    try {
      const raw = projectId ? localStorage.getItem(`bulbai:chat:${projectId}`) : null;
      if (raw && session.messages.length === 0) session.messages = JSON.parse(raw);
    } catch { /* ignore */ }
    emit(key);
    return;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || session.messages.length > 0 || session.isLoading) return;
  const { data } = await supabase.from('chat_messages').select('role, content').eq('project_id', projectId).eq('user_id', user.id).order('created_at', { ascending: true }).limit(100);
  if (data && session.messages.length === 0 && !session.isLoading) {
    session.messages = data.map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content }));
    emit(key);
  }
};

const streamChat = async (key: string, projectId: string | undefined, userMessage: string, displayMessage?: string, images?: string[]) => {
  const session = getSession(key);
  if (session.isLoading) return;
  try {
    const validatedMessage = messageSchema.parse(userMessage);
    const shownMessage = displayMessage || validatedMessage;
    const history = [...session.messages, { role: 'user' as const, content: userMessage }];
    session.messages = [...session.messages, { role: 'user', content: shownMessage, images }];
    session.isLoading = true;
    session.currentFile = null;
    session.aiStage = 'thinking';
    session.stageDetail = 'Planning approach...';
    if (session.typingTimer) clearTimeout(session.typingTimer);
    session.typingTimer = null;
    session.visibleContent = '';
    session.targetContent = '';
    session.streamFinished = false;
    emit(key);
    void persistMessage(projectId, 'user', shownMessage);

    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) throw new Error('Please sign in to use the AI assistant');
    session.abortController = new AbortController();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` },
      body: JSON.stringify({ messages: history, images: images || null }),
      signal: session.abortController.signal,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `AI request failed (${response.status})`);
    }
    if (!response.body) throw new Error('The AI returned an empty response');

    session.messages = [...session.messages, { role: 'assistant', content: '' }];
    emit(key);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantContent = '';
    let hasStartedCoding = false;
    const detectStage = (text: string) => {
      const createMatch = text.match(/CREATE_FILE:\s*([^\n]+)/);
      if (createMatch) {
        session.currentFile = createMatch[1].trim();
        session.aiStage = 'coding';
        session.stageDetail = `Writing ${session.currentFile}`;
        hasStartedCoding = true;
      } else if (/```/.test(text) && !hasStartedCoding) {
        session.currentFile = 'code';
        session.aiStage = 'coding';
        session.stageDetail = 'Writing code...';
        hasStartedCoding = true;
      } else if (!hasStartedCoding && text.length > 10) {
        session.stageDetail = 'Generating response...';
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
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (delta) {
            assistantContent += delta;
            detectStage(assistantContent);
            queueAssistantContent(key, assistantContent);
          }
        } catch { /* skip malformed event */ }
      }
    }
    if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
      try {
        const delta = JSON.parse(buffer.trim().slice(6)).choices?.[0]?.delta?.content;
        if (delta) assistantContent += delta;
      } catch { /* ignore */ }
    }
    if (assistantContent) void persistMessage(projectId, 'assistant', assistantContent);
    session.streamFinished = true;
    queueAssistantContent(key, assistantContent);
    if (!assistantContent) finishStream(key);
  } catch (error) {
    if (session.typingTimer) clearTimeout(session.typingTimer);
    session.typingTimer = null;
    session.isLoading = false;
    session.currentFile = null;
    session.aiStage = 'idle';
    session.stageDetail = '';
    session.abortController = null;
    if ((error as Error).name !== 'AbortError') {
      const text = error instanceof z.ZodError ? `Validation: ${error.errors[0].message}` : (error as Error).message || 'Unknown error';
      const next = [...session.messages];
      if (next[next.length - 1]?.role === 'assistant' && next[next.length - 1].content === '') {
        next[next.length - 1] = { role: 'assistant', content: `⚠️ ${text}` };
      } else {
        next.push({ role: 'assistant', content: `⚠️ ${text}` });
      }
      session.messages = next;
    }
    emit(key);
  }
};

export const useChat = (projectId?: string) => {
  const key = getKey(projectId);
  const [, refresh] = useState(0);
  useEffect(() => {
    const listener = () => refresh((value) => value + 1);
    const set = listeners.get(key) || new Set<() => void>();
    set.add(listener);
    listeners.set(key, set);
    void loadSession(key, projectId);
    return () => { set.delete(listener); };
  }, [key, projectId]);

  const state = getSession(key);
  const clearMessages = useCallback(async () => {
    const current = getSession(key);
    if (current.isLoading) current.abortController?.abort();
    current.messages = [];
    current.isLoading = false;
    current.aiStage = 'idle';
    emit(key);
    if (!projectId || !UUID_RE.test(projectId)) {
      if (projectId) localStorage.removeItem(`bulbai:chat:${projectId}`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('chat_messages').delete().eq('project_id', projectId).eq('user_id', user.id);
  }, [key, projectId]);
  const stopGeneration = useCallback(() => {
    const current = getSession(key);
    current.abortController?.abort();
  }, [key]);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    currentFile: state.currentFile,
    aiStage: state.aiStage,
    stageDetail: state.stageDetail,
    sendMessage: (message: string, displayMessage?: string, images?: string[]) => streamChat(key, projectId, message, displayMessage, images),
    clearMessages,
    stopGeneration,
  };
};