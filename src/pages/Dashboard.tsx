import { useUserRole } from '@/hooks/useUserRole';
import { SellerDashboard } from '@/components/SellerDashboard';
import { BuyerDashboard } from '@/components/BuyerDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="container-main py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role === 'seller') {
    return <SellerDashboard />;
  }

  // Default to buyer dashboard (also for users without a role yet)
  return <BuyerDashboard />;
}
