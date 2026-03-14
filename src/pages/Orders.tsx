import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, ArrowRight, Truck, Loader2 } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { formatCurrency, formatNumber, WasteType } from '@/data/mockData';
import { WasteBadge } from '@/components/WasteBadge';
import SellerOrders from '@/pages/SellerOrders';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function Orders() {
  const { user } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const { transactions, isLoading } = useTransactions();

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

function BuyerOrders() {
  const { user } = useAuth();
  const { transactions, isLoading } = useTransactions();

  const myOrders = useMemo(
    () => transactions.filter(t => t.buyer_id === user?.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [transactions, user]
  );

  if (isLoading) {
    return (
      <div className="container-main py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Orders</h1>
        <p className="text-muted-foreground mt-1">Track and manage your purchases</p>
      </div>

      {myOrders.length === 0 ? (
        <div className="card-base p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">No orders yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Browse the marketplace to purchase waste materials.</p>
          <Link to="/marketplace" className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:underline">
            Go to Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myOrders.map(order => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="card-base p-4 flex items-center gap-4 hover:shadow-md transition-all duration-200 group"
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                {order.status === 'Completed' ? (
                  <Package className="h-6 w-6 text-success" />
                ) : (
                  <Truck className="h-6 w-6 text-accent" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{order.waste_type}</span>
                  <WasteBadge type={order.waste_type as WasteType} size="sm" />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatNumber(Number(order.quantity))} kg</span>
                  <span>•</span>
                  <span>{formatDate(order.created_at)}</span>
                  <span>•</span>
                  <span>ID: {order.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(order.amount))}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  order.status === 'Completed' ? 'bg-success/10 text-success' :
                  order.status === 'Processing' ? 'bg-warning/10 text-warning' :
                  'bg-primary/10 text-primary'
                }`}>
                  {order.status === 'Completed' ? 'Delivered' : order.status}
                </span>
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
