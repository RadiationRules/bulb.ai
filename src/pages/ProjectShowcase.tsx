import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { BulbIcon } from '@/components/BulbIcon';
import { LoadingScreen } from '@/components/LoadingSpinner';
import {
  Star,
  GitFork,
  Eye,
  ExternalLink,
  Copy,
  ArrowLeft,
  Calendar,
  Globe,
  Loader2,
} from 'lucide-react';

interface PublicProject {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  tags: string[] | null;
  preview_image: string | null;
  preview_url: string | null;
  stars_count: number;
  forks_count: number;
  created_at: string;
  owner: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const ProjectShowcase = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<PublicProject | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [remixing, setRemixing] = useState(false);
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id, title, description, visibility, tags, preview_image, preview_url,
            stars_count, forks_count, created_at,
            profiles!projects_owner_id_fkey (id, username, display_name, avatar_url)
          `)
          .eq('id', projectId)
          .eq('visibility', 'public')
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          toast({ title: 'Project not found', description: 'This project is private or no longer exists.', variant: 'destructive' });
          navigate('/dashboard');
          return;
        }
        setProject({
          id: data.id,
          title: data.title,
          description: data.description,
          visibility: data.visibility,
          tags: data.tags,
          preview_image: data.preview_image,
          preview_url: data.preview_url,
          stars_count: data.stars_count || 0,
          forks_count: data.forks_count || 0,
          created_at: data.created_at,
          owner: {
            id: (data as any).profiles?.id || '',
            username: (data as any).profiles?.username || 'user',
            display_name: (data as any).profiles?.display_name || null,
            avatar_url: (data as any).profiles?.avatar_url || null,
          },
        });

        // Find latest successful deployment URL
        const { data: deploys } = await supabase
          .from('deployments')
          .select('url, status, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(5);
        const live = deploys?.find((d: any) => d.url && ['success', 'ready', 'deployed'].includes(d.status));
        setLiveUrl(live?.url || data.preview_url || null);

        // Star state
        if (profile) {
          const { data: star } = await supabase
            .from('project_stars')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', profile.id)
            .maybeSingle();
          setStarred(!!star);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, profile, navigate, toast]);

  const toggleStar = async () => {
    if (!user || !profile || !project) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    const wasStarred = starred;
    setStarred(!wasStarred);
    setProject(p => p ? { ...p, stars_count: p.stars_count + (wasStarred ? -1 : 1) } : p);
    try {
      if (wasStarred) {
        await supabase.from('project_stars').delete().eq('project_id', project.id).eq('user_id', profile.id);
      } else {
        await supabase.from('project_stars').insert({ project_id: project.id, user_id: profile.id });
      }
    } catch {
      setStarred(wasStarred);
    }
  };

  const handleRemix = async () => {
    if (!user || !profile || !project) {
      toast({ title: 'Sign in required', description: 'Please sign in to remix this project.', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    setRemixing(true);
    try {
      const { data: originalFiles } = await supabase
        .from('project_files')
        .select('file_path, file_content, file_type')
        .eq('project_id', project.id);

      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          title: `${project.title} (Remix)`,
          description: `Remixed from ${project.owner.display_name || project.owner.username}'s ${project.title}`,
          owner_id: profile.id,
          visibility: 'private',
          tags: project.tags || [],
        })
        .select()
        .single();
      if (error) throw error;

      if (originalFiles && originalFiles.length > 0) {
        await supabase.from('project_files').insert(
          originalFiles.map(f => ({
            project_id: newProject.id,
            file_path: f.file_path,
            file_content: f.file_content,
            file_type: f.file_type,
          }))
        );
      }

      await supabase
        .from('projects')
        .update({ forks_count: (project.forks_count || 0) + 1 })
        .eq('id', project.id);

      toast({ title: '🎉 Remixed!', description: 'Opening your new project...' });
      navigate(`/workspace/${newProject.id}`);
    } catch (err: any) {
      toast({ title: 'Remix failed', description: err.message, variant: 'destructive' });
    } finally {
      setRemixing(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: '🔗 Link copied!', duration: 1500 });
  };

  if (loading) return <LoadingScreen message="Loading project..." />;
  if (!project) return null;

  const initials = (project.owner.display_name || project.owner.username || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-16 container mx-auto px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Big Preview */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl">
              <div className="relative aspect-video bg-gradient-to-br from-tech-blue/20 via-tech-purple/10 to-bulb-glow/20 flex items-center justify-center">
                {project.preview_image && !project.preview_image.startsWith('data:image/svg') ? (
                  <img src={project.preview_image} alt={project.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : liveUrl ? (
                  <iframe
                    src={liveUrl}
                    title={project.title}
                    className="absolute inset-0 w-full h-full"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    loading="lazy"
                  />
                ) : (
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <BulbIcon className="w-20 h-20 text-bulb-glow" animated />
                    <span className="text-sm font-medium text-muted-foreground">BulbAI Project</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Side info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <Badge variant="outline" className="mb-3">
                <Globe className="w-3 h-3 mr-1" /> Public
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{project.title}</h1>
              {project.description && (
                <p className="text-muted-foreground leading-relaxed">{project.description}</p>
              )}
            </div>

            {/* Owner */}
            <Link to={`/u/${project.owner.username}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:border-primary/50 transition-colors">
              <Avatar className="w-10 h-10">
                <AvatarImage src={project.owner.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-yellow-500 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{project.owner.display_name || project.owner.username}</p>
                <p className="text-xs text-muted-foreground">@{project.owner.username}</p>
              </div>
            </Link>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <Star className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
                <p className="text-lg font-bold">{project.stars_count}</p>
                <p className="text-xs text-muted-foreground">Stars</p>
              </Card>
              <Card className="p-3 text-center">
                <GitFork className="w-4 h-4 mx-auto text-tech-blue mb-1" />
                <p className="text-lg font-bold">{project.forks_count}</p>
                <p className="text-xs text-muted-foreground">Remixes</p>
              </Card>
              <Card className="p-3 text-center">
                <Calendar className="w-4 h-4 mx-auto text-tech-purple mb-1" />
                <p className="text-xs font-bold">{new Date(project.created_at).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </Card>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <Button
                onClick={handleRemix}
                disabled={remixing}
                size="lg"
                className="w-full h-14 text-base bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0 shadow-lg hover:shadow-amber-500/30 transition-all hover:scale-[1.02]"
              >
                {remixing ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Copy className="w-5 h-5 mr-2" />
                )}
                {remixing ? 'Remixing...' : 'Remix this Project'}
              </Button>

              {liveUrl && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full h-14 text-base border-2 hover:border-primary hover:bg-primary/5 transition-all hover:scale-[1.02]"
                >
                  <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-5 h-5 mr-2" /> Visit Live Site
                  </a>
                </Button>
              )}

              <div className="flex gap-2">
                <Button onClick={toggleStar} variant="outline" className="flex-1">
                  <Star className={`w-4 h-4 mr-2 ${starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  {starred ? 'Starred' : 'Star'}
                </Button>
                <Button onClick={copyShareLink} variant="outline" className="flex-1">
                  <Eye className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>
            </div>

            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.tags.map(t => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectShowcase;
