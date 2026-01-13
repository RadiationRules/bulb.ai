-- Fix security issues: Restrict permissive RLS policies

-- Fix project_analytics: Only allow users to insert analytics for their own projects or anonymous visitors
DROP POLICY IF EXISTS "Authenticated users can insert analytics" ON project_analytics;
CREATE POLICY "Users can insert analytics for viewable projects"
ON project_analytics
FOR INSERT
WITH CHECK (
  user_id IS NULL OR 
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_analytics.project_id 
    AND (visibility = 'public' OR owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  )
);

-- Fix project_stars: Ensure users can only star as themselves
DROP POLICY IF EXISTS "Authenticated users can star projects" ON project_stars;
CREATE POLICY "Users can star projects as themselves"
ON project_stars
FOR INSERT
WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Ensure users can only delete their own stars
DROP POLICY IF EXISTS "Users can remove their own stars" ON project_stars;
CREATE POLICY "Users can remove their own stars"
ON project_stars
FOR DELETE
USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Fix followers: Users can only follow as themselves
DROP POLICY IF EXISTS "Authenticated users can follow" ON followers;
CREATE POLICY "Users can follow as themselves"
ON followers
FOR INSERT
WITH CHECK (follower_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Users can only unfollow as themselves
DROP POLICY IF EXISTS "Users can unfollow" ON followers;
CREATE POLICY "Users can unfollow themselves"
ON followers
FOR DELETE
USING (follower_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));