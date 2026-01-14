import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, FolderKanban, Shield, Search, Eye, Trash2, 
  ExternalLink, BarChart3, AlertTriangle, Crown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface AdminUser {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  projects_count?: number;
}

interface AdminProject {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  visibility: string;
  stars_count: number | null;
  created_at: string;
  owner?: {
    username: string;
    display_name: string | null;
  };
}

export const AdminPanel = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    publicProjects: 0,
    privateProjects: 0
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch all projects with owner info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey(username, display_name)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Count projects per user
      const projectCounts: Record<string, number> = {};
      projectsData?.forEach(p => {
        projectCounts[p.owner_id] = (projectCounts[p.owner_id] || 0) + 1;
      });

      const usersWithCounts = usersData?.map(u => ({
        ...u,
        projects_count: projectCounts[u.id] || 0
      })) || [];

      setUsers(usersWithCounts);
      setProjects(projectsData || []);
      setStats({
        totalUsers: usersData?.length || 0,
        totalProjects: projectsData?.length || 0,
        publicProjects: projectsData?.filter(p => p.visibility === 'public').length || 0,
        privateProjects: projectsData?.filter(p => p.visibility === 'private').length || 0
      });
    } catch (error) {
      console.error('Admin fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user and all their data?')) return;
    
    try {
      // Delete user's projects first
      await supabase.from('projects').delete().eq('owner_id', userId);
      // Delete profile
      await supabase.from('profiles').delete().eq('id', userId);
      
      toast({ title: "User deleted" });
      fetchAdminData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await supabase.from('project_files').delete().eq('project_id', projectId);
      await supabase.from('project_stars').delete().eq('project_id', projectId);
      await supabase.from('projects').delete().eq('id', projectId);
      
      toast({ title: "Project deleted" });
      fetchAdminData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete project", variant: "destructive" });
    }
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/workspace/${projectId}`);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner?.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-tech-blue/20 to-tech-purple/20 border-tech-blue/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-tech-blue/20">
              <Users className="h-5 w-5 text-tech-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-tech-purple/20 to-bulb-glow/20 border-tech-purple/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-tech-purple/20">
              <FolderKanban className="h-5 w-5 text-tech-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalProjects}</p>
              <p className="text-xs text-muted-foreground">Total Projects</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Eye className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.publicProjects}</p>
              <p className="text-xs text-muted-foreground">Public</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Shield className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.privateProjects}</p>
              <p className="text-xs text-muted-foreground">Private</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users or projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs for Users and Projects */}
      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Projects ({filteredProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback className="bg-tech-blue/20 text-tech-blue">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.display_name || user.username}</p>
                          {user.user_id && (
                            <Badge variant="outline" className="text-xs">
                              @{user.username}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {user.projects_count} projects • Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="projects">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{project.title}</p>
                        <Badge variant={project.visibility === 'public' ? 'default' : 'secondary'}>
                          {project.visibility}
                        </Badge>
                        {project.stars_count && project.stars_count > 0 && (
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                            ⭐ {project.stars_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        by @{project.owner?.username} • Created {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewProject(project.id)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Admin Badge */}
      <Card className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <div className="flex items-center gap-3">
          <Crown className="h-6 w-6 text-yellow-500" />
          <div>
            <p className="font-semibold text-yellow-500">Admin Access</p>
            <p className="text-xs text-muted-foreground">
              You have full access to manage all users and projects on BulbAI
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};