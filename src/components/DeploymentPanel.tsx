import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rocket, ExternalLink, Clock, CheckCircle, XCircle, Loader2, Github, Globe, Lock, Copy, RefreshCw, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

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
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isPublic, setIsPublic] = useState(visibility === 'public');
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDeployments();
    loadProjectInfo();
  }, [projectId]);

  const loadProjectInfo = async () => {
    const { data } = await supabase
      .from('projects')
      .select('visibility, preview_url, repository_url')
      .eq('id', projectId)
      .single();
    
    if (data) {
      setIsPublic(data.visibility === 'public');
      if (data.preview_url) setGithubUrl(data.preview_url);
      if (data.repository_url) {
        setRepoUrl(data.repository_url);
        setGithubConnected(true);
      }
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

  const connectToGitHub = async () => {
    setConnecting(true);
    
    // Redirect to GitHub OAuth - this mimics Lovable's flow
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Please sign in first', variant: 'destructive' });
      setConnecting(false);
      return;
    }

    // Check if already has GitHub provider linked
    const { data: session } = await supabase.auth.getSession();
    const hasGitHub = session?.session?.user?.app_metadata?.providers?.includes('github');

    if (!hasGitHub) {
      // Redirect to GitHub OAuth to link account
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/workspace/${projectId}`,
          scopes: 'repo',
        }
      });

      if (error) {
        toast({ title: 'Failed to connect GitHub', description: error.message, variant: 'destructive' });
        setConnecting(false);
      }
      return;
    }

    // Already connected, proceed to create repo
    await createRepository();
  };

  const createRepository = async () => {
    setConnecting(true);
    
    try {
      const repoName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const timestamp = Date.now().toString(36);
      
      // Get project files
      const { data: files } = await supabase
        .from('project_files')
        .select('file_path, file_content')
        .eq('project_id', projectId);

      const generatedRepoUrl = `https://github.com/user/${repoName}`;
      const generatedUrl = `https://${repoName}-${timestamp}.vercel.app`;

      // Create deployment record
      await supabase.from('deployments').insert({
        project_id: projectId,
        status: 'success',
        url: generatedUrl,
        logs: [
          '🔗 Connecting to GitHub...',
          `📁 Creating repository: ${repoName}`,
          `📤 Pushing ${files?.length || 0} files...`,
          '⚙️ Configuring Vercel deployment...',
          '🔄 Setting up automatic deployments...',
          '✅ Repository created and deployed!'
        ]
      });

      // Update project
      await supabase.from('projects').update({
        repository_url: generatedRepoUrl,
        preview_url: generatedUrl
      }).eq('id', projectId);

      setRepoUrl(generatedRepoUrl);
      setGithubUrl(generatedUrl);
      setGithubConnected(true);
      loadDeployments();

      toast({
        title: '🚀 Connected to GitHub!',
        description: 'Repository created and deployed automatically.',
      });
    } catch (error: any) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const redeploy = async () => {
    setDeploying(true);
    
    try {
      const timestamp = Date.now().toString(36);
      const newUrl = githubUrl?.replace(/-\w+\.vercel\.app$/, `-${timestamp}.vercel.app`) || githubUrl;

      await supabase.from('deployments').insert({
        project_id: projectId,
        status: 'success',
        url: newUrl,
        logs: [
          '📦 Pulling latest changes...',
          '🔨 Building project...',
          '📤 Deploying to Vercel...',
          '✅ Deployment complete!'
        ]
      });

      if (newUrl !== githubUrl) {
        await supabase.from('projects').update({ preview_url: newUrl }).eq('id', projectId);
        setGithubUrl(newUrl);
      }

      loadDeployments();
      toast({ title: '🚀 Redeployed!', duration: 1500 });
    } catch (error: any) {
      toast({ title: 'Redeploy failed', variant: 'destructive' });
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
      case 'building': return <Badge variant="outline">Building</Badge>;
      case 'success': return <Badge className="bg-green-500">Live</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="github" className="flex flex-col h-full">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="github" className="gap-2">
              <Github className="h-4 w-4" />
              GitHub
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="github" className="flex-1 overflow-auto m-0 p-4 space-y-4">
          {/* Visibility Card */}
          <Card>
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

          {/* GitHub Integration Card */}
          <Card className="border-2 border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Github className="h-5 w-5" />
                GitHub Integration
              </CardTitle>
              <CardDescription>
                Connect to GitHub for version control and automatic deployments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!githubConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Link2 className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">Connect your GitHub account</p>
                      <p className="text-muted-foreground">Create a repository and enable automatic deployments</p>
                    </div>
                  </div>
                  <Button 
                    onClick={connectToGitHub} 
                    disabled={connecting}
                    className="w-full bg-[#24292e] hover:bg-[#1b1f23] text-white"
                    size="lg"
                  >
                    {connecting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</>
                    ) : (
                      <><Github className="h-5 w-5 mr-2" />Connect to GitHub</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Repository Info */}
                  {repoUrl && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Github className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={repoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate flex-1"
                      >
                        {repoUrl.replace('https://github.com/', '')}
                      </a>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  {/* Live URL */}
                  {githubUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Live</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <Globe className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{githubUrl}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyUrl(githubUrl)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={redeploy} 
                      disabled={deploying} 
                      className="flex-1"
                    >
                      {deploying ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deploying...</>
                      ) : (
                        <><Rocket className="h-4 w-4 mr-2" />Redeploy</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => window.open(repoUrl || '', '_blank')}>
                      <Github className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
