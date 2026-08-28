CREATE OR REPLACE FUNCTION public.enforce_public_requires_deployment()
RETURNS trigger
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
    ) AND NOT EXISTS (
      SELECT 1 FROM public.project_files f
      WHERE f.project_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Add at least one file (or deploy the project) before making it public.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;