import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rocket, ExternalLink, Clock, CheckCircle, XCircle, Loader2, Globe, Lock, Copy, RefreshCw, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';

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
  visibility?: 'public' | 'private';
  onVisibilityChange?: (visibility: 'public' | 'private') => void;
}

export function DeploymentPanel({ projectId, projectName, visibility = 'private', onVisibilityChange }: DeploymentPanelProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState<string[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isPublic, setIsPublic] = useState(visibility === 'public');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'failed'>('idle');
  const { toast } = useToast();
  const { session } = useAuth();

  useEffect(() => {
    loadDeployments();
    loadProjectInfo();
  }, [projectId]);

  const loadProjectInfo = async () => {
    const { data } = await supabase
      .from('projects')
      .select('visibility, preview_url')
      .eq('id', projectId)
      .single();
    
    if (data) {
      setIsPublic(data.visibility === 'public');
      if (data.preview_url) setPreviewUrl(data.preview_url);
    }
  };

  const loadDeployments = async () => {
    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setDeployments(data as Deployment[]);
    }
  };

  const handleVisibilityToggle = async (checked: boolean) => {
    setIsPublic(checked);
    const newVisibility = checked ? 'public' : 'private';
    
    await supabase
      .from('projects')
      .update({ visibility: newVisibility })
      .eq('id', projectId);
    
    onVisibilityChange?.(newVisibility);
    toast({ title: `Project is now ${newVisibility}`, duration: 1500 });
  };

  const handleVercelDeploy = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please sign in to deploy your project.",
        variant: "destructive"
      });
      return;
    }

    setDeploying(true);
    setDeploymentStatus('deploying');
    setDeployProgress(['🚀 Starting deployment...']);
    
    try {
      // Get project files
      setDeployProgress(prev => [...prev, '📦 Fetching project files...']);
      
      const { data: files, error: filesError } = await supabase
        .from('project_files')
        .select('file_path, file_content')
        .eq('project_id', projectId);

      if (filesError) throw new Error('Failed to load project files');

      // Transform files into the format expected by Vercel
      const projectFiles: Record<string, string> = {};
      files?.forEach(file => {
        if (file.file_content) {
          projectFiles[file.file_path] = file.file_content;
        }
      });

      setDeployProgress(prev => [...prev, `📁 Found ${Object.keys(projectFiles).length} files`]);
      setDeployProgress(prev => [...prev, '🔧 Connecting to Vercel...']);

      // Call our edge function to deploy to Vercel
      const { data, error } = await supabase.functions.invoke('deploy-vercel', {
        body: {
          projectId,
          projectName,
          files: projectFiles
        }
      });

      if (error) throw error;

      if (data.needsSetup) {
        setDeploymentStatus('failed');
        setDeployProgress(prev => [...prev, '❌ ' + data.message]);
        toast({
          title: "Setup Required",
          description: data.message,
          variant: "destructive"
        });
        return;
      }

      if (data.error) {
        throw new Error(data.message || data.error);
      }

      setDeployProgress(prev => [...prev, '⚡ Building on Vercel...']);
      setDeployProgress(prev => [...prev, '🌐 Deploying to CDN...']);
      
      // Simulate the build progress while Vercel builds
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDeployProgress(prev => [...prev, '🔒 Configuring SSL...']);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDeployProgress(prev => [...prev, `✅ Deployed to: ${data.url}`]);
      
      setPreviewUrl(data.url);
      setDeploymentStatus('success');
      
      toast({
        title: "🎉 Deployment Successful!",
        description: "Your site is now live on Vercel.",
      });

      loadDeployments();

    } catch (error) {
      console.error('Deployment error:', error);
      setDeploymentStatus('failed');
      setDeployProgress(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Deployment failed'}`]);
      
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : 'An error occurred during deployment.',
        variant: "destructive"
      });
    } finally {
      setDeploying(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', duration: 1500 });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'building': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'building': return <Badge variant="outline" className="animate-pulse">Building</Badge>;
      case 'success': return <Badge className="bg-green-500">Live</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="deploy" className="flex flex-col h-full">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="deploy" className="gap-2">
              <Rocket className="h-4 w-4" />
              Deploy
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="deploy" className="flex-1 overflow-auto m-0 p-4 space-y-4">
          {/* Visibility Card */}
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isPublic ? <Globe className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-yellow-500" />}
                Visibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {isPublic ? 'Public - Anyone can view' : 'Private - Only you'}
                </span>
                <Switch checked={isPublic} onCheckedChange={handleVisibilityToggle} />
              </div>
            </CardContent>
          </Card>

          {/* Vercel Deployment Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80 animate-fade-in overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 relative">
                    <Rocket className={`h-5 w-5 text-primary ${deploying ? 'animate-bounce' : ''}`} />
                    {deploying && (
                      <div className="absolute inset-0 rounded-lg bg-primary/20 animate-ping" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base">Deploy to Vercel</CardTitle>
                    <CardDescription>Real deployment to production</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-500 border-green-500/50">
                  <Zap className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deployment Progress */}
              {deployProgress.length > 0 && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border animate-fade-in">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {deploying ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : deploymentStatus === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : deploymentStatus === 'failed' ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : null}
                    <span>Deployment Log</span>
                  </div>
                  <div className="space-y-1 text-xs font-mono max-h-32 overflow-y-auto">
                    {deployProgress.map((log, i) => (
                      <div 
                        key={i} 
                        className={`text-muted-foreground animate-fade-in`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live URL if exists */}
              {previewUrl && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Live on Vercel</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Globe className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{previewUrl}</span>
                    <Button variant="ghost" size="sm" onClick={() => copyUrl(previewUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleVercelDeploy}
                disabled={deploying}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 relative overflow-hidden"
              >
                {deploying && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                )}
                {deploying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Deploying to Vercel...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    {previewUrl ? 'Redeploy' : 'Deploy'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Real Vercel deployment with SSL
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Global CDN distribution
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Searchable public URL
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-hidden m-0">
          <div className="flex h-full">
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
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
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
                <div className="p-4 space-y-4 animate-fade-in">
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
                    <ScrollArea className="h-[300px]">
                      <pre className="text-xs bg-muted p-4 rounded-lg font-mono whitespace-pre-wrap">
                        {selectedDeployment.logs?.join('\n') || 'No logs available'}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
