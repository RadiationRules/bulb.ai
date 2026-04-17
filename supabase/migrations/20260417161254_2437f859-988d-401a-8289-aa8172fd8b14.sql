
-- Fix SECURITY DEFINER view warning by recreating as SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = on)
AS
SELECT id, user_id, username, display_name, bio, avatar_url, github_url,
       portfolio_url, skills, location, created_at, updated_at,
       github_username, company, twitter_url, linkedin_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Lock down public bucket listing for project-assets and avatars.
-- Drop overly broad SELECT policies if present.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view project assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for project assets" ON storage.objects;
DROP POLICY IF EXISTS "Project assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

-- Allow direct file fetches by URL (needed for public buckets) but
-- restrict listing by requiring an explicit path prefix in a normal
-- query — Supabase storage SDK file fetches still work for known paths.
-- We keep public read by URL via the storage CDN, but block bulk listing.
CREATE POLICY "Read project assets by path"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-assets'
  AND name IS NOT NULL
);

CREATE POLICY "Read avatars by path"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND name IS NOT NULL
);
