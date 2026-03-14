import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Package, Truck, CheckCircle2, Clock, MapPin, 
  IndianRupee, Calendar, ShoppingCart 
} from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatNumber, WasteType } from '@/data/mockData';
import { WasteBadge } from '@/components/WasteBadge';
import { Loader2 } from 'lucide-react';
import { RatingForm } from '@/components/RatingForm';

const STATUS_STEPS = [
  { key: 'Order Placed', icon: ShoppingCart, label: 'Order Placed' },
  { key: 'Processing', icon: Package, label: 'Processing' },
  { key: 'Shipped', icon: Truck, label: 'Shipped' },
  { key: 'Delivered', icon: CheckCircle2, label: 'Delivered' },
];

function getStepIndex(status: string): number {
  if (status === 'Completed' || status === 'Delivered') return 3;
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 1; // default to Processing
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const { transactions, isLoading } = useTransactions();

  const order = useMemo(
    () => transactions.find(t => t.id === orderId && t.buyer_id === user?.id),
    [transactions, orderId, user]
  );

  if (isLoading) {
    return (
      <div className="container-main py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-main py-8 space-y-4 animate-fade-in">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <div className="card-base p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Order not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This order doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const trackingUpdates = order.tracking_updates as Array<{ status: string; timestamp: string; note?: string }> | null;
  const estimatedDelivery = order.estimated_delivery;

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">Order Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Order ID: {order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${
          order.status === 'Completed' || order.status === 'Delivered'
            ? 'bg-success/10 text-success'
            : order.status === 'Processing'
            ? 'bg-warning/10 text-warning'
            : 'bg-primary/10 text-primary'
        }`}>
          {order.status === 'Completed' ? 'Delivered' : order.status}
        </span>
      </div>

      {/* Timeline */}
      <div className="card-base p-6">
        <h3 className="text-base font-semibold text-foreground mb-6">Delivery Progress</h3>
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border mx-10" />
          <div 
            className="absolute top-5 left-0 h-0.5 bg-primary mx-10 transition-all duration-500" 
            style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * (100 - 12)}%` }}
          />
          
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStep;
            const isCurrent = idx === currentStep;
            return (
              <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground'
                } ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Details */}
        <div className="card-base p-6 space-y-4">
          <h3 className="text-base font-semibold text-foreground">Order Details</h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Waste Type</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{order.waste_type}</span>
                  <WasteBadge type={order.waste_type as WasteType} size="sm" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <IndianRupee className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                <span className="text-sm font-medium text-foreground">{formatCurrency(Number(order.amount))}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-success/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <span className="text-sm font-medium text-foreground">{formatNumber(Number(order.quantity))} kg</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-warning/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <span className="text-sm font-medium text-foreground">{formatDate(order.created_at)}</span>
              </div>
            </div>

            {estimatedDelivery && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                  <span className="text-sm font-medium text-foreground">{formatDate(estimatedDelivery)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rating (only for completed orders) */}
        {(order.status === 'Completed' || order.status === 'Delivered') && (
          <RatingForm transactionId={order.id} sellerId={order.seller_id} />
        )}

        {/* Status History */}
        <div className="card-base p-6 space-y-4">
          <h3 className="text-base font-semibold text-foreground">Status History</h3>
          
          {trackingUpdates && trackingUpdates.length > 0 ? (
            <div className="space-y-4">
              {trackingUpdates.map((update, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary mt-1" />
                    {idx < trackingUpdates.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-foreground">{update.status}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(update.timestamp)}</p>
                    {update.note && (
                      <p className="text-xs text-muted-foreground mt-1">{update.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Auto-generated history from order status */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary mt-1" />
                  {currentStep >= 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-foreground">Order Placed</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
              </div>
              
              {currentStep >= 1 && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full mt-1 ${currentStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                    {currentStep >= 2 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-foreground">Processing</p>
                    <p className="text-xs text-muted-foreground">Your order is being prepared</p>
                  </div>
                </div>
              )}

              {currentStep >= 2 && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary mt-1" />
                    {currentStep >= 3 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-foreground">Shipped</p>
                    <p className="text-xs text-muted-foreground">Your order is on its way</p>
                  </div>
                </div>
              )}

              {currentStep >= 3 && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-success mt-1" />
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-foreground">Delivered</p>
                    <p className="text-xs text-muted-foreground">Order completed successfully</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
