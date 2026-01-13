import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  GitFork, 
  Users, 
  Code, 
  UserPlus,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { BulbIcon } from '@/components/BulbIcon';
import { useNavigate } from 'react-router-dom';

interface CommunityShowcaseProps {
  userId?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  stars_count: number;
  forks_count: number;
  tags: string[];
  owner: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface Creator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  projects_count: number;
}

export const CommunityShowcase = ({ userId }: CommunityShowcaseProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    if (profile) {
      fetchFollowing();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      // Fetch top projects by stars
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          id, title, description, stars_count, forks_count, tags,
          profiles!projects_owner_id_fkey (id, username, display_name, avatar_url)
        `)
        .eq('visibility', 'public')
        .order('stars_count', { ascending: false })
        .limit(10);

      if (projectsData) {
        setProjects(projectsData.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description || '',
          stars_count: p.stars_count || 0,
          forks_count: p.forks_count || 0,
          tags: p.tags || [],
          owner: {
            id: p.profiles?.id || '',
            username: p.profiles?.username || 'user',
            display_name: p.profiles?.display_name || 'User',
            avatar_url: p.profiles?.avatar_url,
          }
        })));
      }

      // Fetch creators with most projects
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, skills')
        .limit(10);

      if (creatorsData) {
        // Get project counts for each creator
        const creatorWithCounts = await Promise.all(
          creatorsData.map(async (creator) => {
            const { count } = await supabase
              .from('projects')
              .select('*', { count: 'exact', head: true })
              .eq('owner_id', creator.id);
            
            return {
              ...creator,
              skills: creator.skills || [],
              projects_count: count || 0
            };
          })
        );
        
        setCreators(creatorWithCounts.sort((a, b) => b.projects_count - a.projects_count));
      }
    } catch (error) {
      console.error('Error fetching community data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!profile) return;
    try {
      const { data } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', profile.id);
      
      if (data) {
        setFollowedUsers(new Set(data.map(f => f.following_id)));
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const handleFollow = async (creatorId: string) => {
    if (!profile) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow creators",
        variant: "destructive"
      });
      return;
    }

    const isFollowing = followedUsers.has(creatorId);

    // Optimistic update
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (isFollowing) {
        newSet.delete(creatorId);
      } else {
        newSet.add(creatorId);
      }
      return newSet;
    });

    try {
      if (isFollowing) {
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', creatorId);
      } else {
        await supabase
          .from('followers')
          .insert({ follower_id: profile.id, following_id: creatorId });
      }

      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing ? "You unfollowed this creator" : "You are now following this creator"
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert on error
      setFollowedUsers(prev => {
        const newSet = new Set(prev);
        if (isFollowing) {
          newSet.add(creatorId);
        } else {
          newSet.delete(creatorId);
        }
        return newSet;
      });
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Community
          </h3>
          <Badge variant="secondary" className="text-xs">
            {projects.length + creators.length} active
          </Badge>
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="projects" className="flex-1 text-xs">
              <Star className="w-3 h-3 mr-1" />
              Top Projects
            </TabsTrigger>
            <TabsTrigger value="creators" className="flex-1 text-xs">
              <Users className="w-3 h-3 mr-1" />
              Creators
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Code className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No public projects yet</p>
                    <p className="text-xs">Be the first to share!</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/workspace/${project.id}`)}
                      className="p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-tech-blue/20 to-bulb-glow/20 flex items-center justify-center flex-shrink-0">
                          <BulbIcon className="w-5 h-5 text-bulb-glow" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                            {project.title}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {project.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={project.owner.avatar_url || ''} />
                                <AvatarFallback className="text-[8px]">
                                  {getInitials(project.owner.display_name)}
                                </AvatarFallback>
                              </Avatar>
                              {project.owner.display_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              {project.stars_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitFork className="w-3 h-3" />
                              {project.forks_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="creators">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {creators.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No creators yet</p>
                    <p className="text-xs">Join the community!</p>
                  </div>
                ) : (
                  creators.map((creator) => (
                    <div
                      key={creator.id}
                      className="p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={creator.avatar_url || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm">
                            {getInitials(creator.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{creator.display_name}</h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {creator.bio || `@${creator.username}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {creator.projects_count} projects
                            </Badge>
                            {creator.skills?.slice(0, 2).map(skill => (
                              <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {profile?.id !== creator.id && (
                          <Button
                            size="sm"
                            variant={followedUsers.has(creator.id) ? "secondary" : "default"}
                            className="h-7 text-xs"
                            onClick={() => handleFollow(creator.id)}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            {followedUsers.has(creator.id) ? 'Following' : 'Follow'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
