import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Check, Zap, Crown, Rocket, Sparkles, Loader2 } from 'lucide-react';

// Stripe price IDs
const STRIPE_PRICES = {
  pro: {
    monthly: 'price_1TMsFMA2xSOh83x3aDIA5RVc',
    yearly: 'price_1TMsK8A2xSOh83x36107tz63',
    product_id: 'prod_ULZO8mRtcgOhdT',
  },
  business: {
    monthly: 'price_1TMsGOA2xSOh83x3ZFkyZWeu',
    yearly: 'price_1TMsKKA2xSOh83x3tNef0edM',
    product_id: 'prod_ULZPr5kVTJHeNr',
  },
};

const tiers = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Get started with BulbAI basics',
    icon: Zap,
    color: 'from-muted to-muted/80',
    borderColor: 'border-border',
    badge: null,
    features: [
      '100 AI credits/day (resets midnight UTC)',
      'Free-tier model when credits run out',
      '3 public projects',
      '1 private project',
      'Community support',
      'Basic code generation',
      'Standard deployment',
    ],
    cta: 'Current Plan',
    ctaVariant: 'outline' as const,
    disabled: true,
    tier: 'free' as const,
  },
  {
    name: 'Pro',
    price: { monthly: 19, yearly: 190 },
    description: 'For serious developers who ship fast',
    icon: Crown,
    color: 'from-amber-500/20 to-yellow-500/20',
    borderColor: 'border-amber-500/50',
    badge: 'Most Popular',
    features: [
      '500 AI credits/day (resets midnight UTC)',
      'Premium Gemini 2.5 Pro model',
      'Unlimited public projects',
      '20 private projects',
      'Priority support',
      'Advanced code generation & refactoring',
      'Custom domains',
      'Collaboration (up to 5 users)',
      'Version history',
      'Code review AI',
    ],
    cta: 'Upgrade to Pro',
    ctaVariant: 'default' as const,
    disabled: false,
    tier: 'pro' as const,
  },
  {
    name: 'Business',
    price: { monthly: 49, yearly: 490 },
    description: 'For teams building at scale',
    icon: Rocket,
    color: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/50',
    badge: 'Best Value',
    features: [
      'Unlimited AI credits',
      'All Pro features included',
      'Unlimited projects',
      'Unlimited collaborators',
      'SSO & team management',
      'Dedicated support',
      'Custom integrations',
      'Analytics dashboard',
      'Priority deployment queue',
      'White-label option',
    ],
    cta: 'Upgrade to Business',
    ctaVariant: 'default' as const,
    disabled: false,
    tier: 'business' as const,
  },
];

const faqs = [
  { q: 'How do credits work?', a: 'You get a daily credit allowance that resets at midnight UTC. Each AI interaction uses 1 credit. When credits run out on the Free plan, you switch to a lighter model automatically.' },
  { q: 'Can I cancel anytime?', a: 'Yes! Cancel your subscription anytime from your billing portal. You keep access until the end of your billing period.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, debit cards, and Apple Pay / Google Pay through Stripe.' },
  { q: 'Do referral credits carry over?', a: 'Yes, bonus credits from referrals are permanent and stack on top of your daily allowance.' },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: '🎉 Subscription activated!', description: 'Welcome to your new plan.' });
    }
  }, [searchParams]);

  // Check subscription on load
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!error && data) setSubscription(data);
      } catch {}
    };
    check();
  }, [user]);

  const handleSubscribe = async (tier: 'pro' | 'business') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setLoadingTier(tier);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const priceId = isYearly ? STRIPE_PRICES[tier].yearly : STRIPE_PRICES[tier].monthly;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to start checkout', variant: 'destructive' });
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!error && data?.url) window.open(data.url, '_blank');
    } catch {}
  };

  const isCurrentPlan = (tier: string) => {
    if (!subscription?.subscribed) return tier === 'free';
    if (subscription.product_id === STRIPE_PRICES.pro.product_id) return tier === 'pro';
    if (subscription.product_id === STRIPE_PRICES.business.product_id) return tier === 'business';
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-28 pb-20">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <Badge className="mb-4 bg-amber-500/20 text-amber-500 border-amber-500/30">
            <Sparkles className="w-3 h-3 mr-1" /> Plans & Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose your <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">plan</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free, upgrade when you need more power. All plans include core BulbAI features.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>Yearly</span>
            {isYearly && (
              <Badge variant="outline" className="text-green-500 border-green-500/30 animate-fade-in">Save ~17%</Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          {tiers.map((tier, i) => {
            const Icon = tier.icon;
            const current = isCurrentPlan(tier.tier);
            return (
              <Card
                key={tier.name}
                className={`relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-xl ${tier.borderColor} ${current ? 'ring-2 ring-amber-500' : ''}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {tier.badge && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 px-3 py-1">
                      {tier.badge}
                    </Badge>
                  </div>
                )}
                {current && (
                  <div className="absolute top-0 left-0">
                    <Badge className="rounded-none rounded-br-lg bg-green-500 text-white border-0 px-3 py-1">Your Plan</Badge>
                  </div>
                )}
                <CardHeader className={`bg-gradient-to-br ${tier.color} pb-6`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      ${isYearly ? Math.round(tier.price.yearly / 12) : tier.price.monthly}
                    </span>
                    {tier.price.monthly > 0 && <span className="text-muted-foreground">/mo</span>}
                    {isYearly && tier.price.yearly > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Billed ${tier.price.yearly}/year</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {current ? (
                    subscription?.subscribed ? (
                      <Button variant="outline" className="w-full" onClick={handleManageSubscription}>
                        Manage Subscription
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                    )
                  ) : tier.tier === 'free' ? (
                    <Button variant="outline" className="w-full" disabled>Free Forever</Button>
                  ) : (
                    <Button
                      className={`w-full ${tier.tier === 'pro' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0'}`}
                      onClick={() => handleSubscribe(tier.tier as 'pro' | 'business')}
                      disabled={!!loadingTier}
                    >
                      {loadingTier === tier.tier ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {tier.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.q} className="border-border/50">
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
