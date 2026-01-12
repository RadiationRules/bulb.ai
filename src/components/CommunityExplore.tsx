import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { BulbIcon } from '@/components/BulbIcon';
import { 
  Search, 
  Star, 
  Eye, 
  GitFork, 
  Heart, 
  TrendingUp,
  Zap,
  Sparkles,
  Code2,
  Palette,
  ShoppingCart,
  Gamepad2,
  Music,
  BookOpen,
  Briefcase,
  Globe,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Categories with icons
const CATEGORIES = [
  { id: 'all', name: 'All', icon: Globe },
  { id: 'web', name: 'Web Apps', icon: Code2 },
  { id: 'design', name: 'Design', icon: Palette },
  { id: 'ecommerce', name: 'E-Commerce', icon: ShoppingCart },
  { id: 'games', name: 'Games', icon: Gamepad2 },
  { id: 'music', name: 'Music', icon: Music },
  { id: 'education', name: 'Education', icon: BookOpen },
  { id: 'business', name: 'Business', icon: Briefcase },
];

// Project type images that match the category
const PROJECT_IMAGES: Record<string, string> = {
  'AI Dashboard Pro': '/light-bulb.svg',
  'E-Commerce Store': '/light-bulb.svg',
  'Music Player': '/light-bulb.svg',
  'Task Manager': '/light-bulb.svg',
  'Weather App': '/light-bulb.svg',
  'Portfolio Site': '/light-bulb.svg',
  'Chat Application': '/light-bulb.svg',
  'Blog Platform': '/light-bulb.svg',
  'default': '/light-bulb.svg',
};

// Generate bot projects with proper images
const generateBotProjects = () => {
  const projectData = [
    { name: 'AI Dashboard Pro', category: 'web', tags: ['react', 'typescript', 'ai'], desc: 'Beautiful analytics dashboard with AI-powered insights and real-time data visualization' },
    { name: 'E-Commerce Store', category: 'ecommerce', tags: ['react', 'stripe', 'tailwind'], desc: 'Full-featured online store with cart, checkout, and payment processing' },
    { name: 'Music Player', category: 'music', tags: ['react', 'audio', 'visualizer'], desc: 'Sleek music player with playlists, equalizer, and audio visualizations' },
    { name: 'Task Manager', category: 'business', tags: ['react', 'typescript', 'drag-drop'], desc: 'Kanban-style task manager with drag-drop, deadlines, and team collaboration' },
    { name: 'Weather App', category: 'web', tags: ['react', 'api', 'charts'], desc: 'Beautiful weather app with forecasts, maps, and animated weather icons' },
    { name: 'Portfolio Site', category: 'design', tags: ['react', 'animation', 'framer'], desc: 'Stunning portfolio template with smooth animations and project showcases' },
    { name: 'Chat Application', category: 'web', tags: ['react', 'websocket', 'realtime'], desc: 'Real-time chat app with channels, direct messages, and file sharing' },
    { name: 'Blog Platform', category: 'web', tags: ['react', 'markdown', 'cms'], desc: 'Modern blog platform with markdown editor, categories, and SEO optimization' },
    { name: 'Recipe Finder', category: 'web', tags: ['react', 'api', 'search'], desc: 'Recipe discovery app with ingredient search and meal planning' },
    { name: 'Fitness Tracker', category: 'web', tags: ['react', 'charts', 'health'], desc: 'Workout tracker with exercise logging, progress charts, and goals' },
    { name: 'Notes App', category: 'business', tags: ['react', 'markdown', 'sync'], desc: 'Feature-rich notes app with folders, tags, and cloud sync' },
    { name: 'Calendar Pro', category: 'business', tags: ['react', 'typescript', 'scheduling'], desc: 'Professional calendar with events, reminders, and team scheduling' },
    { name: 'Social Network', category: 'web', tags: ['react', 'realtime', 'social'], desc: 'Social media platform with posts, comments, and friend connections' },
    { name: 'Video Player', category: 'music', tags: ['react', 'video', 'streaming'], desc: 'Advanced video player with playlists and picture-in-picture mode' },
    { name: 'Code Editor', category: 'web', tags: ['react', 'monaco', 'typescript'], desc: 'Browser-based code editor with syntax highlighting and live preview' },
    { name: 'Design System', category: 'design', tags: ['react', 'storybook', 'components'], desc: 'Comprehensive design system with reusable components and documentation' },
    { name: 'Analytics Dashboard', category: 'business', tags: ['react', 'charts', 'd3'], desc: 'Data analytics dashboard with interactive charts and export features' },
    { name: 'CRM Platform', category: 'business', tags: ['react', 'typescript', 'crm'], desc: 'Customer relationship manager with contacts, deals, and pipeline views' },
    { name: 'Learning Hub', category: 'education', tags: ['react', 'video', 'courses'], desc: 'Online learning platform with courses, quizzes, and progress tracking' },
    { name: 'Game Portal', category: 'games', tags: ['react', 'canvas', 'gaming'], desc: 'Browser game portal with multiple mini-games and leaderboards' },
  ];

  const usernames = [
    'devmaster', 'codewhiz', 'pixelpro', 'reactninja', 'fullstackdev',
    'uiuxdesigner', 'webwizard', 'codecraft', 'techlead', 'softwaredev',
  ];

  const avatarColors = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
  ];

  return projectData.map((project, i) => ({
    id: `bot-${i}`,
    title: project.name,
    description: project.desc,
    visibility: 'public',
    category: project.category,
    tags: project.tags,
    stars_count: Math.floor(Math.random() * 500) + 100,
    views_count: Math.floor(Math.random() * 5000) + 500,
    forks_count: Math.floor(Math.random() * 100) + 10,
    likes_count: Math.floor(Math.random() * 300) + 50,
    trending_score: Math.random() * 100,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    owner: {
      id: `bot-user-${i % usernames.length}`,
      username: usernames[i % usernames.length],
      display_name: usernames[i % usernames.length].charAt(0).toUpperCase() + usernames[i % usernames.length].slice(1),
      avatar_gradient: avatarColors[i % avatarColors.length],
      is_verified: Math.random() > 0.5,
    },
    isBot: true,
  }));
};

const BOT_PROJECTS = generateBotProjects();

interface Project {
  id: string;
  title: string;
  description: string;
  visibility: string;
  category?: string;
  tags?: string[];
  stars_count: number;
  views_count?: number;
  forks_count: number;
  likes_count?: number;
  trending_score?: number;
  created_at: string;
  owner: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    avatar_gradient?: string;
    is_verified?: boolean;
  };
  isBot?: boolean;
}

export const CommunityExplore = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'trending' | 'popular' | 'recent'>('trending');
  const [realProjects, setRealProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedProjects, setLikedProjects] = useState<Set<string>>(new Set());
  const [remixingId, setRemixingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRealProjects();
    if (profile) {
      fetchUserLikes();
    }
  }, [profile]);

  const fetchRealProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted = data?.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        visibility: p.visibility,
        category: p.tags?.[0] || 'web',
        tags: p.tags || [],
        stars_count: p.stars_count || 0,
        views_count: p.stars_count ? p.stars_count * 10 : 0,
        forks_count: p.forks_count || 0,
        likes_count: p.stars_count || 0,
        trending_score: Math.random() * 50 + 50,
        created_at: p.created_at,
        owner: {
          id: p.profiles?.id || '',
          username: p.profiles?.username || 'user',
          display_name: p.profiles?.display_name || 'User',
          avatar_url: p.profiles?.avatar_url,
        },
        isBot: false,
      })) || [];

      setRealProjects(formatted);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    if (!profile) return;
    try {
      const { data } = await supabase
        .from('project_stars')
        .select('project_id')
        .eq('user_id', profile.id);
      
      if (data) {
        setLikedProjects(new Set(data.map(d => d.project_id)));
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleLike = async (projectId: string, isBot: boolean) => {
    if (!user || !profile) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like projects",
        variant: "destructive"
      });
      return;
    }

    // Optimistic update
    setLikedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });

    // Only save to database for real projects
    if (!isBot) {
      try {
        const isLiked = likedProjects.has(projectId);
        if (isLiked) {
          await supabase
            .from('project_stars')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', profile.id);
        } else {
          await supabase
            .from('project_stars')
            .insert({ project_id: projectId, user_id: profile.id });
        }
      } catch (error) {
        console.error('Error toggling like:', error);
      }
    }

    toast({
      title: likedProjects.has(projectId) ? "Removed from favorites" : "Added to favorites",
      description: likedProjects.has(projectId) ? "Project removed from your favorites" : "Project added to your favorites"
    });
  };

  const handleRemix = async (project: Project) => {
    if (!user || !profile) {
      toast({
        title: "Sign in required",
        description: "Please sign in to remix projects",
        variant: "destructive"
      });
      return;
    }

    setRemixingId(project.id);
    
    try {
      // Create a new project based on the original
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          title: `${project.title} (Remix)`,
          description: `Remixed from ${project.owner.display_name}'s ${project.title}`,
          owner_id: profile.id,
          visibility: 'private',
          tags: project.tags || [],
          forks_count: 0,
          stars_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Create default files for the remix
      await supabase.from('project_files').insert({
        project_id: newProject.id,
        file_path: 'index.html',
        file_content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.title} - Remix</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Remix!</h1>
        <p>This project was remixed from "${project.title}" by ${project.owner.display_name}.</p>
        <p>Start customizing it with BulbAI!</p>
    </div>
</body>
</html>`,
        file_type: 'html'
      });

      toast({
        title: "Project remixed!",
        description: "Opening your new project..."
      });

      navigate(`/workspace/${newProject.id}`);
    } catch (error) {
      console.error('Error remixing project:', error);
      toast({
        title: "Error",
        description: "Failed to remix project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRemixingId(null);
    }
  };

  // Combine real and bot projects
  const allProjects = [...realProjects, ...BOT_PROJECTS];

  // Filter and sort
  const filteredProjects = allProjects
    .filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'trending') return (b.trending_score || 0) - (a.trending_score || 0);
      if (sortBy === 'popular') return b.stars_count - a.stars_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const formatNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  const ProjectCard = ({ project }: { project: Project }) => {
    const isLiked = likedProjects.has(project.id);
    const isRemixing = remixingId === project.id;
    
    return (
      <Card 
        className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50"
      >
        {/* Preview Image - BulbAI default template */}
        <div 
          className="relative aspect-video overflow-hidden bg-gradient-to-br from-tech-blue/20 via-tech-purple/10 to-bulb-glow/20 flex items-center justify-center"
          onClick={() => !project.isBot && navigate(`/workspace/${project.id}`)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-background/40" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <BulbIcon className="w-12 h-12 text-bulb-glow" />
            <span className="text-xs font-medium text-muted-foreground">BulbAI Project</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Trending badge */}
          {(project.trending_score || 0) > 80 && (
            <Badge className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-500 border-0 animate-pulse">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          )}

          {/* Stats overlay on hover */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="flex items-center gap-1 text-white text-xs bg-black/50 rounded-full px-2 py-1">
              <Eye className="w-3 h-3" />
              {formatNumber(project.views_count || 0)}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLike(project.id, project.isBot || false);
              }}
              className={cn(
                "flex items-center gap-1 text-xs rounded-full px-2 py-1 transition-colors",
                isLiked ? "bg-red-500 text-white" : "bg-black/50 text-white hover:bg-red-500/80"
              )}
            >
              <Heart className={cn("w-3 h-3", isLiked && "fill-current")} />
              {formatNumber((project.likes_count || 0) + (isLiked ? 1 : 0))}
            </button>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Owner */}
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="w-6 h-6">
              {project.owner.avatar_url ? (
                <AvatarImage src={project.owner.avatar_url} />
              ) : (
                <div className={cn(
                  "w-full h-full rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold",
                  project.owner.avatar_gradient || 'from-primary to-primary/80'
                )}>
                  {project.owner.display_name[0]}
                </div>
              )}
              <AvatarFallback>{project.owner.display_name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground truncate">
              {project.owner.display_name}
            </span>
            {project.owner.is_verified && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                <Zap className="w-2 h-2 mr-0.5" />
                PRO
              </Badge>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
            {project.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags?.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Stats and Actions */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />
                {formatNumber(project.stars_count)}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                {formatNumber(project.forks_count)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleRemix(project);
              }}
              disabled={isRemixing}
            >
              <Copy className="w-3 h-3 mr-1" />
              {isRemixing ? 'Remixing...' : 'Remix'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects, templates, or creators..."
          className="pl-12 pr-4 py-5 text-base rounded-xl bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary"
        />
      </div>

      {/* Categories */}
      <ScrollArea className="w-full pb-2">
        <div className="flex gap-2">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex-shrink-0 transition-all",
                  selectedCategory === cat.id && "shadow-lg"
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {cat.name}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Sort & Filter */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {filteredProjects.length} projects found
        </span>
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="trending" className="text-xs h-6">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="popular" className="text-xs h-6">
              <Star className="w-3 h-3 mr-1" />
              Popular
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs h-6">
              <Zap className="w-3 h-3 mr-1" />
              Recent
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-muted" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {filteredProjects.length === 0 && !loading && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No projects found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};
