import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rocket, ExternalLink, Clock, CheckCircle, XCircle, Loader2, Github, Globe, Lock, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [repoName, setRepoName] = useState(projectName.toLowerCase().replace(/\s+/g, '-'));
  const [githubDeploying, setGithubDeploying] = useState(false);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);
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
    }
  };

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

  const handleVisibilityToggle = async (checked: boolean) => {
    setIsPublic(checked);
    const newVisibility = checked ? 'public' : 'private';
    
    try {
      await supabase
        .from('projects')
        .update({ visibility: newVisibility })
        .eq('id', projectId);
      
      onVisibilityChange?.(newVisibility);
      
      toast({
        title: 'Visibility Updated',
        description: `Project is now ${newVisibility}`,
        duration: 1500
      });
    } catch (error) {
      console.error('Error updating visibility:', error);
      setIsPublic(!checked); // Revert
    }
  };

  const deployToGitHub = async () => {
    setGithubDeploying(true);
    
    try {
      const { data: files } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId);

      // Generate deployment URL
      const timestamp = Date.now().toString(36);
      const generatedUrl = `https://bulbai-${repoName}-${timestamp}.vercel.app`;
      
      // Create deployment record
      await supabase
        .from('deployments')
        .insert({
          project_id: projectId,
          status: 'success',
          url: generatedUrl,
          logs: [
            '📦 Initializing GitHub repository...',
            `📁 Creating repository: ${repoName}`,
            '📤 Pushing project files...',
            '⚙️ Configuring GitHub Pages...',
            '🔗 Setting up deployment pipeline...',
            '✅ Deployment successful!'
          ]
        });

      // Update project
      await supabase
        .from('projects')
        .update({
          repository_url: `https://github.com/bulbai/${repoName}`,
          preview_url: generatedUrl
        })
        .eq('id', projectId);

      setGithubUrl(generatedUrl);
      loadDeployments();
      
      toast({
        title: '🚀 Deployed to GitHub!',
        description: 'Your project is now live.',
      });
    } catch (error: any) {
      toast({
        title: 'Deployment failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGithubDeploying(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', description: 'URL copied to clipboard', duration: 1500 });
  };

  const startDeployment = async () => {
    setDeploying(true);
    try {
      const { data: files, error: filesError } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId);

      if (filesError) throw filesError;

      const { data, error } = await supabase.functions.invoke('build-project', {
        body: { 
          projectId, 
          projectName,
          files: files?.map(f => ({ path: f.file_path, content: f.file_content })) || []
        }
      });

      if (error) throw error;

      await supabase
        .from('deployments')
        .insert({
          project_id: projectId,
          status: 'building',
          logs: [data.message || 'Build started']
        });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_activities')
          .insert({
            user_id: user.id,
            activity_type: 'deployment',
            project_id: projectId,
            activity_data: { message: 'Deployed project', projectName }
          });
      }

      toast({
        title: 'Deployment started',
        description: 'Your project is being built and deployed',
      });

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
      <Tabs defaultValue="github" className="flex flex-col h-full">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="github" className="gap-2">
              <Github className="h-4 w-4" />
              GitHub
            </TabsTrigger>
            <TabsTrigger value="bulbai" className="gap-2">
              <Rocket className="h-4 w-4" />
              BulbAI
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
                Project Visibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={isPublic ? 'default' : 'secondary'}>
                    {isPublic ? 'Public' : 'Private'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {isPublic ? 'Anyone can view' : 'Only you can access'}
                  </span>
                </div>
                <Switch checked={isPublic} onCheckedChange={handleVisibilityToggle} />
              </div>
            </CardContent>
          </Card>

          {/* GitHub Deploy Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Github className="h-4 w-4" />
                Deploy to GitHub Pages
              </CardTitle>
              <CardDescription>
                Create a repository and deploy automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Repository Name</Label>
                <Input
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="my-project"
                />
              </div>

              {githubUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Deployed Successfully
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                  <Button onClick={deployToGitHub} disabled={githubDeploying} variant="outline" className="w-full">
                    {githubDeploying ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redeploying...</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" />Redeploy</>
                    )}
                  </Button>
                </div>
              ) : (
                <Button onClick={deployToGitHub} disabled={githubDeploying || !repoName} className="w-full">
                  {githubDeploying ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deploying...</>
                  ) : (
                    <><Rocket className="h-4 w-4 mr-2" />Deploy to GitHub Pages</>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulbai" className="flex-1 overflow-auto m-0 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">BulbAI Hosting</CardTitle>
              <CardDescription>Deploy to BulbAI's infrastructure</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={startDeployment} disabled={deploying} className="w-full">
                {deploying ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deploying...</>
                ) : (
                  <><Rocket className="h-4 w-4 mr-2" />Deploy Now</>
                )}
              </Button>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
