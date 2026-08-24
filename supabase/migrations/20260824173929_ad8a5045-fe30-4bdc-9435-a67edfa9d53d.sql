-- Replace privileged view with a normal, access-rule respecting view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT id, user_id, username, display_name, bio, avatar_url, skills, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Row access: profiles are discoverable, but only through safe columns (column grants below)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Basic profile info is viewable by signed-in users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Basic profile info is viewable for public browsing"
ON public.profiles FOR SELECT TO anon
USING (true);

-- Column-level restriction: private fields are not selectable by app roles
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (id, user_id, username, display_name, bio, avatar_url, skills, created_at, updated_at)
ON public.profiles TO anon, authenticated;

-- Owner access to their own full profile (including private fields)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;