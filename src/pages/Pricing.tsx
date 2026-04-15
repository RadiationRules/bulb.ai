import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { BulbIcon } from '@/components/BulbIcon';
import { useAuth } from '@/hooks/useAuth';
import { Check, Zap, Crown, Rocket, Star, Sparkles } from 'lucide-react';

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
      'Version history (30 days)',
      'Remove BulbAI badge',
    ],
    cta: 'Upgrade to Pro',
    ctaVariant: 'default' as const,
    disabled: false,
  },
  {
    name: 'Business',
    price: { monthly: 49, yearly: 490 },
    description: 'For teams building at scale',
    icon: Rocket,
    color: 'from-purple-500/20 to-indigo-500/20',
    borderColor: 'border-purple-500/50',
    badge: 'Best Value',
    features: [
      'Unlimited AI credits',
      'Premium Gemini 2.5 Pro model',
      'Unlimited projects (public & private)',
      'Dedicated priority support',
      'Advanced code generation & refactoring',
      'Custom domains + SSL',
      'Unlimited collaboration',
      'Version history (unlimited)',
      'Remove BulbAI badge',
      'SSO & team management',
      'Analytics dashboard',
      'API access',
    ],
    cta: 'Upgrade to Business',
    ctaVariant: 'default' as const,
    disabled: false,
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />
        <div className="grid-background" />
      </div>
      <div className="relative z-10">
        <Navigation />

        <section className="pt-28 pb-16">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-4 animate-fade-in">
              <BulbIcon className="w-12 h-12" animated />
              <h1 className="text-4xl lg:text-6xl font-bold">
                <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                  Pricing
                </span>
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 animate-fade-in">
              Choose the plan that fits your workflow. Upgrade or downgrade anytime.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-12 animate-fade-in">
              <span className={`text-sm font-medium ${!yearly ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
              <Switch checked={yearly} onCheckedChange={setYearly} />
              <span className={`text-sm font-medium ${yearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Yearly <Badge variant="secondary" className="ml-1 text-xs bg-green-500/20 text-green-400 border-green-500/30">Save 17%</Badge>
              </span>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {tiers.map((tier, i) => (
                <Card
                  key={tier.name}
                  className={`relative overflow-hidden bg-gradient-to-br ${tier.color} ${tier.borderColor} border-2 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl animate-fade-in`}
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  {tier.badge && (
                    <div className="absolute top-0 right-0">
                      <Badge className="rounded-none rounded-bl-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 px-3 py-1 text-xs font-bold">
                        <Star className="w-3 h-3 mr-1 inline" />
                        {tier.badge}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-4 pt-8">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 flex items-center justify-center">
                      <tier.icon className="w-7 h-7 text-amber-500" />
                    </div>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-5xl font-bold text-foreground">
                        ${yearly ? tier.price.yearly : tier.price.monthly}
                      </span>
                      {tier.price.monthly > 0 && (
                        <span className="text-muted-foreground ml-1">/{yearly ? 'year' : 'month'}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-8">
                    <Button
                      variant={tier.ctaVariant}
                      className={`w-full mb-4 ${!tier.disabled ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0 shadow-lg shadow-amber-500/20' : ''}`}
                      disabled={tier.disabled}
                      onClick={() => !user ? navigate('/auth') : null}
                    >
                      {tier.cta}
                    </Button>
                    {tier.features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm text-left">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* FAQ */}
            <div className="mt-20 max-w-2xl mx-auto text-left">
              <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
              {[
                { q: 'How do credits work?', a: 'You get a daily credit allowance that resets at midnight UTC. Each AI message uses 1 credit. When credits run out, you can still chat using our free-tier model.' },
                { q: 'Can I switch plans?', a: 'Yes! You can upgrade or downgrade at any time. Changes take effect immediately.' },
                { q: 'What happens to my projects if I downgrade?', a: 'Your projects stay safe. You may lose access to premium features but no data is deleted.' },
                { q: 'How does the referral program work?', a: 'Share your referral link. When someone signs up and deploys a live project, you both earn 100 bonus credits!' },
              ].map((faq) => (
                <div key={faq.q} className="mb-6 p-4 rounded-xl bg-card/50 border border-border/50">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-border/50 py-8">
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>&copy; 2026 BulbAI. Building the future of development.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
