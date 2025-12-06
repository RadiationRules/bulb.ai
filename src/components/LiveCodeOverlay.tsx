import { useState, useEffect, useRef } from 'react';
import { X, Code, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LiveCodeOverlayProps {
  isActive: boolean;
  filename: string;
  code: string;
  onClose: () => void;
}

export const LiveCodeOverlay = ({ isActive, filename, code, onClose }: LiveCodeOverlayProps) => {
  const [displayedCode, setDisplayedCode] = useState('');
  const [currentLine, setCurrentLine] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!isActive || !code) {
      setDisplayedCode('');
      setCurrentLine(0);
      return;
    }

    let charIndex = 0;
    const lines = code.split('\n');
    
    intervalRef.current = setInterval(() => {
      if (charIndex <= code.length) {
        setDisplayedCode(code.substring(0, charIndex));
        
        // Calculate current line
        const currentText = code.substring(0, charIndex);
        const lineCount = (currentText.match(/\n/g) || []).length;
        setCurrentLine(lineCount);
        
        charIndex += 3; // Speed of typing
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, 20);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, code]);

  if (!isActive) return null;

  const lines = displayedCode.split('\n');
  const progress = code ? Math.round((displayedCode.length / code.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl animate-fade-in flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-gradient-to-r from-card/80 via-primary/5 to-card/80 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-tech-blue via-purple-500 to-bulb-glow flex items-center justify-center animate-pulse">
              <Code className="w-6 h-6 text-white" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold bg-gradient-to-r from-tech-blue via-purple-400 to-bulb-glow bg-clip-text text-transparent">
                Live Coding
              </h2>
              <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="font-mono text-primary">{filename}</span>
              <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full">{progress}%</span>
            </p>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/30">
        <div 
          className="h-full bg-gradient-to-r from-tech-blue via-purple-500 to-bulb-glow transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Code display */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden shadow-2xl">
              {/* Code header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="font-mono text-xs text-muted-foreground ml-2">{filename}</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Line {currentLine + 1}</span>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>

              {/* Code content */}
              <pre className="p-4 overflow-auto max-h-[70vh] font-mono text-sm leading-relaxed">
                {lines.map((line, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex transition-all duration-150",
                      index === currentLine && "bg-primary/10 -mx-4 px-4"
                    )}
                  >
                    <span className="w-12 text-muted-foreground/50 select-none text-right pr-4 shrink-0">
                      {index + 1}
                    </span>
                    <code className="flex-1 whitespace-pre-wrap break-all">
                      {line}
                      {index === currentLine && (
                        <span className="inline-block w-2 h-5 bg-primary ml-0.5 animate-pulse" />
                      )}
                    </code>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
