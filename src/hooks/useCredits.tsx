import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreditSummary {
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
  bonus_balance: number;
  total_available: number;
  resets_at: string;
}

/**
 * Real-time credit balance with three refresh triggers:
 * 1. Polling every 15s as a safety net.
 * 2. Custom `bulbai:credits-changed` event dispatched by useChat after each AI call.
 * 3. Postgres realtime subscription on ai_usage_events for the current user.
 */
export const useCredits = () => {
  const [credits, setCredits] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_my_credit_summary');
      if (data) setCredits(data as unknown as CreditSummary);
    } catch (err) {
      console.error('Credit refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    const handler = () => refresh();
    window.addEventListener('bulbai:credits-changed', handler);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!profile) return;
      channel = supabase
        .channel(`credits-${profile.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ai_usage_events', filter: `user_id=eq.${profile.id}` },
          () => refresh()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'credit_transactions', filter: `user_id=eq.${profile.id}` },
          () => refresh()
        )
        .subscribe();
    })();

    return () => {
      clearInterval(interval);
      window.removeEventListener('bulbai:credits-changed', handler);
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { credits, loading, refresh };
};
