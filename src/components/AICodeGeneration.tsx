import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface AICodeGenerationProps {
  onGenerate: (code: string) => void;
  prompt: string;
  language: string;
}

export const AICodeGeneration = ({ onGenerate, prompt, language }: AICodeGenerationProps) => {
  const [generatedCode, setGeneratedCode] = useState('');
  const [displayedCode, setDisplayedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (!prompt) return;

    const generateCode = async () => {
      setIsGenerating(true);
      setGeneratedCode('');
      setDisplayedCode('');
      setCharIndex(0);

      try {
        const response = await fetch(
          'https://thpdlrhpodjysrfsokqo.supabase.co/functions/v1/chat',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: `You are a code generation assistant. Generate clean, working ${language} code based on the user's request. Return ONLY the code, no explanations.`
                },
                { role: 'user', content: prompt }
              ]
            })
          }
        );

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';
        let fullCode = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullCode += content;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        // Remove markdown code blocks if present
        const codeMatch = fullCode.match(/```[\w]*\n([\s\S]*?)\n```/);
        const cleanCode = codeMatch ? codeMatch[1] : fullCode;

        setGeneratedCode(cleanCode);
      } catch (error) {
        console.error('Generation error:', error);
        setIsGenerating(false);
      }
    };

    generateCode();
  }, [prompt, language]);

  // Typewriter effect
  useEffect(() => {
    if (!generatedCode || charIndex >= generatedCode.length) {
      if (charIndex >= generatedCode.length && generatedCode) {
        setIsGenerating(false);
        onGenerate(generatedCode);
      }
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayedCode(generatedCode.substring(0, charIndex + 1));
      setCharIndex(charIndex + 1);
    }, 10); // Adjust speed here

    return () => clearTimeout(timeout);
  }, [generatedCode, charIndex, onGenerate]);

  if (!isGenerating && !displayedCode) return null;

  return (
    <div className="relative">
      {isGenerating && (
        <div className="absolute top-0 right-0 flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-medium animate-pulse z-10">
          <Sparkles className="h-3 w-3" />
          AI Generating...
        </div>
      )}
      <pre className={cn(
        "font-mono text-sm p-4 rounded-lg bg-muted/50 border border-border overflow-x-auto",
        "animate-fade-in"
      )}>
        <code className="language-typescript">
          {displayedCode}
          {isGenerating && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
          )}
        </code>
      </pre>
    </div>
  );
};