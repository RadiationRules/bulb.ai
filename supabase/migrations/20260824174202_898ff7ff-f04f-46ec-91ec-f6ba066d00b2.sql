-- chat_messages: scope to project access as well as own user
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON public.chat_messages;

CREATE POLICY "Users can view their own project chat messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = chat_messages.project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert chat messages in their projects"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = chat_messages.project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own project chat messages"
ON public.chat_messages FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = chat_messages.project_id AND pr.user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = chat_messages.project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own project chat messages"
ON public.chat_messages FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- workspace_sessions: stop broadcasting live cursor data to public-project viewers
DROP POLICY IF EXISTS "Users can view sessions for projects they have access to" ON public.workspace_sessions;

CREATE POLICY "Owners and accepted collaborators can view workspace sessions"
ON public.workspace_sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles prof ON prof.id = p.owner_id
    WHERE p.id = workspace_sessions.project_id AND prof.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.collaborations c
    JOIN public.profiles prof ON prof.id = c.collaborator_id
    WHERE c.project_id = workspace_sessions.project_id
      AND prof.user_id = auth.uid()
      AND c.status = 'accepted'
  )
);

-- collaboration_sessions: let accepted collaborators (not just owner) see sessions, still private-scoped
DROP POLICY IF EXISTS "Users can view collaboration sessions" ON public.collaboration_sessions;

CREATE POLICY "Owners and accepted collaborators can view collaboration sessions"
ON public.collaboration_sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = collaboration_sessions.project_id AND pr.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.collaborations c
    JOIN public.profiles prof ON prof.id = c.collaborator_id
    WHERE c.project_id = collaboration_sessions.project_id
      AND prof.user_id = auth.uid()
      AND c.status = 'accepted'
  )
);

-- project_env_vars: ensure plaintext secrets are never reachable by anon or via Data API misuse
REVOKE ALL ON public.project_env_vars FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_env_vars TO authenticated;