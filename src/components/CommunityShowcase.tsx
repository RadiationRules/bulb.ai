import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  GitFork, 
  Users, 
  TrendingUp, 
  Code, 
  Sparkles,
  ExternalLink,
  UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Featured bot users (simulated active community)
const FEATURED_USERS = [
  {
    id: 'bot-1',
    username: 'sarah_codes',
    display_name: 'Sarah Chen',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    bio: 'Full-stack developer passionate about AI and React',
    company: 'TechFlow Labs',
    location: 'San Francisco, CA',
    skills: ['React', 'TypeScript', 'AI'],
    projects_count: 24,
    stars_received: 847,
    isBot: true
  },
  {
    id: 'bot-2',
    username: 'alex_dev',
    display_name: 'Alex Rivera',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    bio: 'Backend specialist building scalable systems',
    company: 'CloudScale Inc',
    location: 'Austin, TX',
    skills: ['Python', 'Go', 'Kubernetes'],
    projects_count: 18,
    stars_received: 623,
    isBot: true
  },
  {
    id: 'bot-3',
    username: 'maya_builds',
    display_name: 'Maya Johnson',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maya',
    bio: 'UI/UX designer turned developer',
    company: 'DesignCode Studio',
    location: 'New York, NY',
    skills: ['CSS', 'Figma', 'React'],
    projects_count: 31,
    stars_received: 1245,
    isBot: true
  },
  {
    id: 'bot-4',
    username: 'dev_marcus',
    display_name: 'Marcus Williams',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus',
    bio: 'Mobile & web developer, OSS contributor',
    company: 'Startup Valley',
    location: 'Seattle, WA',
    skills: ['React Native', 'Flutter', 'Swift'],
    projects_count: 15,
    stars_received: 534,
    isBot: true
  },
  {
    id: 'bot-5',
    username: 'code_emma',
    display_name: 'Emma Zhang',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
    bio: 'Machine learning engineer building intelligent apps',
    company: 'AI Research Co',
    location: 'Boston, MA',
    skills: ['Python', 'TensorFlow', 'LLMs'],
    projects_count: 22,
    stars_received: 982,
    isBot: true
  },
  {
    id: 'bot-6',
    username: 'nick_frontend',
    display_name: 'Nick Anderson',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nick',
    bio: 'Frontend architect and performance expert',
    company: 'WebSpeed Agency',
    location: 'Los Angeles, CA',
    skills: ['Vue', 'Svelte', 'WebGL'],
    projects_count: 19,
    stars_received: 756,
    isBot: true
  }
];

// Featured projects (simulated popular projects)
const FEATURED_PROJECTS = [
  {
    id: 'proj-1',
    title: 'AI Dashboard Pro',
    description: 'Beautiful analytics dashboard with AI-powered insights and real-time data visualization',
    owner: FEATURED_USERS[0],
    tags: ['React', 'AI', 'Dashboard'],
    stars_count: 847,
    forks_count: 156,
    preview_url: 'https://ai-dashboard-demo.vercel.app'
  },
  {
    id: 'proj-2',
    title: 'CloudAPI Gateway',
    description: 'High-performance API gateway with rate limiting and caching',
    owner: FEATURED_USERS[1],
    tags: ['Go', 'API', 'Microservices'],
    stars_count: 623,
    forks_count: 89,
    preview_url: null
  },
  {
    id: 'proj-3',
    title: 'Pixel Perfect UI Kit',
    description: 'Modern component library with 100+ beautiful components',
    owner: FEATURED_USERS[2],
    tags: ['React', 'CSS', 'UI'],
    stars_count: 1245,
    forks_count: 312,
    preview_url: 'https://pixelperfect-ui.vercel.app'
  },
  {
    id: 'proj-4',
    title: 'SmartML Pipeline',
    description: 'End-to-end machine learning pipeline with auto-optimization',
    owner: FEATURED_USERS[4],
    tags: ['Python', 'ML', 'AutoML'],
    stars_count: 982,
    forks_count: 201,
    preview_url: null
  },
  {
    id: 'proj-5',
    title: '3D Portfolio Showcase',
    description: 'Interactive 3D portfolio with WebGL animations',
    owner: FEATURED_USERS[5],
    tags: ['Three.js', 'WebGL', 'Animation'],
    stars_count: 756,
    forks_count: 134,
    preview_url: 'https://3d-portfolio-demo.vercel.app'
  },
  {
    id: 'proj-6',
    title: 'E-Commerce Starter',
    description: 'Full-featured e-commerce template with Stripe integration',
    owner: FEATURED_USERS[2],
    tags: ['Next.js', 'Stripe', 'Commerce'],
    stars_count: 1567,
    forks_count: 423,
    preview_url: 'https://ecommerce-starter.vercel.app'
  }
];

interface CommunityShowcaseProps {
  userId?: string;
}

export function CommunityShowcase({ userId }: CommunityShowcaseProps) {
  const [realProjects, setRealProjects] = useState<any[]>([]);
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    try {
      // Fetch real public projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*, profiles!projects_owner_id_fkey(username, display_name, avatar_url)')
        .eq('visibility', 'public')
        .order('stars_count', { ascending: false })
        .limit(10);

      if (projects) {
        setRealProjects(projects);
      }

      // Fetch real users
      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

      if (users) {
        setRealUsers(users);
      }
    } catch (error) {
      console.error('Error fetching community data:', error);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow users",
        variant: "destructive"
      });
      return;
    }

    // Optimistic UI update
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetUserId)) {
        newSet.delete(targetUserId);
      } else {
        newSet.add(targetUserId);
      }
      return newSet;
    });

    toast({
      title: followedUsers.has(targetUserId) ? "Unfollowed" : "Following",
      description: followedUsers.has(targetUserId) 
        ? "You unfollowed this user" 
        : "You are now following this user"
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Combine featured (bot) content with real content
  const allProjects = [...FEATURED_PROJECTS, ...realProjects.map(p => ({
    ...p,
    owner: p.profiles || { display_name: 'Unknown', avatar_url: null }
  }))];

  const allUsers = [...FEATURED_USERS, ...realUsers.filter(u => u.user_id !== userId)];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-tech-blue" />
          <h2 className="font-semibold text-lg">Community</h2>
          <Badge variant="secondary" className="ml-auto">
            {allUsers.length}+ creators
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Discover amazing projects and connect with developers
        </p>
      </div>

      <Tabs defaultValue="trending" className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trending" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs">
              <Code className="h-3 w-3 mr-1" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="creators" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Creators
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="trending" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {allProjects.slice(0, 6).map((project) => (
                <Card key={project.id} className="overflow-hidden hover:border-tech-blue/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={project.owner?.avatar_url} />
                        <AvatarFallback className="bg-tech-purple text-white text-xs">
                          {getInitials(project.owner?.display_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{project.title}</h3>
                          {project.owner?.isBot && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">Featured</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {project.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center text-xs text-muted-foreground">
                            <Star className="h-3 w-3 mr-1 text-yellow-500" />
                            {project.stars_count}
                          </span>
                          <span className="flex items-center text-xs text-muted-foreground">
                            <GitFork className="h-3 w-3 mr-1" />
                            {project.forks_count}
                          </span>
                          {project.preview_url && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs ml-auto">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {project.tags?.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="projects" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {allProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden hover:border-tech-blue/50 transition-colors">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-1">{project.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {project.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={project.owner?.avatar_url} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(project.owner?.display_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {project.owner?.display_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {project.stars_count}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="creators" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {allUsers.map((user) => (
                <Card key={user.id || user.user_id} className="overflow-hidden hover:border-tech-blue/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-tech-blue/20">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-tech-purple text-white">
                          {getInitials(user.display_name || user.username || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{user.display_name}</h3>
                          {user.isBot && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">AI Creator</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                        {user.bio && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>
                        )}
                        <div className="flex gap-1 mt-2">
                          {(user.skills || []).slice(0, 3).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={followedUsers.has(user.id || user.user_id) ? "secondary" : "default"}
                        onClick={() => handleFollow(user.id || user.user_id)}
                        className="shrink-0"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}