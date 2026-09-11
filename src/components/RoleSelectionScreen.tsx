import { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, ShoppingCart, Loader2, ArrowRight } from 'lucide-react';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { useToastNotification } from '@/components/ToastNotification';

export function RoleSelectionScreen() {
  const [selected, setSelected] = useState<AppRole>('buyer');
  const { setRole, isSettingRole } = useUserRole();
  const { addToast } = useToastNotification();

  const handleSubmit = async () => {
    try {
      await setRole(selected);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set role.';
      // In Phase 2, setRole is stubbed for REST users (role is set at registration).
      // Only legacy Supabase users without a role would reach this screen.
      if (message.includes('Phase 2')) {
        addToast({ type: 'error', title: 'Please register again to set your role.' });
      } else {
        addToast({ type: 'error', title: 'Failed to set role. Please try again.' });
      }
    }
  };

  const roles = [
    { value: 'seller' as AppRole, icon: Store, label: 'Sell Waste', desc: 'List & sell your industrial waste' },
    { value: 'buyer' as AppRole, icon: ShoppingCart, label: 'Buy Waste', desc: 'Purchase recycled materials' },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <img src="/logo.png" alt="Rubbish Revamp" className="h-12 w-12 rounded-xl mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">How will you use Rubbish Revamp?</h1>
        <p className="text-muted-foreground mb-8">Choose your role to get started</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {roles.map(({ value, icon: Icon, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
                selected === value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Icon className={`h-7 w-7 ${selected === value ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${selected === value ? 'text-primary' : 'text-foreground'}`}>{label}</span>
              <span className="text-xs text-muted-foreground text-center">{desc}</span>
            </button>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={isSettingRole} className="btn-primary w-full">
          {isSettingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
        </button>
      </motion.div>
    </div>
  );
}
