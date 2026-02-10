import { useState, useEffect } from 'react';
import { Clock, RotateCcw, Rocket, Save, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Snapshot {
  id: string;
  message: string;
  snapshot_type: 'save' | 'deploy';
  files_snapshot: any;
  created_at: string;
}

interface HistoryPanelProps {
  projectId: string;
  userId: string;
  onRestore: (files: Array<{ file_path: string; file_content: string; file_type: string }>) => void;
}

export function HistoryPanel({ projectId, userId, onRestore }: HistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSnapshots();
  }, [projectId]);

  const loadSnapshots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setSnapshots(data as Snapshot[]);
    }
    setLoading(false);
  };

  const handleRestore = (snapshot: Snapshot) => {
    try {
      const files = Array.isArray(snapshot.files_snapshot) ? snapshot.files_snapshot : [];
      onRestore(files);
      toast({
        title: 'Restored',
        description: `Reverted to: ${snapshot.message}`,
        duration: 2000
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to restore snapshot', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Version History
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Restore previous versions of your project</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading history...</div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No history yet</p>
              <p className="text-xs text-muted-foreground mt-1">Snapshots are created on save and deploy</p>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="group p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {snap.snapshot_type === 'deploy' ? (
                        <Rocket className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Save className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{snap.message}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {snap.snapshot_type}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(snap.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                    onClick={() => handleRestore(snap)}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Restore
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
