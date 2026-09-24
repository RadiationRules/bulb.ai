CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_my_credit_summary()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  current_profile_id UUID;
  utc_start TIMESTAMPTZ;
  utc_end TIMESTAMPTZ;
  daily_limit INTEGER := 100;
  daily_used INTEGER := 0;
  bonus_balance INTEGER := 0;
  sub_plan TEXT := 'free';
BEGIN
  utc_start := date_trunc('day', timezone('UTC', now()));
  utc_end := utc_start + interval '1 day';
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('plan','free','daily_limit',daily_limit,'daily_used',0,'daily_remaining',daily_limit,'bonus_balance',0,'total_available',daily_limit,'resets_at',utc_end);
  END IF;

  SELECT plan INTO sub_plan FROM public.subscriptions
  WHERE user_id = auth.uid() AND status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now());
  sub_plan := COALESCE(sub_plan, 'free');
  daily_limit := CASE sub_plan WHEN 'pro' THEN 500 WHEN 'max' THEN 2000 ELSE 100 END;

  SELECT id INTO current_profile_id FROM public.profiles WHERE user_id = auth.uid();
  IF current_profile_id IS NOT NULL THEN
    SELECT COALESCE(SUM(credits_used),0) INTO daily_used FROM public.ai_usage_events
    WHERE user_id = current_profile_id AND created_at >= utc_start AND created_at < utc_end AND model_tier = 'premium';
    SELECT COALESCE(SUM(amount),0) INTO bonus_balance FROM public.credit_transactions WHERE user_id = current_profile_id;
  END IF;

  RETURN jsonb_build_object('plan',sub_plan,'daily_limit',daily_limit,'daily_used',daily_used,
    'daily_remaining',GREATEST(daily_limit-daily_used,0),'bonus_balance',bonus_balance,
    'total_available',GREATEST(daily_limit-daily_used,0)+bonus_balance,'resets_at',utc_end);
END;
$function$;