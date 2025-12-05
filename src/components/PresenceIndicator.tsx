import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OnlineUser {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  active_file: string | null;
  color: string;
}

interface PresenceIndicatorProps {
  projectId: string;
  currentUserId: string;
}

const userColors = [
  'hsl(210, 100%, 60%)', // blue
  'hsl(340, 75%, 60%)',  // pink
  'hsl(160, 75%, 50%)',  // green
  'hsl(40, 100%, 60%)',  // orange
  'hsl(280, 75%, 60%)',  // purple
  'hsl(190, 80%, 50%)',  // cyan
  'hsl(0, 75%, 60%)',    // red
];

export function PresenceIndicator({ projectId, currentUserId }: PresenceIndicatorProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!projectId || !currentUserId) return;

    fetchOnlineUsers();
    
    // Subscribe to presence changes
    const channel = supabase
      .channel(`presence-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_sessions',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchOnlineUsers, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [projectId, currentUserId]);

  const fetchOnlineUsers = async () => {
    const { data: sessions } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('project_id', projectId)
      .neq('user_id', currentUserId)
      .gte('last_seen', new Date(Date.now() - 60000).toISOString());

    if (!sessions) return;

    const userIds = sessions.map(s => s.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    const users = sessions.map((session, index) => ({
      id: session.id,
      user_id: session.user_id,
      username: profiles?.find(p => p.user_id === session.user_id)?.username || 'Anonymous',
      avatar_url: profiles?.find(p => p.user_id === session.user_id)?.avatar_url || '',
      active_file: session.active_file,
      color: userColors[index % userColors.length],
    }));

    setOnlineUsers(users);
  };

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  };

  if (onlineUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="fixed top-4 right-4 z-40 flex items-center gap-1 animate-fade-in">
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 5).map((user, index) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "relative cursor-pointer transition-all duration-300 hover:scale-110 hover:z-10",
                    "animate-scale-in"
                  )}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    zIndex: onlineUsers.length - index 
                  }}
                >
                  <Avatar 
                    className="h-8 w-8 border-2 border-background shadow-lg"
                    style={{ boxShadow: `0 0 0 2px ${user.color}` }}
                  >
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback 
                      className="text-xs font-semibold text-white"
                      style={{ backgroundColor: user.color }}
                    >
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online pulse indicator */}
                  <span 
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background"
                    style={{ backgroundColor: '#22c55e' }}
                  >
                    <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border-border">
                <div className="text-sm">
                  <p className="font-semibold">{user.username}</p>
                  {user.active_file && (
                    <p className="text-muted-foreground text-xs">
                      Editing: {user.active_file}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {onlineUsers.length > 5 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                  <span className="text-xs font-semibold text-muted-foreground">
                    +{onlineUsers.length - 5}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{onlineUsers.length - 5} more online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="ml-2 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30 animate-pulse">
          <span className="text-xs font-medium text-green-400">
            {onlineUsers.length + 1} online
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
