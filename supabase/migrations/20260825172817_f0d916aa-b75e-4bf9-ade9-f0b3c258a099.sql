CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username text;
  safe_username text;
  new_profile_id uuid;
BEGIN
  base_username := lower(regexp_replace(
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(COALESCE(NEW.email, 'user'), '@', 1), 'user'),
    '[^a-zA-Z0-9_]+',
    '',
    'g'
  ));

  IF base_username = '' THEN
    base_username := 'user';
  END IF;

  safe_username := base_username;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = safe_username) THEN
    safe_username := left(base_username, 40) || '_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    safe_username,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, 'user'), '@', 1), 'User')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.profiles.display_name)
  RETURNING id INTO new_profile_id;

  INSERT INTO public.user_preferences (user_id)
  VALUES (new_profile_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;