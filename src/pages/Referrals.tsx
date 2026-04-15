import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BulbIcon } from '@/components/BulbIcon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Gift, Users, Zap, Check, ExternalLink } from 'lucide-react';

interface Referral {
  id: string;
  status: string;
  created_at: string;
  reward_granted_at: string | null;
  referred_user: { username: string; display_name: string | null } | null;
}

export default function Referrals() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [credits, setCredits] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState('');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!profile) return;
    
    // Get referral code from profile
    const { data: p } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('user_id', user!.id)
      .single();
    if (p) setReferralCode(p.referral_code);

    // Get referrals I made
    const { data: refs } = await supabase
      .from('referrals')
      .select('id, status, created_at, reward_granted_at, referred_user_id')
      .eq('referrer_user_id', profile.id);
    
    if (refs) {
      const enriched = await Promise.all(refs.map(async (r: any) => {
        const { data: rp } = await supabase.from('profiles').select('username, display_name').eq('id', r.referred_user_id).single();
        return { ...r, referred_user: rp };
      }));
      setReferrals(enriched);
    }

    // Get credit summary
    const { data: cs } = await supabase.rpc('get_my_credit_summary');
    if (cs) setCredits(cs);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyCode = async () => {
    if (!applyCode.trim()) return;
    const { data } = await supabase.rpc('apply_referral_code', { _referral_code: applyCode.trim() });
    const result = data as any;
    toast({ title: result?.success ? '✅ Success' : '❌ Error', description: result?.message || 'Something went wrong' });
    if (result?.success) { setApplyCode(''); loadData(); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-28 text-center">
          <p className="text-muted-foreground">Please sign in to view your referral dashboard.</p>
          <Button className="mt-4" onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  const totalEarned = referrals.filter(r => r.reward_granted_at).length * 100;
  const pendingRefs = referrals.filter(r => !r.reward_granted_at).length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />
      </div>
      <div className="relative z-10">
        <Navigation />
        <div className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
          <div className="text-center mb-10 animate-fade-in">
            <Gift className="w-14 h-14 mx-auto mb-4 text-amber-500" />
            <h1 className="text-4xl font-bold mb-2">Referral Program</h1>
            <p className="text-muted-foreground">Share BulbAI and earn 100 bonus credits per referral</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{referrals.length}</p>
                <p className="text-xs text-muted-foreground">Invited</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Zap className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="text-3xl font-bold">{totalEarned}</p>
                <p className="text-xs text-muted-foreground">Credits Earned</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Gift className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold">{pendingRefs}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
          </div>

          {/* Referral Link */}
          <Card className="mb-8 border-amber-500/30 animate-fade-in">
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>Share this link. When someone signs up and deploys a live project, you get 100 credits!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/auth?ref=${referralCode}`}
                  className="font-mono text-sm"
                />
                <Button onClick={copyLink} className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shrink-0">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Your code: <span className="font-mono font-bold">{referralCode}</span></p>
            </CardContent>
          </Card>

          {/* Apply a code */}
          <Card className="mb-8 animate-fade-in">
            <CardHeader>
              <CardTitle>Have a Referral Code?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={applyCode}
                  onChange={e => setApplyCode(e.target.value)}
                  placeholder="Enter referral code"
                />
                <Button onClick={handleApplyCode} variant="outline">Apply</Button>
              </div>
            </CardContent>
          </Card>

          {/* Invited Users */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Invited Users</CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No referrals yet. Share your link to get started!</p>
              ) : (
                <div className="space-y-3">
                  {referrals.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{r.referred_user?.display_name || r.referred_user?.username || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={r.reward_granted_at ? 'default' : 'secondary'}>
                        {r.reward_granted_at ? '✅ +100 credits' : '⏳ Pending deployment'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
