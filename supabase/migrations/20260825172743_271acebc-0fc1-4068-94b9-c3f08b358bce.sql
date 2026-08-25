DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ai_usage_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_usage_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'credit_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_transactions;
  END IF;
END
$$;