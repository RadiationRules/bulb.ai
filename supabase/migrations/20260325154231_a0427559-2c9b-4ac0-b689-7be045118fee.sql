-- Add referral code to profiles for shareable invite links
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT;

UPDATE public.profiles
SET referral_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
WHERE referral_code IS NULL OR referral_code = '';

ALTER TABLE public.profiles
ALTER COLUMN referral_code SET DEFAULT lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

ALTER TABLE public.profiles
ALTER COLUMN referral_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_referral_code_key'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Track bonus credits separately from daily free credits
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'credit_transactions' AND policyname = 'Users can view their own credit transactions'
  ) THEN
    CREATE POLICY "Users can view their own credit transactions"
    ON public.credit_transactions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = credit_transactions.user_id
          AND profiles.user_id = auth.uid()
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at
ON public.credit_transactions(user_id, created_at DESC);

-- Log AI usage to compute daily-resetting credits at midnight UTC
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_tier TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,
  request_kind TEXT NOT NULL DEFAULT 'chat',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_usage_events' AND policyname = 'Users can view their own ai usage events'
  ) THEN
    CREATE POLICY "Users can view their own ai usage events"
    ON public.ai_usage_events
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = ai_usage_events.user_id
          AND profiles.user_id = auth.uid()
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_id_created_at
ON public.ai_usage_events(user_id, created_at DESC);

-- Store referral relationships and reward state
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  qualifying_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  reward_granted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT referrals_referrer_not_self CHECK (referrer_user_id <> referred_user_id),
  CONSTRAINT referrals_referred_user_unique UNIQUE (referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referrals' AND policyname = 'Users can view their own referrals'
  ) THEN
    CREATE POLICY "Users can view their own referrals"
    ON public.referrals
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE (profiles.id = referrals.referrer_user_id OR profiles.id = referrals.referred_user_id)
          AND profiles.user_id = auth.uid()
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user_id ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- Keep updated_at fresh on referrals
DROP TRIGGER IF EXISTS update_referrals_updated_at ON public.referrals;
CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: claim a referral code for the current authenticated user
CREATE OR REPLACE FUNCTION public.apply_referral_code(_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  referrer_profile_id UUID;
  existing_referral_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT id INTO current_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF current_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profile not found');
  END IF;

  SELECT id INTO existing_referral_id
  FROM public.referrals
  WHERE referred_user_id = current_profile_id;

  IF existing_referral_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Referral already applied');
  END IF;

  SELECT id INTO referrer_profile_id
  FROM public.profiles
  WHERE referral_code = lower(trim(_referral_code));

  IF referrer_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Referral code not found');
  END IF;

  IF referrer_profile_id = current_profile_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'You cannot refer yourself');
  END IF;

  INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, status)
  VALUES (referrer_profile_id, current_profile_id, lower(trim(_referral_code)), 'pending');

  RETURN jsonb_build_object('success', true, 'message', 'Referral applied');
END;
$$;

-- Helper: reward referrer once the referred user deploys a live project
CREATE OR REPLACE FUNCTION public.award_referral_bonus_for_project(_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_owner_id UUID;
  project_live_url TEXT;
  referral_record public.referrals%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT owner_id, preview_url
  INTO project_owner_id, project_live_url
  FROM public.projects
  WHERE id = _project_id;

  IF project_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Project not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = project_owner_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized for this project');
  END IF;

  IF project_live_url IS NULL OR project_live_url = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Project is not live yet');
  END IF;

  SELECT * INTO referral_record
  FROM public.referrals
  WHERE referred_user_id = project_owner_id
    AND reward_granted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF referral_record.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'No pending referral reward');
  END IF;

  UPDATE public.referrals
  SET status = 'rewarded',
      qualifying_project_id = _project_id,
      reward_granted_at = now(),
      updated_at = now()
  WHERE id = referral_record.id;

  INSERT INTO public.credit_transactions (user_id, amount, source, description, metadata)
  VALUES (
    referral_record.referrer_user_id,
    100,
    'referral_bonus',
    'Referral bonus for first live deployment',
    jsonb_build_object('project_id', _project_id, 'referred_user_id', project_owner_id)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Referral bonus awarded');
END;
$$;

-- Helper: summarize current user credits with midnight UTC reset
CREATE OR REPLACE FUNCTION public.get_my_credit_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  utc_start TIMESTAMP WITH TIME ZONE;
  utc_end TIMESTAMP WITH TIME ZONE;
  daily_limit INTEGER := 100;
  daily_used INTEGER := 0;
  bonus_balance INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'daily_limit', daily_limit,
      'daily_used', 0,
      'daily_remaining', daily_limit,
      'bonus_balance', 0,
      'total_available', daily_limit,
      'resets_at', date_trunc('day', timezone('UTC', now())) + interval '1 day'
    );
  END IF;

  SELECT id INTO current_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  utc_start := date_trunc('day', timezone('UTC', now()));
  utc_end := utc_start + interval '1 day';

  IF current_profile_id IS NOT NULL THEN
    SELECT COALESCE(SUM(credits_used), 0)
    INTO daily_used
    FROM public.ai_usage_events
    WHERE user_id = current_profile_id
      AND created_at >= utc_start
      AND created_at < utc_end
      AND model_tier = 'premium';

    SELECT COALESCE(SUM(amount), 0)
    INTO bonus_balance
    FROM public.credit_transactions
    WHERE user_id = current_profile_id;
  END IF;

  RETURN jsonb_build_object(
    'daily_limit', daily_limit,
    'daily_used', daily_used,
    'daily_remaining', GREATEST(daily_limit - daily_used, 0),
    'bonus_balance', bonus_balance,
    'total_available', GREATEST(daily_limit - daily_used, 0) + bonus_balance,
    'resets_at', utc_end
  );
END;
$$;