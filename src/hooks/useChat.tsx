import { useState, useRef, useCallback } from 'react';
import { z } from 'zod';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 encoded images
}

const messageSchema = z.string().trim().min(1, 'Message cannot be empty').max(10000, 'Message too long');

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamChat = async (userMessage: string, displayMessage?: string, images?: string[]) => {
    try {
      // Validate message
      const validatedMessage = messageSchema.parse(userMessage);
      
      // Use displayMessage for UI, userMessage for AI
      const newUserMessage: Message = { 
        role: 'user', 
        content: displayMessage || validatedMessage,
        images 
      };
      setMessages(prev => [...prev, newUserMessage]);
      setIsLoading(true);

      abortControllerRef.current = new AbortController();
      
      // Send full context to AI
      const messagesWithContext = [...messages, { role: 'user' as const, content: userMessage }];
      
      console.log('📤 Sending message to AI:', userMessage.substring(0, 100));
      
      const response = await fetch(
        'https://thpdlrhpodjysrfsokqo.supabase.co/functions/v1/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            messages: messagesWithContext,
            images: images || null 
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      let assistantContent = '';

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      console.log('🎬 Starting stream...');

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('✅ Stream complete');
          break;
        }

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            console.log('🏁 Received [DONE] signal');
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              // Update the last message (assistant message)
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent
                };
                return newMessages;
              });
            }
          } catch (parseError) {
            console.warn('⚠️ JSON parse error, buffering:', parseError);
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Stream completed successfully
      console.log('✅ Stream finished, content length:', assistantContent.length);
      setIsLoading(false);
      abortControllerRef.current = null;
    } catch (error: any) {
      console.error('❌ Chat error:', error);
      if (error.name !== 'AbortError') {
        if (error instanceof z.ZodError) {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Validation error: ${error.errors[0].message}` }
          ]);
        } else {
          const errorMessage = error.message || 'Unknown error occurred';
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `⚠️ Error: ${errorMessage}\n\nPlease try again or rephrase your message.` }
          ]);
        }
      }
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    sendMessage: streamChat,
    clearMessages,
    stopGeneration,
  };
};
