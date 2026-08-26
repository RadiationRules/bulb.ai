import { useMemo } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles, Plus, Pencil, Trash2 } from 'lucide-react';

export type PendingChangeType = 'create' | 'update' | 'delete';

export interface PendingChange {
  id: string;
  path: string;
  oldContent: string;
  newContent: string;
  type: PendingChangeType;
  fileType?: string;
}

export function diffStats(oldText: string, newText: string) {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];
  const oldSet = new Map<string, number>();
  oldLines.forEach((l) => oldSet.set(l, (oldSet.get(l) || 0) + 1));
  let added = 0;
  newLines.forEach((l) => {
    const n = oldSet.get(l) || 0;
    if (n > 0) oldSet.set(l, n - 1);
    else added++;
  });
  const removed = Array.from(oldSet.values()).reduce((a, b) => a + b, 0);
  return { added, removed };
}

const typeMeta = (type: PendingChangeType) => {
  switch (type) {
    case 'create':
      return { icon: <Plus className="w-3 h-3" />, label: 'New file', cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' };
    case 'delete':
      return { icon: <Trash2 className="w-3 h-3" />, label: 'Delete', cls: 'text-red-400 border-red-500/40 bg-red-500/10' };
    default:
      return { icon: <Pencil className="w-3 h-3" />, label: 'Modified', cls: 'text-blue-400 border-blue-500/40 bg-blue-500/10' };
  }
};

interface Props {
  change: PendingChange;
  language: string;
  totalPending: number;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export const AiDiffReview = ({ change, language, totalPending, onAccept, onReject, onAcceptAll, onRejectAll }: Props) => {
  const stats = useMemo(() => diffStats(change.oldContent, change.newContent), [change]);
  const meta = typeMeta(change.type);

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-card/60 backdrop-blur-sm">
        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
        <Badge variant="outline" className={cn('text-[10px] h-5 gap-1 font-medium', meta.cls)}>
          {meta.icon}
          {meta.label}
        </Badge>
        <span className="font-mono text-xs truncate max-w-[40%]">{change.path}</span>
        <span className="text-[11px] font-mono text-emerald-400">+{stats.added}</span>
        <span className="text-[11px] font-mono text-red-400">-{stats.removed}</span>

        <div className="ml-auto flex items-center gap-1.5">
          {totalPending > 1 && (
            <>
              <span className="text-[10px] text-muted-foreground mr-1">{totalPending} pending</span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={onRejectAll}>
                Reject all
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-emerald-400 hover:text-emerald-300" onClick={onAcceptAll}>
                Accept all
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px] border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => onReject(change.id)}
          >
            <X className="w-3 h-3 mr-1" /> Reject
          </Button>
          <Button
            size="sm"
            className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => onAccept(change.id)}
          >
            <Check className="w-3 h-3 mr-1" /> Accept
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <DiffEditor
          height="100%"
          language={language}
          original={change.oldContent}
          modified={change.newContent}
          theme="vs-dark"
          options={{
            renderSideBySide: false,
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            renderOverviewRuler: false,
          }}
        />
      </div>
    </div>
  );
};
