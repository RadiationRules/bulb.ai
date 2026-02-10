
-- Chat messages table for persistent AI conversations
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat messages"
ON public.chat_messages FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_chat_messages_project ON public.chat_messages(project_id, created_at);

-- Project snapshots table for version history
CREATE TABLE public.project_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT 'Auto-save',
  files_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot_type TEXT NOT NULL DEFAULT 'save' CHECK (snapshot_type IN ('save', 'deploy')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own snapshots"
ON public.project_snapshots FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_project_snapshots_project ON public.project_snapshots(project_id, created_at DESC);
