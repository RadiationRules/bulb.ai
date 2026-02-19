import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { File, Check, Undo2, GitCompare, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';

interface FileChange {
  oldContent: string;
  newContent: string;
  type: 'create' | 'update' | 'delete';
}

interface FileChangePanelProps {
  fileChanges: Map<string, FileChange>;
  undoneFiles: Set<string>;
  onKeep: (filePath: string) => void;
  onUndo: (filePath: string) => void;
  onFileClick: (filePath: string) => void;
}

/** Simple line-level diff */
function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: { type: 'same' | 'add' | 'remove'; text: string }[] = [];

  const max = Math.max(oldLines.length, newLines.length);
  // Naive LCS-free diff: show removed then added for changed lines
  let oi = 0, ni = 0;
  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({ type: 'same', text: oldLines[oi] });
      oi++; ni++;
    } else if (oi < oldLines.length && (ni >= newLines.length || oldLines[oi] !== newLines[ni])) {
      result.push({ type: 'remove', text: oldLines[oi] });
      oi++;
    } else {
      result.push({ type: 'add', text: newLines[ni] });
      ni++;
    }
  }
  return result;
}

export const FileChangePanel = ({ fileChanges, undoneFiles, onKeep, onUndo, onFileClick }: FileChangePanelProps) => {
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
  
  const entries = Array.from(fileChanges.entries());
  if (entries.length === 0) return null;

  const typeIcon = (type: FileChange['type']) => {
    switch (type) {
      case 'create': return <Plus className="w-3 h-3" />;
      case 'update': return <Pencil className="w-3 h-3" />;
      case 'delete': return <Trash2 className="w-3 h-3" />;
    }
  };

  const typeColor = (type: FileChange['type']) => {
    switch (type) {
      case 'create': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'update': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'delete': return 'text-red-400 bg-red-500/10 border-red-500/30';
    }
  };

  const typeLabel = (type: FileChange['type']) => {
    switch (type) {
      case 'create': return 'Created';
      case 'update': return 'Modified';
      case 'delete': return 'Deleted';
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden animate-fade-in">
      <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2">
        <GitCompare className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">
          {entries.length} file{entries.length !== 1 ? 's' : ''} changed
        </span>
      </div>
      
      <div className="divide-y divide-border/20">
        {entries.map(([filePath, change]) => {
          const isUndone = undoneFiles.has(filePath);
          const isDiffOpen = expandedDiff === filePath;
          const diff = isDiffOpen ? computeDiff(change.oldContent, change.newContent) : [];

          return (
            <div key={filePath} className={cn("transition-all", isUndone && "opacity-40")}>
              {/* File row */}
              <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors group">
                <button
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  onClick={() => onFileClick(filePath)}
                >
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 gap-1 font-medium border", typeColor(change.type))}>
                    {typeIcon(change.type)}
                    {typeLabel(change.type)}
                  </Badge>
                  <span className="font-mono text-xs truncate text-foreground/80">{filePath}</span>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Diff toggle */}
                  {change.type !== 'delete' && (
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setExpandedDiff(isDiffOpen ? null : filePath)}
                      title="Toggle diff"
                    >
                      <GitCompare className="w-3 h-3" />
                    </Button>
                  )}

                  {isUndone ? (
                    <span className="text-[10px] text-destructive font-medium px-2">Reverted</span>
                  ) : (
                    <>
                      <Button
                        variant="outline" size="sm"
                        className="h-6 px-2 text-[10px] font-medium border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                        onClick={() => onKeep(filePath)}
                      >
                        <Check className="w-2.5 h-2.5 mr-1" /> Keep
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 px-2 text-[10px] font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => onUndo(filePath)}
                      >
                        <Undo2 className="w-2.5 h-2.5 mr-1" /> Undo
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Diff view */}
              {isDiffOpen && (
                <div className="border-t border-border/20 bg-background/50">
                  <ScrollArea className="max-h-48">
                    <pre className="text-[11px] font-mono leading-5 p-0">
                      {diff.map((line, i) => (
                        <div
                          key={i}
                          className={cn(
                            "px-3 py-0",
                            line.type === 'add' && "bg-emerald-500/10 text-emerald-300",
                            line.type === 'remove' && "bg-red-500/10 text-red-300 line-through opacity-70",
                            line.type === 'same' && "text-muted-foreground"
                          )}
                        >
                          <span className="inline-block w-5 text-right mr-2 text-muted-foreground/50 select-none">
                            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                          </span>
                          {line.text || ' '}
                        </div>
                      ))}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
