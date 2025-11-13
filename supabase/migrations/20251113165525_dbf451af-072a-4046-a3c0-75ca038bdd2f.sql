-- Add INSERT policy for user_activities so activities can be logged
CREATE POLICY "Users can create their own activities" ON public.user_activities FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON public.friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON public.friendships(friend_id, status);