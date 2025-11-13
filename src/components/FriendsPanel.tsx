import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  UserPlus, 
  Users, 
  Check, 
  X, 
  Search,
  Mail,
  Clock
} from 'lucide-react';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  profiles?: Profile;
}

interface FriendsPanelProps {
  userId: string;
}

export function FriendsPanel({ userId }: FriendsPanelProps) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, [userId]);

  const fetchFriends = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (!error && data) {
      // Fetch profiles separately
      const friendIds = data.map(f => f.friend_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, bio')
        .in('user_id', friendIds);

      const friendsWithProfiles = data.map(friendship => ({
        ...friendship,
        profiles: profiles?.find(p => p.user_id === friendship.friend_id),
      }));

      setFriends(friendsWithProfiles as Friendship[]);
    }
  };

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (!error && data) {
      // Fetch profiles separately
      const userIds = data.map(f => f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, bio')
        .in('user_id', userIds);

      const requestsWithProfiles = data.map(request => ({
        ...request,
        profiles: profiles?.find(p => p.user_id === request.user_id),
      }));

      setPendingRequests(requestsWithProfiles as Friendship[]);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${searchQuery}%`)
      .neq('user_id', userId)
      .limit(10);

    if (!error && data) {
      setSearchResults(data);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending',
      });

    if (error) {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Friend request sent",
      description: "Your request has been sent",
    });

    setSearchResults([]);
    setSearchQuery('');
  };

  const acceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (!error) {
      toast({
        title: "Friend request accepted",
      });
      fetchFriends();
      fetchPendingRequests();
    }
  };

  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (!error) {
      fetchPendingRequests();
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

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="friends" className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">
              <Users className="h-4 w-4 mr-2" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Mail className="h-4 w-4 mr-2" />
              Requests ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="friends" className="flex-1 m-0">
          <div className="p-4 border-b border-border space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                className="bg-secondary border-border"
              />
              <Button onClick={searchUsers} size="icon" className="bg-tech-blue hover:bg-tech-blue/90">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <ScrollArea className="h-48 border border-border rounded-lg">
                <div className="p-2 space-y-2">
                  {searchResults.map((profile) => (
                    <Card key={profile.user_id} className="bg-card border-border">
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(profile.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{profile.display_name}</p>
                          <p className="text-xs text-muted-foreground">@{profile.username}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => sendFriendRequest(profile.user_id)}
                          className="bg-tech-blue hover:bg-tech-blue/90"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-sm">Search and add friends to collaborate</p>
                </div>
              ) : (
                friends.map((friendship) => (
                  <Card key={friendship.id} className="bg-card border-border">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={friendship.profiles?.avatar_url} />
                        <AvatarFallback className="bg-tech-purple text-white">
                          {getInitials(friendship.profiles?.display_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{friendship.profiles?.display_name}</p>
                        <p className="text-sm text-muted-foreground">@{friendship.profiles?.username}</p>
                        {friendship.profiles?.bio && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {friendship.profiles.bio}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">Friend</Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="requests" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending requests</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.profiles?.avatar_url} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(request.profiles?.display_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{request.profiles?.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{request.profiles?.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => acceptRequest(request.id)}
                          className="flex-1 bg-tech-blue hover:bg-tech-blue/90"
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => rejectRequest(request.id)}
                          variant="destructive"
                          className="flex-1"
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}