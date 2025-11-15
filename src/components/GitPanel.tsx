import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { GitBranch, GitCommit, GitMerge, Clock, User } from 'lucide-react';

interface Commit {
  id: string;
  commit_message: string;
  commit_hash: string;
  branch: string;
  files_changed: any;
  created_at: string;
  user_id: string;
}

interface GitPanelProps {
  projectId: string;
  userId: string;
  onCommit?: () => void;
}

export function GitPanel({ projectId, userId, onCommit }: GitPanelProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [isCommitting, setIsCommitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommits();
  }, [projectId]);

  const fetchCommits = async () => {
    const { data, error } = await supabase
      .from('project_commits')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching commits:', error);
      return;
    }

    setCommits(data || []);
  };

  const createCommit = async () => {
    if (!commitMessage.trim()) {
      toast({
        title: "Commit message required",
        description: "Please enter a commit message",
        variant: "destructive",
      });
      return;
    }

    setIsCommitting(true);

    const commitHash = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const { error } = await supabase
      .from('project_commits')
      .insert({
        project_id: projectId,
        user_id: userId,
        commit_message: commitMessage,
        commit_hash: commitHash,
        branch: currentBranch,
        files_changed: {},
      });

    if (error) {
      setIsCommitting(false);
      toast({
        title: "Commit failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Log activity
    await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type: 'commit',
        project_id: projectId,
        activity_data: { 
          message: commitMessage,
          branch: currentBranch 
        }
      });

    setIsCommitting(false);
    toast({
      title: "Committed successfully",
      description: `Changes committed to ${currentBranch}`,
    });

    setCommitMessage('');
    fetchCommits();
    onCommit?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-tech-blue" />
          <Badge variant="secondary">{currentBranch}</Badge>
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Commit message..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="min-h-[80px] bg-secondary border-border"
          />
          <Button
            onClick={createCommit}
            disabled={isCommitting}
            className="w-full bg-tech-blue hover:bg-tech-blue/90"
          >
            <GitCommit className="h-4 w-4 mr-2" />
            {isCommitting ? 'Committing...' : 'Commit Changes'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {commits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitCommit className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No commits yet</p>
              <p className="text-sm">Make your first commit to get started</p>
            </div>
          ) : (
            commits.map((commit) => (
              <Card key={commit.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-sm">{commit.commit_message}</p>
                    <Badge variant="outline" className="text-xs">
                      {commit.branch}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <GitCommit className="h-3 w-3" />
                      <code className="text-xs">{commit.commit_hash.substring(0, 7)}</code>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(commit.created_at).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}