import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { LoadingScreen } from '@/components/LoadingSpinner';
import { 
  Code, 
  Star, 
  GitFork, 
  Eye, 
  Calendar,
  ArrowRight,
  Lock,
  Globe,
  Users,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';

interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  visibility: 'public' | 'private';
  tags: string[] | null;
  stars_count: number | null;
  forks_count: number | null;
  created_at: string;
  updated_at: string;
  owner: {
    username: string;
    avatar_url: string | null;
  };
}

export default function Project() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId, user]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;

      setProject(data as any);
      
      // Check if current user is owner
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (profile && data.owner_id === profile.id) {
          setIsOwner(true);
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Project Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
              <Code className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{project.title}</h1>
                {project.visibility === 'private' ? (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Globe className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={project.owner?.avatar_url || ''} />
                  <AvatarFallback>{project.owner?.username[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {project.owner?.username}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {isOwner && (
              <Button variant="outline" onClick={() => navigate(`/project/${projectId}/collaborate`)}>
                <Users className="w-4 h-4 mr-2" />
                Collaborate
              </Button>
            )}
            <Button onClick={() => navigate(`/workspace/${projectId}`)}>
              Open Editor
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{project.stars_count || 0}</p>
                <p className="text-xs text-muted-foreground">Stars</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <GitFork className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{project.forks_count || 0}</p>
                <p className="text-xs text-muted-foreground">Forks</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Eye className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{project.visibility}</p>
                <p className="text-xs text-muted-foreground">Visibility</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Calendar className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-bold">{format(new Date(project.created_at), 'MMM d, yyyy')}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {project.description && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
