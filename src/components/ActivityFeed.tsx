import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  GitCommit, 
  Rocket, 
  Star, 
  Code,
  FolderPlus
} from 'lucide-react';

interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_data: any;
  project_id: string | null;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  projects?: {
    title: string;
  };
}

interface ActivityFeedProps {
  userId: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Subscribe to new activities
    const channel = supabase
      .channel('activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activities',
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchActivities = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // Fetch related profiles and projects
      const userIds = [...new Set(data.map(a => a.user_id))];
      const projectIds = [...new Set(data.map(a => a.project_id).filter(Boolean))];

      const [profilesResult, projectsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', userIds),
        projectIds.length > 0
          ? supabase
              .from('projects')
              .select('id, title')
              .in('id', projectIds)
          : Promise.resolve({ data: [] }),
      ]);

      const activitiesWithDetails = data.map(activity => ({
        ...activity,
        profiles: profilesResult.data?.find(p => p.user_id === activity.user_id),
        projects: projectsResult.data?.find(p => p.id === activity.project_id),
      }));

      setActivities(activitiesWithDetails);
    }

    setIsLoading(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_created':
        return <FolderPlus className="h-4 w-4 text-tech-blue" />;
      case 'commit':
        return <GitCommit className="h-4 w-4 text-tech-purple" />;
      case 'deployment':
        return <Rocket className="h-4 w-4 text-bulb-glow" />;
      case 'star':
        return <Star className="h-4 w-4 text-accent" />;
      case 'code_edit':
        return <Code className="h-4 w-4 text-primary" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: UserActivity) => {
    const userName = activity.profiles?.display_name || 'Someone';
    const projectName = activity.projects?.title || 'a project';

    switch (activity.activity_type) {
      case 'project_created':
        return `${userName} created ${projectName}`;
      case 'commit':
        return `${userName} committed to ${projectName}`;
      case 'deployment':
        return `${userName} deployed ${projectName}`;
      case 'star':
        return `${userName} starred ${projectName}`;
      case 'code_edit':
        return `${userName} is editing ${projectName}`;
      default:
        return `${userName} did something in ${projectName}`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getTimeSince = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          <h3 className="font-semibold">Activity Feed</h3>
          <Badge variant="secondary" className="ml-auto">
            {activities.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50 animate-pulse" />
              <p>Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No activities yet</p>
              <p className="text-sm">Add friends to see their activity</p>
            </div>
          ) : (
            activities.map((activity) => (
              <Card key={activity.id} className="bg-card border-border hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={activity.profiles?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(activity.profiles?.display_name || 'U')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActivityIcon(activity.activity_type)}
                        <p className="text-sm font-medium truncate">
                          {getActivityText(activity)}
                        </p>
                      </div>
                      
                      {activity.activity_data?.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.activity_data.message}
                        </p>
                      )}

                      <Badge variant="outline" className="text-xs mt-2">
                        {getTimeSince(activity.created_at)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}