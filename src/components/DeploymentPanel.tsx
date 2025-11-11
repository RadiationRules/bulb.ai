import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Rocket, ExternalLink, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Deployment {
  id: string;
  status: 'building' | 'success' | 'failed';
  url?: string;
  created_at: string;
  logs: string[];
}

interface DeploymentPanelProps {
  projectId: string;
  projectName: string;
}

export function DeploymentPanel({ projectId, projectName }: DeploymentPanelProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDeployments();
  }, [projectId]);

  const loadDeployments = async () => {
    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading deployments:', error);
      return;
    }

    setDeployments((data || []) as Deployment[]);
  };

  const startDeployment = async () => {
    setDeploying(true);
    try {
      // Get all project files
      const { data: files, error: filesError } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId);

      if (filesError) throw filesError;

      // Call build edge function
      const { data, error } = await supabase.functions.invoke('build-project', {
        body: { 
          projectId, 
          projectName,
          files: files?.map(f => ({ path: f.file_path, content: f.file_content })) || []
        }
      });

      if (error) throw error;

      // Create deployment record
      const { error: deployError } = await supabase
        .from('deployments')
        .insert({
          project_id: projectId,
          status: 'building',
          logs: [data.message || 'Build started']
        });

      if (deployError) throw deployError;

      toast({
        title: 'Deployment started',
        description: 'Your project is being built and deployed',
      });

      // Reload deployments
      setTimeout(loadDeployments, 1000);
    } catch (error: any) {
      toast({
        title: 'Deployment failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeploying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'building':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'building':
        return <Badge variant="outline">Building</Badge>;
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Deployments</h3>
          <Button onClick={startDeployment} disabled={deploying}>
            {deploying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            Deploy Now
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Deploy your project to production with one click
        </p>
      </div>

      <div className="flex-1 flex">
        <div className="w-1/3 border-r">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {deployments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No deployments yet
                </div>
              ) : (
                deployments.map((deployment) => (
                  <button
                    key={deployment.id}
                    onClick={() => setSelectedDeployment(deployment)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedDeployment?.id === deployment.id
                        ? 'bg-accent border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {getStatusIcon(deployment.status)}
                      {getStatusBadge(deployment.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(deployment.created_at).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1">
          {selectedDeployment ? (
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Deployment Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedDeployment.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Time:</span>
                    <span>{new Date(selectedDeployment.created_at).toLocaleString()}</span>
                  </div>
                  {selectedDeployment.url && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">URL:</span>
                      <a
                        href={selectedDeployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {selectedDeployment.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Build Logs</h4>
                <ScrollArea className="h-[400px]">
                  <pre className="text-xs bg-muted p-4 rounded-lg font-mono">
                    {selectedDeployment.logs.join('\n')}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a deployment to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
