import { cn } from '@/lib/utils';
import { Bot, Eye, Brain, Code2, CheckCircle2, Loader2 } from 'lucide-react';
import type { AiStage } from '@/hooks/useChat';

const stageConfig: Record<AiStage, { icon: typeof Eye; label: string; color: string; bgColor: string }> = {
  idle: { icon: Bot, label: '', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  reading: { icon: Eye, label: 'Reading', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  thinking: { icon: Brain, label: 'Thinking', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  coding: { icon: Code2, label: 'Coding', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  done: { icon: CheckCircle2, label: 'Done', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
};

interface AiActivityIndicatorProps {
  stage: AiStage;
  detail: string;
  className?: string;
}

export const AiActivityIndicator = ({ stage, detail, className }: AiActivityIndicatorProps) => {
  if (stage === 'idle') return null;
  
  const config = stageConfig[stage];
  const Icon = config.icon;

  return (
    <div className={cn("flex gap-4 animate-fade-in", className)}>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center flex-shrink-0 shadow-lg">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className={cn("rounded-2xl px-5 py-3 border shadow-sm", config.bgColor, "border-primary/10")}>
        {/* Stage pipeline */}
        <div className="flex items-center gap-3 mb-2">
          {(['reading', 'thinking', 'coding'] as AiStage[]).map((s, i) => {
            const sc = stageConfig[s];
            const StageIcon = sc.icon;
            const isActive = s === stage;
            const isPast = (['reading', 'thinking', 'coding'].indexOf(stage) > i) || stage === 'done';
            return (
              <div key={s} className="flex items-center gap-1.5">
                {i > 0 && (
                  <div className={cn("w-6 h-0.5 rounded-full transition-colors", isPast ? 'bg-primary' : 'bg-border')} />
                )}
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
                  isActive ? `${sc.color} ${sc.bgColor} ring-1 ring-current/20` : isPast ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                )}>
                  {isActive ? (
                    <Loader2 className={cn("w-3 h-3 animate-spin", sc.color)} />
                  ) : (
                    <StageIcon className="w-3 h-3" />
                  )}
                  <span>{sc.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Detail text */}
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", config.color, stage !== 'done' && 'animate-pulse')} />
          <span className="text-sm text-muted-foreground">{detail}</span>
        </div>
      </div>
    </div>
  );
};
