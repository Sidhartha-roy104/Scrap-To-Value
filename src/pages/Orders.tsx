import { Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import SellerOrders from '@/pages/SellerOrders';
import BuyerOrders from '@/pages/BuyerOrders';

export default function Orders() {
  const { role, isLoading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <div className="container-main py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role === 'seller') {
    return <SellerOrders />;
  }

  return <BuyerOrders />;
}

