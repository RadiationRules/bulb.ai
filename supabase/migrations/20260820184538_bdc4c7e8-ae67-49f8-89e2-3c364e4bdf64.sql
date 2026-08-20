ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deploy_target text NOT NULL DEFAULT 'bulbai';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS site_slug text;
CREATE UNIQUE INDEX IF NOT EXISTS projects_site_slug_key ON public.projects (site_slug) WHERE site_slug IS NOT NULL;
ALTER TABLE public.deployments ADD COLUMN IF NOT EXISTS target text NOT NULL DEFAULT 'bulbai';