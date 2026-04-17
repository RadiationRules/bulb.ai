
-- 1. Fix collaboration_sessions owner-view policy
DROP POLICY IF EXISTS "Users can view collaboration sessions" ON public.collaboration_sessions;
CREATE POLICY "Users can view collaboration sessions"
ON public.collaboration_sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = collaboration_sessions.project_id
      AND pr.user_id = auth.uid()
  )
);

-- 2. Fix deployments policies
DROP POLICY IF EXISTS "Users can view deployments of their projects" ON public.deployments;
DROP POLICY IF EXISTS "Users can create deployments for their projects" ON public.deployments;
DROP POLICY IF EXISTS "Users can update deployments of their projects" ON public.deployments;

CREATE POLICY "Users can view deployments of their projects"
ON public.deployments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = deployments.project_id AND pr.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create deployments for their projects"
ON public.deployments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = deployments.project_id AND pr.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update deployments of their projects"
ON public.deployments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = deployments.project_id AND pr.user_id = auth.uid()
  )
);

-- 3. Fix project_env_vars
DROP POLICY IF EXISTS "Users can view env vars of their projects" ON public.project_env_vars;
DROP POLICY IF EXISTS "Users can manage env vars of their projects" ON public.project_env_vars;

CREATE POLICY "Users can view env vars of their projects"
ON public.project_env_vars FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = project_env_vars.project_id AND pr.user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage env vars of their projects"
ON public.project_env_vars FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = project_env_vars.project_id AND pr.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = project_env_vars.project_id AND pr.user_id = auth.uid()
  )
);

-- 4. Fix project_packages
DROP POLICY IF EXISTS "Users can view packages of their projects" ON public.project_packages;
DROP POLICY IF EXISTS "Users can manage packages of their projects" ON public.project_packages;

CREATE POLICY "Users can view packages of their projects"
ON public.project_packages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = project_packages.project_id AND pr.user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage packages of their projects"
ON public.project_packages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = project_packages.project_id AND pr.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = project_packages.project_id AND pr.user_id = auth.uid()
  )
);

-- 5. Fix project_commits
DROP POLICY IF EXISTS "Users can view project commits" ON public.project_commits;
DROP POLICY IF EXISTS "Users can create commits" ON public.project_commits;

CREATE POLICY "Users can view project commits"
ON public.project_commits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = project_commits.project_id AND pr.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create commits"
ON public.project_commits FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = project_commits.project_id AND pr.user_id = auth.uid()
  )
);

-- 6. Admin delete policies
CREATE POLICY "Admins can delete any project"
ON public.projects FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any profile"
ON public.profiles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Restrict profile referral_code visibility
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Public-readable profile fields (no referral_code) for everyone authenticated
CREATE POLICY "Authenticated users can view public profile fields"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Note: Column-level restriction is handled via a view + advise app to use it.
-- Create a safe public view that excludes referral_code.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, user_id, username, display_name, bio, avatar_url, github_url,
       portfolio_url, skills, location, created_at, updated_at,
       github_username, company, twitter_url, linkedin_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 8. Lock project-assets storage to project owners (insert/update/delete)
DROP POLICY IF EXISTS "Authenticated users can upload project assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their project assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload assets to their own projects" ON storage.objects;

CREATE POLICY "Users can upload assets to their own projects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-assets'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE pr.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
  )
);
CREATE POLICY "Users can update assets in their own projects"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-assets'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE pr.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
  )
);
CREATE POLICY "Users can delete assets in their own projects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-assets'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE pr.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
  )
);

-- 9. Gate public visibility behind a successful deployment
CREATE OR REPLACE FUNCTION public.enforce_public_requires_deployment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.visibility = 'public' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.deployments d
      WHERE d.project_id = NEW.id
        AND d.status IN ('success', 'ready', 'deployed')
        AND d.url IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Project must have a successful deployment before being made public.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_public_requires_deployment_trigger ON public.projects;
CREATE TRIGGER enforce_public_requires_deployment_trigger
BEFORE INSERT OR UPDATE OF visibility ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_public_requires_deployment();

-- 10. Auto-revert existing public projects without successful deployment to private
UPDATE public.projects p
SET visibility = 'private'
WHERE visibility = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM public.deployments d
    WHERE d.project_id = p.id
      AND d.status IN ('success', 'ready', 'deployed')
      AND d.url IS NOT NULL
  );
