import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Star, Users, Code, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export function UserProfileMenu({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ projects: 0, stars: 0, friends: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
    fetchStats();
  }, [userId]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    setProfile(data as Profile);
  };

  const fetchStats = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profile) return;

    const [projectsRes, starsRes, friendsRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('owner_id', profile.id),
      supabase
        .from('project_stars')
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id),
      supabase
        .from('friendships')
        .select('id', { count: 'exact' })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted'),
    ]);

    setStats({
      projects: projectsRes.count || 0,
      stars: starsRes.count || 0,
      friends: friendsRes.count || 0,
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!profile) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(profile.display_name || profile.username)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end">
        <DropdownMenuLabel>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(profile.display_name || profile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{profile.display_name || profile.username}</p>
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Code className="h-4 w-4 text-primary" />
                <span className="text-lg font-bold">{stats.projects}</span>
              </div>
              <p className="text-xs text-muted-foreground">Projects</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="h-4 w-4 text-accent" />
                <span className="text-lg font-bold">{stats.stars}</span>
              </div>
              <p className="text-xs text-muted-foreground">Stars</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-4 w-4 text-tech-blue" />
                <span className="text-lg font-bold">{stats.friends}</span>
              </div>
              <p className="text-xs text-muted-foreground">Friends</p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {profile.bio && (
          <>
            <div className="px-2 py-2">
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => navigate('/dashboard')}>
          <Activity className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/dashboard?tab=settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
