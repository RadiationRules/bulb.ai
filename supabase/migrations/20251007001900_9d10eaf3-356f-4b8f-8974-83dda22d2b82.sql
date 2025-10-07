-- Security Fix: Restrict profile visibility to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Security Fix: Add explicit SELECT policy for user_preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = user_preferences.user_id 
  AND profiles.user_id = auth.uid()
));

-- Security Fix: Restrict analytics insertion to authenticated users
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.project_analytics;

CREATE POLICY "Authenticated users can insert analytics" 
ON public.project_analytics
FOR INSERT 
TO authenticated
WITH CHECK (true);