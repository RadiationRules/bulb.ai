import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CompletionSuggestion {
  text: string;
  type: 'function' | 'variable' | 'import' | 'snippet';
  description: string;
}

interface SmartCompletionProps {
  code: string;
  cursorPosition: { line: number; column: number };
  language: string;
  onAccept: (completion: string) => void;
}

export const SmartCompletion = ({ code, cursorPosition, language, onAccept }: SmartCompletionProps) => {
  const [suggestions, setSuggestions] = useState<CompletionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!code.trim()) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('smart-completion', {
          body: { 
            code, 
            cursorPosition, 
            language 
          }
        });

        if (error) throw error;
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error('Completion error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [code, cursorPosition, language]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!suggestions.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Tab':
        case 'Enter':
          if (suggestions[selectedIndex]) {
            e.preventDefault();
            onAccept(suggestions[selectedIndex].text);
            setSuggestions([]);
          }
          break;
        case 'Escape':
          setSuggestions([]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onAccept]);

  if (!suggestions.length && !isLoading) return null;

  return (
    <div className="absolute z-50 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden animate-fade-in">
      {isLoading ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Generating suggestions...
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                onAccept(suggestion.text);
                setSuggestions([]);
              }}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-mono px-1.5 py-0.5 rounded",
                  suggestion.type === 'function' && "bg-blue-500/20 text-blue-400",
                  suggestion.type === 'variable' && "bg-green-500/20 text-green-400",
                  suggestion.type === 'import' && "bg-purple-500/20 text-purple-400",
                  suggestion.type === 'snippet' && "bg-orange-500/20 text-orange-400"
                )}>
                  {suggestion.type}
                </span>
                <span className="text-sm font-mono text-foreground truncate flex-1">
                  {suggestion.text}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {suggestion.description}
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="px-3 py-1.5 bg-muted/50 border-t border-border text-xs text-muted-foreground">
        Tab or Enter to accept • ↑↓ to navigate • Esc to dismiss
      </div>
    </div>
  );
};