-- Fix security issue: Restrict profiles table access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO anon USING (user_id = auth.uid());

-- Create friends system
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships" ON public.friendships FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friendships" ON public.friendships FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their friendships" ON public.friendships FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create activity feed
CREATE TABLE public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view friend activities" ON public.user_activities FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.friendships 
      WHERE (user_id = auth.uid() AND friend_id = user_activities.user_id AND status = 'accepted')
         OR (friend_id = auth.uid() AND user_id = user_activities.user_id AND status = 'accepted')
    )
  );

CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON public.user_activities(created_at DESC);

-- Create Git integration tables
CREATE TABLE public.project_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commit_message TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  files_changed JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_commits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project commits" ON public.project_commits FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can create commits" ON public.project_commits FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

CREATE INDEX idx_project_commits_project_id ON public.project_commits(project_id);

-- Create collaboration sessions table
CREATE TABLE public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cursor_position JSONB,
  active_file TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collaboration sessions" ON public.collaboration_sessions FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can manage their own session" ON public.collaboration_sessions FOR ALL TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_collaboration_sessions_project_id ON public.collaboration_sessions(project_id);
CREATE INDEX idx_collaboration_sessions_last_seen ON public.collaboration_sessions(last_seen DESC);

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_sessions;
ALTER TABLE public.collaboration_sessions REPLICA IDENTITY FULL;