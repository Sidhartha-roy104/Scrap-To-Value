import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Recycle, 
  ArrowRight, 
  Leaf, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Zap,
  CheckCircle2,
  MapPin,
  Star,
  ChevronRight
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const stats = [
  { value: '2,500+', label: 'MSMEs Onboarded' },
  { value: '₹12Cr+', label: 'Waste Traded' },
  { value: '850 tons', label: 'CO₂ Saved' },
  { value: '98%', label: 'Satisfaction Rate' },
];

const features = [
  {
    icon: Recycle,
    title: 'Smart Waste Marketplace',
    description: 'List, discover, and trade industrial waste with verified buyers and sellers across Tamil Nadu.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Track revenue, waste diversion rates, and environmental impact with intuitive dashboards.',
  },
  {
    icon: Leaf,
    title: 'Green Score Rating',
    description: 'Earn sustainability badges and climb the leaderboard as you contribute to a circular economy.',
  },
  {
    icon: Shield,
    title: 'Verified Partners',
    description: 'Every recycler is vetted and verified, ensuring safe, compliant, and transparent transactions.',
  },
  {
    icon: TrendingUp,
    title: 'Fair Price Discovery',
    description: 'Market-driven pricing ensures MSMEs get the best value for their industrial waste materials.',
  },
  {
    icon: Zap,
    title: 'Instant Matching',
    description: 'Our platform connects waste generators with the right recyclers automatically based on type and location.',
  },
];

const steps = [
  { step: '01', title: 'List Your Waste', description: 'Describe the type, quantity, and location of your industrial waste in under 2 minutes.' },
  { step: '02', title: 'Get Matched', description: 'Our platform instantly connects you with verified recyclers in your region.' },
  { step: '03', title: 'Complete the Deal', description: 'Agree on price, schedule pickup, and track everything from your dashboard.' },
];

const testimonials = [
  { name: 'Rajesh Kumar', company: 'Kumar Textiles, Erode', quote: 'Scrap to Value helped us monetize our textile waste. We\'ve earned ₹3.2L in just 4 months.', rating: 5 },
  { name: 'Priya Nair', company: 'Nagercoil Coir Industries', quote: 'Finding reliable recyclers used to take weeks. Now it takes minutes. Incredible platform.', rating: 5 },
  { name: 'Suresh Babu', company: 'Trichy Metals', quote: 'Our Green Score went from 42 to 87. The insights dashboard is a game-changer for compliance.', rating: 5 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Scrap to Value" className="h-9 w-9 rounded-xl" />
            <span className="text-lg font-bold text-foreground tracking-tight">Scrap to Value</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/auth" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              Log In
            </Link>
            <Link to="/auth" className="btn-primary text-sm px-5">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUpItem} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Leaf className="h-4 w-4" />
              Powering India's Circular Economy
            </motion.div>
            
            <motion.h1 variants={fadeUpItem} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
              Turn Industrial Waste Into{' '}
              <span className="text-gradient">Revenue</span>
            </motion.h1>
            
            <motion.p variants={fadeUpItem} className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
              The marketplace where Tamil Nadu's MSMEs sell industrial waste to verified recyclers. 
              Better for your business. Better for the planet.
            </motion.p>

            <motion.div variants={fadeUpItem} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?role=seller" className="btn-primary text-base px-8 py-3 shadow-md">
                Start Selling Waste
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/marketplace" className="btn-outline text-base px-8 py-3">
                Browse Marketplace
              </Link>
            </motion.div>

            <motion.div variants={fadeUpItem} className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Free to list
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Verified recyclers
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                No hidden fees
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                Across Tamil Nadu
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={scaleIn} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums tracking-tight">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
              Everything MSMEs Need to Go Green
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform to manage, sell, and track your industrial waste — built specifically for Indian manufacturers.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeUpItem} className="card-base p-6 group">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
              From Waste to Revenue in 3 Steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Getting started takes less than 5 minutes. No paperwork, no hassle.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            {steps.map((s, i) => (
              <motion.div key={s.step} variants={fadeUpItem} className="relative text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary text-primary-foreground text-xl font-bold mb-5 shadow-sm">
                  {s.step}
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-7 -right-4 lg:-right-6 h-5 w-5 text-muted-foreground/40" />
                )}
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
              Trusted by MSMEs Across Tamil Nadu
            </h2>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUpItem} className="card-base p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-5">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.company}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 lg:py-28 bg-primary relative overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUp}
      >
        <div className="absolute inset-0 -z-0">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground tracking-tight mb-4">
            Ready to Turn Your Waste Into Wealth?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join 2,500+ MSMEs already using Scrap to Value to sell waste, save the environment, and boost their bottom line.
          </p>
          <Link 
            to="/auth" 
            className="inline-flex items-center justify-center rounded-lg bg-card text-foreground px-8 py-3 text-base font-medium shadow-md hover:bg-card/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started — It's Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Scrap to Value" className="h-8 w-8 rounded-lg" />
                <span className="font-bold text-foreground">Scrap to Value</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                India's leading industrial waste marketplace for MSMEs.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Platform</h4>
              <ul className="space-y-2">
                <li><Link to="/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Marketplace</Link></li>
                <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
                <li><Link to="/analytics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Analytics</Link></li>
                <li><Link to="/green-score" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Green Score</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-muted-foreground">About Us</span></li>
                <li><span className="text-sm text-muted-foreground">Careers</span></li>
                <li><span className="text-sm text-muted-foreground">Blog</span></li>
                <li><span className="text-sm text-muted-foreground">Contact</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Legal</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-muted-foreground">Privacy Policy</span></li>
                <li><span className="text-sm text-muted-foreground">Terms of Service</span></li>
                <li><span className="text-sm text-muted-foreground">Refund Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2026 Scrap to Value. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Made with 💚 in Tamil Nadu, India</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
