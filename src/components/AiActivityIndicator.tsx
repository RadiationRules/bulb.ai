import { cn } from '@/lib/utils';
import { Bot, Eye, Brain, Code2, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export type AiStage = 'idle' | 'reading' | 'thinking' | 'coding' | 'done';

const stages: { key: AiStage; icon: typeof Eye; label: string; color: string; glow: string }[] = [
  { key: 'reading', icon: Eye, label: 'Reading', color: 'text-blue-400', glow: 'shadow-blue-500/20' },
  { key: 'thinking', icon: Brain, label: 'Thinking', color: 'text-purple-400', glow: 'shadow-purple-500/20' },
  { key: 'coding', icon: Code2, label: 'Coding', color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
];

interface AiActivityIndicatorProps {
  stage: AiStage;
  detail: string;
  className?: string;
}

export const AiActivityIndicator = ({ stage, detail, className }: AiActivityIndicatorProps) => {
  if (stage === 'idle') return null;

  const currentIdx = stages.findIndex(s => s.key === stage);
  const isDone = stage === 'done';

  return (
    <div className={cn("flex gap-3 animate-fade-in", className)}>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 relative">
        <Bot className="w-4 h-4 text-white" />
        {!isDone && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Stage pipeline */}
        <div className="flex items-center gap-1 mb-1.5">
          {stages.map((s, i) => {
            const isActive = s.key === stage;
            const isPast = isDone || currentIdx > i;
            const StageIcon = s.icon;

            return (
              <div key={s.key} className="flex items-center gap-1">
                {i > 0 && (
                  <div className={cn(
                    "w-5 h-[2px] rounded-full transition-all duration-500",
                    isPast ? 'bg-primary' : 'bg-border'
                  )} />
                )}
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide transition-all duration-300",
                  isActive && `${s.color} bg-current/10 ring-1 ring-current/20 shadow-sm ${s.glow}`,
                  isPast && !isActive && 'text-primary',
                  !isPast && !isActive && 'text-muted-foreground/50'
                )}>
                  {isActive ? (
                    <Loader2 className={cn("w-2.5 h-2.5 animate-spin", s.color)} />
                  ) : isPast ? (
                    <CheckCircle2 className="w-2.5 h-2.5" />
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
              <div className="w-5 h-[2px] rounded-full bg-primary" />
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Done</span>
              </div>
            </div>
          )}
        </div>

        {/* Detail text with typing cursor */}
        <div className="flex items-center gap-1.5 pl-0.5">
          <span className="text-xs text-muted-foreground leading-tight">{detail}</span>
          {!isDone && <span className="inline-block w-1 h-3.5 bg-primary/60 animate-pulse rounded-sm" />}
        </div>
      </div>
    </div>
  );
};
