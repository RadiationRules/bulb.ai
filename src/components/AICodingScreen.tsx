import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Bot, Code2, Sparkles, Zap, X, FileCode, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface AICodingScreenProps {
  isActive: boolean;
  filename: string;
  code: string;
  onClose: () => void;
}

export const AICodingScreen = ({ isActive, filename, code, onClose }: AICodingScreenProps) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const codeLines = code.split('\n');

  useEffect(() => {
    if (!isActive) {
      setDisplayedLines([]);
      setCurrentLineIndex(0);
      setProgress(0);
      return;
    }

    // Simulate typing lines
    const interval = setInterval(() => {
      setCurrentLineIndex(prev => {
        if (prev < codeLines.length) {
          setDisplayedLines(codeLines.slice(0, prev + 1));
          setProgress(((prev + 1) / codeLines.length) * 100);
          
          // Add particle effect
          if (Math.random() > 0.5) {
            const newParticle = {
              id: Date.now(),
              x: Math.random() * 100,
              y: Math.random() * 100,
            };
            setParticles(p => [...p.slice(-10), newParticle]);
          }
          
          return prev + 1;
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, codeLines.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedLines]);

  // Remove particles after animation
  useEffect(() => {
    const timeout = setTimeout(() => {
      setParticles(p => p.slice(1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [particles.length]);

  if (!isActive) return null;

  const getLanguage = (file: string) => {
    const ext = file.split('.').pop();
    const langMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'React JSX',
      'ts': 'TypeScript',
      'tsx': 'React TSX',
      'html': 'HTML',
      'css': 'CSS',
      'py': 'Python',
      'json': 'JSON',
    };
    return langMap[ext || ''] || 'Code';
  };

  const highlightSyntax = (line: string) => {
    // Simple syntax highlighting
    return line
      .replace(/(const|let|var|function|return|import|export|from|if|else|for|while|class|interface|type)/g, '<span class="text-purple-400">$1</span>')
      .replace(/('.*?'|".*?")/g, '<span class="text-green-400">$1</span>')
      .replace(/(\/\/.*$)/gm, '<span class="text-gray-500">$1</span>')
      .replace(/(\d+)/g, '<span class="text-orange-400">$1</span>')
      .replace(/(true|false|null|undefined)/g, '<span class="text-red-400">$1</span>');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col animate-fade-in overflow-hidden">
      {/* Particle effects */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full bg-primary animate-ping"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
        />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: '2s' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                GPT-5 is coding
              </span>
              <span className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileCode className="w-4 h-4" />
              <span>{filename}</span>
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-mono">
                {getLanguage(filename)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-500 text-sm">
            <Zap className="w-4 h-4" />
            <span>Streaming</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-2 bg-muted/30">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Generating code...</span>
          <span className="text-primary font-mono">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Code Display */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm"
      >
        <div className="max-w-4xl mx-auto">
          {/* File header */}
          <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-t-lg bg-muted/50 border border-border/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <span className="text-muted-foreground text-xs ml-2">{filename}</span>
          </div>

          {/* Code lines */}
          <div className="bg-[#1e1e1e] rounded-b-lg border border-t-0 border-border/50 overflow-hidden">
            {displayedLines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "flex group hover:bg-white/5 transition-colors",
                  i === displayedLines.length - 1 && "bg-primary/10 animate-pulse"
                )}
              >
                <span className="w-12 px-3 py-1 text-right text-muted-foreground/50 select-none border-r border-border/30 flex-shrink-0">
                  {i + 1}
                </span>
                <pre 
                  className="flex-1 px-4 py-1 text-gray-300 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: highlightSyntax(line) || '&nbsp;' }}
                />
                {i === displayedLines.length - 1 && (
                  <span className="w-2 h-5 bg-primary animate-pulse ml-0.5" />
                )}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mt-4 px-2 text-xs text-muted-foreground">
            <span>{displayedLines.length} / {codeLines.length} lines</span>
            <span className="flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              {displayedLines.join('\n').length} characters
            </span>
          </div>
        </div>
      </div>

      {/* Footer status */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2 text-green-500">
              <Check className="w-4 h-4" />
              Auto-saving enabled
            </span>
            <span className="text-muted-foreground">
              Code will be applied automatically when complete
            </span>
          </div>
          <Button variant="destructive" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Stop Generation
          </Button>
        </div>
      </div>
    </div>
  );
};
