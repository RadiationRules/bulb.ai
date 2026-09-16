import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Github, CheckCircle2, Loader2, XCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GitHubActionsCardProps {
  projectId: string;
  projectName: string;
  files: Array<{ file_path: string; file_content: string }>;
}

interface BuildState {
  repoUrl?: string;
  pagesUrl?: string;
  runUrl?: string | null;
  status?: string | null;
  conclusion?: string | null;
}

export function GitHubActionsCard({ projectId, projectName, files }: GitHubActionsCardProps) {
  const [state, setState] = useState<BuildState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke('github-sync', {
      body: { action: 'status', projectId },
    });
    setChecking(false);
    if (error || data?.error) return;
    setState(data);
  }, [projectId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const sync = async () => {
    setSyncing(true);
    const payload: Record<string, string> = {};
    files.forEach(f => { if (f.file_content) payload[f.file_path] = f.file_content; });
    const { data, error } = await supabase.functions.invoke('github-sync', {
      body: { projectId, projectName, files: payload },
    });
    setSyncing(false);
    if (error || data?.error) {
      toast({
        title: 'GitHub build could not start',
        description: data?.error || error?.message || 'Please reconnect your GitHub account.',
        variant: 'destructive',
      });
      return;
    }
    setState(prev => ({ ...prev, repoUrl: data.repoUrl, pagesUrl: data.pagesUrl, status: 'queued', conclusion: null }));
    toast({ title: 'Build started on GitHub', description: 'Your site publishes automatically when it finishes.', duration: 2500 });
    setTimeout(() => { void refresh(); }, 8000);
  };

  const success = state?.conclusion === 'success';
  const running = state?.status === 'in_progress' || state?.status === 'queued';
  const failed = state?.conclusion && state.conclusion !== 'success';

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                GitHub build
                {success && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {running && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                {failed && <XCircle className="w-4 h-4 text-destructive" />}
              </CardTitle>
              <CardDescription>Push your files and build automatically</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={refresh} disabled={checking}>
            <RefreshCw className={checking ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {success && <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Build passed</Badge>}
          {running && <Badge variant="secondary">Building…</Badge>}
          {failed && <Badge variant="destructive">Build failed</Badge>}
          {!state?.repoUrl && !running && <Badge variant="outline">Not connected yet</Badge>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={sync} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            {state?.repoUrl ? 'Push latest & rebuild' : 'Connect and build'}
          </Button>
          {state?.repoUrl && (
            <Button variant="outline" className="gap-2" onClick={() => window.open(state.runUrl || `${state.repoUrl}/actions`, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="w-4 h-4" /> View build
            </Button>
          )}
          {state?.pagesUrl && success && (
            <Button variant="outline" className="gap-2" onClick={() => window.open(state.pagesUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="w-4 h-4" /> Visit site
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
