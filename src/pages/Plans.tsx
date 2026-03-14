import { useState } from 'react';
import { Check, Star, Zap, Crown, Loader2, CreditCard, ShieldCheck } from 'lucide-react';
import { useToastNotification } from '@/components/ToastNotification';

interface Plan {
  id: string;
  name: string;
  icon: typeof Star;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Starter',
    icon: Star,
    price: 0,
    period: 'Forever free',
    description: 'Get started with basic waste trading features.',
    features: [
      'Up to 5 active listings',
      'Basic analytics dashboard',
      'Community marketplace access',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    icon: Zap,
    price: 999,
    period: '/month',
    description: 'For growing businesses with advanced needs.',
    features: [
      'Unlimited active listings',
      'Advanced analytics & reports',
      'Priority marketplace placement',
      'Green Score insights',
      'Priority email & chat support',
      'Export data as CSV',
    ],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Crown,
    price: 4999,
    period: '/month',
    description: 'Full-featured plan for large-scale operations.',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom API integrations',
      'Bulk listing management',
      'Advanced carbon tracking',
      'Custom reports & dashboards',
      'SLA-backed support',
    ],
    badge: 'Best Value',
  },
];

export default function Plans() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToast } = useToastNotification();

  const handleSubscribe = async (plan: Plan) => {
    if (plan.id === 'free') {
      addToast({ type: 'info', title: 'Free Plan', message: "You're already on the free plan!" });
      return;
    }

    setSelectedPlan(plan.id);
    setIsProcessing(true);

    // Check if Razorpay is loaded
    if (!(window as any).Razorpay) {
      addToast({
        type: 'error',
        title: 'Payment Unavailable',
        message: 'Razorpay is not configured yet. Please add your API keys to enable subscriptions.',
      });
      setIsProcessing(false);
      setSelectedPlan(null);
      return;
    }

    try {
      // TODO: Call edge function to create Razorpay subscription
      // const { data } = await supabase.functions.invoke('create-razorpay-subscription', {
      //   body: { planId: plan.id }
      // });

      const options = {
        key: '', // Will be set from env/edge function
        amount: plan.price * 100,
        currency: 'INR',
        name: 'Scrap to Value',
        description: `${plan.name} Plan - Monthly Subscription`,
        handler: (response: any) => {
          addToast({
            type: 'success',
            title: 'Subscription Activated!',
            message: `You're now on the ${plan.name} plan. Enjoy the premium features!`,
          });
          setSelectedPlan(null);
        },
        theme: { color: '#0d9668' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => {
        addToast({ type: 'error', title: 'Payment Failed', message: 'Subscription payment failed. Please try again.' });
      });
      rzp.open();
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not initiate subscription.' });
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="container-main py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Scale your waste trading business with the right plan. Upgrade anytime.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative card-base p-6 flex flex-col transition-all duration-300 ${
                plan.highlight
                  ? 'ring-2 ring-primary shadow-lg scale-[1.02]'
                  : 'hover:shadow-md'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
                  plan.highlight ? 'bg-primary/10' : 'bg-secondary'
                }`}>
                  <Icon className={`h-6 w-6 ${plan.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  {plan.price > 0 && <span className="text-lg text-muted-foreground">₹</span>}
                  <span className="text-4xl font-extrabold text-foreground">
                    {plan.price === 0 ? 'Free' : plan.price.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isProcessing && isSelected}
                className={`w-full gap-2 ${
                  plan.highlight ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {isProcessing && isSelected ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
                ) : plan.price === 0 ? (
                  'Current Plan'
                ) : (
                  <><CreditCard className="h-4 w-4" />Subscribe</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Security Footer */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span>All payments secured by Razorpay. Cancel anytime.</span>
      </div>
    </div>
  );
}
