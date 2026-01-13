import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { BulbIcon } from '@/components/BulbIcon';
import { 
  Plus, 
  Star, 
  Clock, 
  Globe, 
  Lock, 
  Code2, 
  GitFork,
  Search,
  Filter,
  Settings
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ProjectSettingsModal } from '@/components/ProjectSettingsModal';
import { CommunityExplore } from '@/components/CommunityExplore';

interface Project {
  id: string;
  title: string;
  description: string;
  visibility: 'public' | 'private';
  tags: string[];
  stars_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  owner: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [starredProjects, setStarredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('explore');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && profile) {
      fetchProjects();
      fetchMyProjects();
      fetchStarredProjects();
    }
  }, [user, profile]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const formattedData = data.map(project => ({
        ...project,
        owner: project.profiles
      }));
      
      setProjects(formattedData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchMyProjects = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('owner_id', profile.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = data.map(project => ({
        ...project,
        owner: project.profiles
      }));
      
      setMyProjects(formattedData);
    } catch (error) {
      console.error('Error fetching my projects:', error);
    }
  };

  const fetchStarredProjects = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('project_stars')
        .select(`
          projects (
            *,
            profiles!projects_owner_id_fkey (
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', profile.id);

      if (error) throw error;
      
      const formattedData = data.map(star => ({
        ...star.projects,
        owner: star.projects.profiles
      }));
      
      setStarredProjects(formattedData);
    } catch (error) {
      console.error('Error fetching starred projects:', error);
    }
  };

  const createNewProject = async () => {
    if (!profile) return;
    
    setIsCreating(true);
    try {
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          title: 'Untitled Project',
          description: 'A new BulbAI project',
          owner_id: profile.id,
          visibility: 'private',
          tags: []
        })
        .select()
        .single();

      if (error) throw error;
      
      // Create default files
      const defaultFiles = [
        {
          project_id: newProject.id,
          file_path: 'index.html',
          file_content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${newProject.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your New Project!</h1>
        <p>Start building something amazing with BulbAI.</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
          file_type: 'html'
        }
      ];

      await supabase.from('project_files').insert(defaultFiles);
      
      navigate(`/workspace/${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const openProject = (projectId: string) => {
    navigate(`/workspace/${projectId}`);
  };

  const toggleStar = async (projectId: string, isStarred: boolean) => {
    if (!profile) return;

    try {
      if (isStarred) {
        await supabase
          .from('project_stars')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', profile.id);
      } else {
        await supabase
          .from('project_stars')
          .insert({
            project_id: projectId,
            user_id: profile.id
          });
      }
      
      // Refresh data after toggle
      fetchProjects();
      fetchStarredProjects();
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const [settingsProject, setSettingsProject] = useState<Project | null>(null);

  const ProjectCard = ({ project, showOwner = true }: { project: Project; showOwner?: boolean }) => {
    const isStarred = starredProjects.some(p => p.id === project.id);
    
    return (
      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-1">
        {/* Preview Image - Default BulbAI Template */}
        <div 
          className="aspect-video bg-gradient-to-br from-tech-blue/20 via-tech-purple/10 to-bulb-glow/20 relative overflow-hidden flex items-center justify-center"
          onClick={() => openProject(project.id)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-background/40" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <BulbIcon className="w-12 h-12 text-bulb-glow" />
            <span className="text-xs font-medium text-muted-foreground">BulbAI Project</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1" onClick={() => openProject(project.id)}>
              <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                {project.title}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {project.description || 'No description'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar(project.id, isStarred);
                }}
                className="h-8 px-2"
              >
                <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                <span className="ml-1 text-xs">{project.stars_count || 0}</span>
              </Button>
              {!showOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSettingsProject(project);
                  }}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Visibility Badge */}
          <div className="flex items-center justify-between mb-3">
            <Badge 
              variant={project.visibility === 'public' ? 'default' : 'secondary'}
              className={project.visibility === 'public' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
            >
              {project.visibility === 'public' ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
              {project.visibility}
            </Badge>
            {showOwner && (
              <div className="flex items-center gap-2">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={project.owner?.avatar_url} />
                  <AvatarFallback className="text-[10px]">{project.owner?.display_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {project.owner?.display_name || project.owner?.username}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {project.tags?.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{project.tags.length - 3}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                {project.forks_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(project.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 truncate">
                Welcome back, {profile?.display_name || 'Developer'}! Ready to build something amazing?
              </p>
            </div>
            <Button 
              onClick={createNewProject} 
              disabled={isCreating} 
              className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0 z-10"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'New Project'}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="explore">Explore</TabsTrigger>
              <TabsTrigger value="myprojects" className="hidden sm:inline-flex">My Projects ({myProjects.length})</TabsTrigger>
              <TabsTrigger value="myprojects" className="sm:hidden">Mine ({myProjects.length})</TabsTrigger>
              <TabsTrigger value="starred" className="hidden sm:inline-flex">Starred ({starredProjects.length})</TabsTrigger>
              <TabsTrigger value="starred" className="sm:hidden">★ ({starredProjects.length})</TabsTrigger>
            </TabsList>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-80"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="explore" className="space-y-6">
              <CommunityExplore />
            </TabsContent>

            <TabsContent value="myprojects" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProjects.filter(project => 
                  project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  project.description?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((project) => (
                  <ProjectCard key={project.id} project={project} showOwner={false} />
                ))}
              </div>
              
              {myProjects.length === 0 && (
                <div className="text-center py-12">
                  <Code2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">Start building your first project with BulbAI</p>
                  <Button onClick={createNewProject}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Project
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="starred" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {starredProjects.filter(project => 
                  project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  project.description?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
              
              {starredProjects.length === 0 && (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No starred projects</h3>
                  <p className="text-muted-foreground">Star projects you find interesting to keep track of them</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Project Settings Modal */}
      {settingsProject && (
        <ProjectSettingsModal
          open={!!settingsProject}
          onOpenChange={(open) => !open && setSettingsProject(null)}
          projectId={settingsProject.id}
          projectTitle={settingsProject.title}
          projectDescription={settingsProject.description}
          projectVisibility={settingsProject.visibility}
          projectTags={settingsProject.tags}
          projectCreatedAt={settingsProject.created_at}
          onUpdate={() => {
            fetchMyProjects();
            fetchStarredProjects();
            setSettingsProject(null);
          }}
        />
      )}
    </div>
  );
}
