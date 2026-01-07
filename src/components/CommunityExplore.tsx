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
  Filter,
  SlidersHorizontal
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

// Generate fake bot projects
const generateBotProjects = () => {
  const projectNames = [
    'AI Dashboard Pro', 'E-Commerce Store', 'Music Player', 'Task Manager',
    'Weather App', 'Portfolio Site', 'Chat Application', 'Blog Platform',
    'Recipe Finder', 'Fitness Tracker', 'Notes App', 'Calendar Pro',
    'Social Network', 'Video Player', 'Code Editor', 'Design System',
    'Analytics Dashboard', 'CRM Platform', 'Learning Hub', 'Game Portal',
    'Crypto Tracker', 'Travel Planner', 'News Reader', 'Photo Gallery',
    'Invoice Generator', 'Project Manager', 'Email Client', 'Survey Builder',
    'Quiz App', 'Markdown Editor', 'API Explorer', 'Color Palette',
    'Icon Library', 'Animation Studio', 'Form Builder', 'Chart Maker',
    'Database Manager', 'File Explorer', 'Terminal Emulator', 'Music Visualizer',
    'Podcast Player', 'Stock Tracker', 'Budget Manager', 'Habit Tracker',
    'Meditation App', 'Language Learning', 'Flashcard App', 'Pomodoro Timer',
    'Kanban Board', 'Mind Map', 'Whiteboard Pro', 'Screen Recorder',
    'QR Generator', 'Barcode Scanner', 'PDF Viewer', 'Image Editor',
    'Video Editor', 'Audio Recorder', 'Voice Assistant', 'Translator App',
  ];

  const usernames = [
    'devmaster', 'codewhiz', 'pixelpro', 'reactninja', 'fullstackdev',
    'uiuxdesigner', 'webwizard', 'codecraft', 'techlead', 'softwaredev',
    'frontendpro', 'backendguru', 'cloudexpert', 'datascientist', 'mlexpert',
    'appbuilder', 'sitemaker', 'digitalnomad', 'startuphero', 'innovator99',
    'creativecoder', 'designthink', 'buildfaster', 'shipitpro', 'hackathoner',
    'opensourcepro', 'githubstar', 'codenerd42', 'typescriptfan', 'rustlover',
  ];

  const avatarColors = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-yellow-500 to-orange-600',
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-purple-600',
  ];

  const categories = ['web', 'design', 'ecommerce', 'games', 'music', 'education', 'business'];
  const tags = ['react', 'typescript', 'tailwind', 'nextjs', 'vue', 'angular', 'svelte', 'nodejs', 'python', 'api'];

  return projectNames.map((name, i) => ({
    id: `bot-${i}`,
    title: name,
    description: `A beautifully crafted ${name.toLowerCase()} built with modern technologies. Features responsive design, smooth animations, and clean code.`,
    visibility: 'public',
    category: categories[Math.floor(Math.random() * categories.length)],
    tags: [tags[Math.floor(Math.random() * tags.length)], tags[Math.floor(Math.random() * tags.length)]].filter((v, i, a) => a.indexOf(v) === i),
    stars_count: Math.floor(Math.random() * 500) + 10,
    views_count: Math.floor(Math.random() * 5000) + 100,
    forks_count: Math.floor(Math.random() * 100) + 5,
    likes_count: Math.floor(Math.random() * 300) + 20,
    trending_score: Math.random() * 100,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    preview_image: `https://picsum.photos/seed/${i}/400/300`,
    owner: {
      id: `bot-user-${i % usernames.length}`,
      username: usernames[i % usernames.length],
      display_name: usernames[i % usernames.length].charAt(0).toUpperCase() + usernames[i % usernames.length].slice(1),
      avatar_gradient: avatarColors[i % avatarColors.length],
      is_verified: Math.random() > 0.7,
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
  preview_image?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'trending' | 'popular' | 'recent'>('trending');
  const [realProjects, setRealProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealProjects();
  }, []);

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
        views_count: Math.floor(Math.random() * 1000) + 50,
        forks_count: p.forks_count || 0,
        likes_count: Math.floor(Math.random() * 200) + 10,
        trending_score: Math.random() * 50 + 50,
        created_at: p.created_at,
        preview_image: p.preview_url || `https://picsum.photos/seed/${p.id}/400/300`,
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

  const ProjectCard = ({ project }: { project: Project }) => (
    <Card 
      className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50"
      onClick={() => !project.isBot && navigate(`/workspace/${project.id}`)}
    >
      {/* Preview Image */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        <img 
          src={project.preview_image} 
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
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
          <span className="flex items-center gap-1 text-white text-xs bg-black/50 rounded-full px-2 py-1">
            <Heart className="w-3 h-3" />
            {formatNumber(project.likes_count || 0)}
          </span>
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

        {/* Stats */}
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
          <span className="flex items-center gap-1 text-green-500">
            <Sparkles className="w-3 h-3" />
            {Math.floor((project.trending_score || 0))}% match
          </span>
        </div>
      </CardContent>
    </Card>
  );

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
