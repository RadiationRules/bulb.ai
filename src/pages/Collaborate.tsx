import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Navigation } from '@/components/Navigation';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Video, 
  Clock, 
  Check, 
  X, 
  Search,
  ArrowLeft,
  Share2,
  Link as LinkIcon,
  Copy
} from 'lucide-react';

interface Collaborator {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  status: 'online' | 'offline' | 'away';
  joined_at: string;
}

interface PendingInvite {
  id: string;
  email: string;
  sent_at: string;
  status: string;
}

export default function Collaborate() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState('');

  useEffect(() => {
    if (projectId) {
      loadCollaborators();
      loadProjectInfo();
    }
  }, [projectId]);

  const loadProjectInfo = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single();
    
    if (data) {
      setProjectTitle(data.title);
    }
  };

  const loadCollaborators = async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('collaborations')
        .select(`
          id,
          role,
          status,
          created_at,
          collaborator:profiles!collaborations_collaborator_id_fkey (
            id,
            user_id,
            username,
            avatar_url
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const formattedCollaborators = data?.map((c: any) => ({
        id: c.id,
        user_id: c.collaborator?.user_id || '',
        username: c.collaborator?.username || 'Unknown',
        avatar_url: c.collaborator?.avatar_url,
        role: c.role || 'viewer',
        status: 'online' as const,
        joined_at: c.created_at
      })) || [];

      setCollaborators(formattedCollaborators);
    } catch (error) {
      console.error('Error loading collaborators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !projectId) return;

    // Simulate invite
    toast({
      title: 'Invitation sent',
      description: `Invited ${inviteEmail} to collaborate`,
    });

    setPendingInvites([
      ...pendingInvites,
      {
        id: Date.now().toString(),
        email: inviteEmail,
        sent_at: new Date().toISOString(),
        status: 'pending'
      }
    ]);
    setInviteEmail('');
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/workspace/${projectId}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Link copied',
      description: 'Share link copied to clipboard',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(`/workspace/${projectId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Collaboration</h1>
              <p className="text-muted-foreground">{projectTitle}</p>
            </div>
          </div>
          
          <Button onClick={copyShareLink} className="gap-2">
            <Share2 className="w-4 h-4" />
            Share Link
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invite Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Invite Collaborators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                />
                <Button onClick={handleInvite}>Send Invite</Button>
              </div>

              {/* Share link */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Share Link</span>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={`${window.location.origin}/workspace/${projectId}`}
                    readOnly
                    className="text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyShareLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Pending invites */}
              {pendingInvites.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Pending Invites</h4>
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">{invite.email}</span>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate(`/workspace/${projectId}`)}>
                <MessageSquare className="w-4 h-4" />
                Open Workspace
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" disabled>
                <Video className="w-4 h-4" />
                Start Video Call
                <Badge variant="secondary" className="ml-auto text-xs">Soon</Badge>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Collaborators List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Team Members ({collaborators.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No collaborators yet</p>
                <p className="text-sm text-muted-foreground">Invite team members to start collaborating</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collaborators.map((collaborator) => (
                  <div 
                    key={collaborator.id}
                    className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={collaborator.avatar_url || ''} />
                        <AvatarFallback>{collaborator.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                        collaborator.status === 'online' ? 'bg-green-500' :
                        collaborator.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{collaborator.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{collaborator.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
