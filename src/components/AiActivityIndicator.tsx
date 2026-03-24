import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bot, Eye, Brain, Code2, CheckCircle2, Loader2, Sparkles, Gauge, ChevronDown, ChevronUp } from 'lucide-react';

export type AiStage = 'idle' | 'reading' | 'thinking' | 'coding' | 'done';

const stages: { key: AiStage; icon: typeof Eye; label: string; color: string; glow: string }[] = [
  { key: 'reading', icon: Eye, label: 'Reading', color: 'text-blue-400', glow: 'shadow-blue-500/20' },
  { key: 'thinking', icon: Brain, label: 'Thinking', color: 'text-purple-400', glow: 'shadow-purple-500/20' },
  { key: 'coding', icon: Code2, label: 'Coding', color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
];

interface AiActivityIndicatorProps {
  stage: AiStage;
  detail: string;
  currentFile?: string | null;
  tokenSpeed?: number;
  className?: string;
}

export const AiActivityIndicator = ({ stage, detail, currentFile, tokenSpeed, className }: AiActivityIndicatorProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [userToggled, setUserToggled] = useState(false);

  // Auto-collapse when AI starts coding (streaming text)
  useEffect(() => {
    if (stage === 'coding' && !userToggled) {
      const timer = setTimeout(() => setCollapsed(true), 800);
      return () => clearTimeout(timer);
    }
    if (stage === 'reading' || stage === 'thinking') {
      if (!userToggled) setCollapsed(false);
    }
    if (stage === 'done' || stage === 'idle') {
      setUserToggled(false);
    }
  }, [stage, userToggled]);

  if (stage === 'idle') return null;

  const currentIdx = stages.findIndex(s => s.key === stage);
  const isDone = stage === 'done';
  const activeStage = stages.find(s => s.key === stage);

  const handleToggle = () => {
    setCollapsed(prev => !prev);
    setUserToggled(true);
  };

  // Collapsed: minimal inline badge
  if (collapsed && !isDone) {
    return (
      <button
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/80 backdrop-blur-sm",
          "hover:bg-card transition-all duration-300 animate-fade-in cursor-pointer group",
          className
        )}
      >
        <div className="relative">
          <Loader2 className={cn("w-3.5 h-3.5 animate-spin", activeStage?.color)} />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <span className={cn("text-[11px] font-semibold", activeStage?.color)}>
          {activeStage?.label}
        </span>
        {currentFile && stage === 'coding' && (
          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
            {currentFile}
          </span>
        )}
        {tokenSpeed != null && tokenSpeed > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {tokenSpeed} tok/s
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
    );
  }

  return (
    <div className={cn("flex gap-3 animate-fade-in transition-all duration-300", className)}>
      {/* Avatar with pulse */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 relative">
        <Bot className="w-4 h-4 text-white" />
        {!isDone && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-3">
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-between mb-2">
          {/* Stage pipeline */}
          <div className="flex items-center gap-1">
            {stages.map((s, i) => {
              const isActive = s.key === stage;
              const isPast = isDone || currentIdx > i;
              const StageIcon = s.icon;

              return (
                <div key={s.key} className="flex items-center gap-1">
                  {i > 0 && (
                    <div className={cn(
                      "w-6 h-[2px] rounded-full transition-all duration-700",
                      isPast ? 'bg-primary' : isActive ? 'bg-primary/40 animate-pulse' : 'bg-border'
                    )} />
                  )}
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide transition-all duration-500",
                    isActive && `${s.color} bg-current/10 ring-1 ring-current/30 shadow-md ${s.glow}`,
                    isPast && !isActive && 'text-primary bg-primary/5',
                    !isPast && !isActive && 'text-muted-foreground/40'
                  )}>
                    {isActive ? (
                      <Loader2 className={cn("w-2.5 h-2.5 animate-spin", s.color)} />
                    ) : isPast ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                    ) : (
                      <StageIcon className="w-2.5 h-2.5" />
                    )}
                    <span>{s.label}</span>
                  </div>
                </div>
              );
            })}

            {isDone && (
              <div className="flex items-center gap-1 ml-1">
                <div className="w-6 h-[2px] rounded-full bg-primary" />
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Done</span>
                </div>
              </div>
            )}
          </div>

          {/* Collapse button */}
          {!isDone && (
            <button
              onClick={handleToggle}
              className="p-1 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Collapse"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Current file badge */}
        {currentFile && stage === 'coding' && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <Code2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-mono text-emerald-400">{currentFile}</span>
            </div>
            {tokenSpeed != null && tokenSpeed > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground">
                <Gauge className="w-2.5 h-2.5" />
                <span className="text-[10px] font-mono">{tokenSpeed} tok/s</span>
              </div>
            )}
          </div>
        )}

        {/* Detail text with typing cursor */}
        <div className="flex items-center gap-1.5 pl-0.5">
          <span className="text-xs text-muted-foreground leading-tight">{detail}</span>
          {!isDone && <span className="inline-block w-[3px] h-3.5 bg-primary/70 animate-pulse rounded-sm" />}
        </div>
      </div>
    </div>
  );
};
