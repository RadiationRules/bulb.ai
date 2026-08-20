import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BulbIcon } from '@/components/BulbIcon';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const readProviderError = () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(window.location.search);
      return (
        hash.get('error_description') ||
        query.get('error_description') ||
        hash.get('error') ||
        query.get('error')
      );
    };

    const run = async () => {
      const providerError = readProviderError();
      if (providerError) {
        setError(decodeURIComponent(providerError.replace(/\+/g, ' ')));
        return;
      }

      // Wait for supabase-js to finish parsing the OAuth response.
      for (let i = 0; i < 25; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          await ensureProfile(session.user.id, session.user.email ?? '', session.user.user_metadata);
          const back = sessionStorage.getItem('bulbai_post_auth_redirect');
          sessionStorage.removeItem('bulbai_post_auth_redirect');
          navigate(back && back !== '/auth' && back !== '/' ? back : '/dashboard', { replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!cancelled) setError('We could not complete the sign-in. Please try again.');
    };

    const ensureProfile = async (userId: string, email: string, metadata: any) => {
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        if (existing) return;
        await supabase.from('profiles').insert({
          user_id: userId,
          display_name: metadata?.full_name || metadata?.name || email.split('@')[0],
          username: (email.split('@')[0] || 'user').toLowerCase(),
          avatar_url: metadata?.avatar_url ?? null,
        } as any);
      } catch (e) {
        console.error('Profile bootstrap failed:', e);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <BulbIcon className="w-14 h-14" animated />
      {error ? (
        <>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Sign-in failed</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <Button onClick={() => navigate('/auth', { replace: true })}>Back to sign in</Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finishing sign-in…
          </div>
          <p className="text-xs text-muted-foreground">Securing your BulbAI session</p>
        </>
      )}
    </div>
  );
}
