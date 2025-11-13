import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Eye, MousePointer } from 'lucide-react';

interface CollaborationSession {
  id: string;
  user_id: string;
  cursor_position: any;
  active_file: string;
  last_seen: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface CollaborationPanelProps {
  projectId: string;
  currentUserId: string;
  activeFile: string | null;
}

export function CollaborationPanel({ projectId, currentUserId, activeFile }: CollaborationPanelProps) {
  const [sessions, setSessions] = useState<CollaborationSession[]>([]);

  useEffect(() => {
    fetchSessions();
    updateMySession();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('collaboration-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_sessions',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    // Update session every 10 seconds
    const interval = setInterval(updateMySession, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [projectId, activeFile]);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('project_id', projectId)
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .neq('user_id', currentUserId);

    if (!error && data) {
      // Fetch profiles separately
      const userIds = data.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const sessionsWithProfiles = data.map(session => ({
        ...session,
        profiles: profiles?.find(p => p.user_id === session.user_id),
      }));

      setSessions(sessionsWithProfiles);
    }
  };

  const updateMySession = async () => {
    const { data: existing } = await supabase
      .from('collaboration_sessions')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', currentUserId)
      .single();

    const sessionData = {
      project_id: projectId,
      user_id: currentUserId,
      active_file: activeFile,
      last_seen: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from('collaboration_sessions')
        .update(sessionData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('collaboration_sessions')
        .insert(sessionData);
    }
  };

  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getTimeSince = (lastSeen: string) => {
    const seconds = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-tech-purple" />
          <h3 className="font-semibold">Active Collaborators</h3>
          <Badge variant="secondary" className="ml-auto">
            {sessions.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No active collaborators</p>
              <p className="text-sm">Invite others to work together</p>
            </div>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} className="bg-card border-border">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.profiles?.avatar_url} />
                        <AvatarFallback className="bg-tech-purple text-white">
                          {getInitials(session.profiles?.username || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {session.profiles?.username || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {session.active_file ? (
                          <>
                            <Eye className="h-3 w-3" />
                            <span className="truncate">{session.active_file}</span>
                          </>
                        ) : (
                          <>
                            <MousePointer className="h-3 w-3" />
                            <span>Browsing</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Badge variant="outline" className="text-xs">
                      {getTimeSince(session.last_seen)}
                    </Badge>
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