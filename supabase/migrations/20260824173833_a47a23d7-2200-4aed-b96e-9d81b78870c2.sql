-- 1. Function execution hardening
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_public_requires_deployment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_credit_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_credit_summary() TO authenticated;

REVOKE ALL ON FUNCTION public.apply_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;

REVOKE ALL ON FUNCTION public.award_referral_bonus_for_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_referral_bonus_for_project(uuid) TO authenticated;

-- 2. Remove blanket table privileges
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.ai_usage_events, public.chat_messages, public.collaboration_sessions,
  public.collaborations, public.credit_transactions, public.deployments,
  public.followers, public.friendships, public.notifications, public.profiles,
  public.project_analytics, public.project_commits, public.project_env_vars,
  public.project_files, public.project_packages, public.project_snapshots,
  public.project_stars, public.projects, public.referrals, public.user_activities,
  public.user_preferences, public.workspace_sessions
TO authenticated;

GRANT SELECT ON public.user_roles TO authenticated;

GRANT SELECT ON public.projects, public.project_files, public.project_stars, public.followers TO anon;
GRANT INSERT ON public.project_analytics TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 3. Profiles: no more full-table exposure to every signed-in user
DROP POLICY IF EXISTS "Authenticated users can view public profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Safe, limited public profile projection
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT id, user_id, username, display_name, bio, avatar_url, skills, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4. Storage: project-assets no longer world readable
DROP POLICY IF EXISTS "Read project assets by path" ON storage.objects;
DROP POLICY IF EXISTS "Project assets are publicly accessible" ON storage.objects;

CREATE POLICY "Read project assets for owners and public projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-assets'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    LEFT JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE (storage.foldername(objects.name))[1] = p.id::text
      AND (p.visibility = 'public' OR pr.user_id = auth.uid())
  )
);