import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Code2, Sparkles, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DOMPurify from 'dompurify';

interface LiveCodingAnimationProps {
  code: string;
  fileName: string;
  isActive: boolean;
  onComplete?: () => void;
}

export function LiveCodingAnimation({ code, fileName, isActive, onComplete }: LiveCodingAnimationProps) {
  const [displayedCode, setDisplayedCode] = useState('');
  const [currentLine, setCurrentLine] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !code) {
      setDisplayedCode('');
      setCurrentLine(0);
      return;
    }

    setIsTyping(true);
    let charIndex = 0;
    
    const typeCode = () => {
      if (charIndex < code.length) {
        setDisplayedCode(code.substring(0, charIndex + 1));
        
        // Track current line for visual effects
        const currentText = code.substring(0, charIndex + 1);
        setCurrentLine(currentText.split('\n').length - 1);
        
        charIndex++;
        
        // Variable speed for more realistic effect
        const char = code[charIndex - 1];
        let delay = 8;
        if (char === '\n') delay = 50;
        else if (char === ' ') delay = 5;
        else if (char === '{' || char === '}') delay = 30;
        else if (char === ';') delay = 20;
        
        setTimeout(typeCode, delay);
      } else {
        setIsTyping(false);
        onComplete?.();
      }
    };

    typeCode();
  }, [code, isActive]);

  // Auto-scroll to follow typing
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedCode]);

  if (!isActive) return null;

  const lines = displayedCode.split('\n');

  return (
    <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl animate-fade-in flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-card via-card/80 to-card p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Code2 className="h-6 w-6 text-primary animate-pulse" />
              <Sparkles className="h-3 w-3 text-yellow-400 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">Coding:</span>
                <span className="font-mono font-semibold text-primary">{fileName}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-muted-foreground">GPT-5 • Real-time Generation</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            {isTyping && (
              <span className="text-xs font-mono text-green-400 animate-pulse">
                ● LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Code display */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-6 bg-gradient-to-b from-background to-card/30"
      >
        <div className="max-w-6xl mx-auto relative">
          {/* Glow effect behind current line */}
          <div 
            className="absolute left-0 right-0 h-6 bg-primary/10 rounded transition-all duration-100 pointer-events-none"
            style={{ top: `${currentLine * 24}px` }}
          />
          
          <pre className="font-mono text-sm leading-6 relative">
            {lines.map((line, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex transition-all duration-200",
                  index === currentLine && isTyping && "text-primary"
                )}
              >
                <span className="w-12 text-right pr-4 text-muted-foreground/50 select-none">
                  {index + 1}
                </span>
                
                <span className={cn(
                  "flex-1",
                  index === currentLine && isTyping && "animate-pulse"
                )}>
                  {highlightSyntax(line)}
                </span>
                
                {index === currentLine && isTyping && (
                  <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-0.5" />
                )}
              </div>
            ))}
          </pre>

          {/* Particle effects */}
          {isTyping && (
            <div className="absolute top-0 right-0 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <Sparkles 
                  key={i}
                  className="absolute text-yellow-400/50 animate-ping"
                  style={{
                    top: `${Math.random() * 100}%`,
                    right: `${Math.random() * 50}px`,
                    animationDelay: `${i * 200}ms`,
                    animationDuration: '1.5s',
                    width: `${10 + Math.random() * 10}px`,
                    height: `${10 + Math.random() * 10}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card/50 p-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Lines: {lines.length}</span>
            <span>Characters: {displayedCode.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-100"
                style={{ width: `${(displayedCode.length / (code.length || 1)) * 100}%` }}
              />
            </div>
            <span>{Math.round((displayedCode.length / (code.length || 1)) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Secure syntax highlighting with DOMPurify
function highlightSyntax(line: string): React.ReactNode {
  // Escape HTML first to prevent XSS
  const escaped = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'default', 'async', 'await', 'class', 'extends', 'new', 'this', 'try', 'catch', 'throw'];
  const types = ['string', 'number', 'boolean', 'void', 'any', 'null', 'undefined', 'interface', 'type'];
  
  let result = escaped;
  
  // Highlight strings (already escaped)
  result = result.replace(/(&#039;|&quot;)(.*?)\1/g, '<span class="text-green-400">$&</span>');
  
  // Highlight keywords
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    result = result.replace(regex, '<span class="text-purple-400">$1</span>');
  });
  
  // Highlight types
  types.forEach(type => {
    const regex = new RegExp(`\\b(${type})\\b`, 'g');
    result = result.replace(regex, '<span class="text-yellow-400">$1</span>');
  });
  
  // Highlight comments
  result = result.replace(/(\/\/.*$)/g, '<span class="text-muted-foreground">$1</span>');
  
  // Highlight numbers
  result = result.replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>');
  
  // Sanitize the final HTML with DOMPurify
  const sanitized = DOMPurify.sanitize(result, { 
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class']
  });
  
  return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
