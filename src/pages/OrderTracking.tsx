import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  IndianRupee,
  Calendar,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  XCircle,
  AlertTriangle,
  Scale,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getRequestById, type CollectionRequest, type RequestStatus } from '@/services/requestService';
import { formatCurrency, formatNumber, WasteType } from '@/data/mockData';
import { WasteBadge } from '@/components/WasteBadge';
import { getStatusBadge } from '@/pages/BuyerOrders';
import { ListingImage } from '@/components/ListingImage';

const TRACKING_STEPS: { key: RequestStatus; label: string; icon: typeof Clock }[] = [
  { key: 'pending', label: 'Pending Approval', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'in_transit', label: 'In Transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
];

function getTrackingStepIndex(status: RequestStatus): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'confirmed':
      return 1;
    case 'in_transit':
      return 2;
    case 'delivered':
      return 3;
    default:
      return -1;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['order_tracking', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      const res = await getRequestById(orderId);
      return res.data?.request ?? null;
    },
    enabled: !!orderId,
    staleTime: 1000 * 20,
  });

  const order: CollectionRequest | null = data;

  if (isLoading) {
    return (
      <div className="container-main py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container-main py-8 space-y-4 animate-fade-in">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <div className="card-base p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Order not found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This order does not exist, or you do not have permission to view it.
          </p>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const badge = getStatusBadge(order.status);
  const StatusIcon = badge.icon;
  const currentStep = getTrackingStepIndex(order.status);
  const listingTitle = order.listing?.title || `${order.waste_type} Scrap`;

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Order Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Order Reference: <span className="font-mono font-semibold text-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${badge.className}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{badge.label}</span>
          </span>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Visual Tracking Progress Timeline */}
      <div className="card-base p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Order Fulfillment Status
          </h3>
          {order.estimated_delivery && (
            <span className="text-xs text-muted-foreground">
              Est. Delivery: <strong>{formatDate(order.estimated_delivery)}</strong>
            </span>
          )}
        </div>

        {order.status === 'cancelled' ? (
          <div className="p-5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Order Cancelled</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This scrap request was cancelled by the seller. No delivery will take place.
              </p>
            </div>
          </div>
        ) : order.status === 'disputed' ? (
          <div className="p-5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Order in Dispute</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A dispute has been raised for this order and is under review.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative pt-4 pb-2">
            <div className="grid grid-cols-4 gap-2 relative z-10">
              {TRACKING_STEPS.map((step, idx) => {
                const isCompleted = currentStep >= idx;
                const isCurrent = currentStep === idx;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground border-primary shadow-md ring-4 ring-primary/20 scale-105'
                          : isCompleted
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-secondary text-muted-foreground border-border'
                      }`}
                    >
                      {isCompleted && !isCurrent ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <p
                      className={`text-xs mt-2.5 font-medium leading-tight ${
                        isCurrent
                          ? 'text-primary font-bold'
                          : isCompleted
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Connecting progress line */}
            <div className="absolute top-9 left-[12%] right-[12%] h-1 bg-border -z-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                style={{
                  width: `${
                    currentStep <= 0 ? 0 : Math.min(100, (currentStep / (TRACKING_STEPS.length - 1)) * 100)
                  }%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scrap & Order Financial Details */}
        <div className="card-base p-6 space-y-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Order & Scrap Details
          </h3>

          <div className="flex items-start gap-4 pb-4 border-b border-border">
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0">
              <ListingImage
                src={order.listing?.image_url}
                fallbackCategory={order.waste_type}
                alt={listingTitle}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <WasteBadge type={order.waste_type as WasteType} size="sm" />
              </div>
              <h4 className="font-semibold text-foreground text-sm">{listingTitle}</h4>
              {order.listing?.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{order.listing.location}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" /> Requested Quantity:
              </span>
              <span className="font-semibold text-foreground">{formatNumber(order.quantity)} kg</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-muted-foreground" /> Agreed Unit Rate:
              </span>
              <span className="font-semibold text-foreground">{formatCurrency(order.price_per_kg)}/kg</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="font-medium text-foreground">Total Value:</span>
              <span className="text-base font-bold text-primary">{formatCurrency(order.amount)}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Order Placed:
              </span>
              <span>{formatDate(order.created_at)}</span>
            </div>
          </div>

          {order.buyer_message && (
            <div className="mt-4 pt-3 border-t border-border space-y-1">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Note to Seller:
              </p>
              <p className="text-xs text-foreground bg-secondary/40 p-2.5 rounded-lg border border-border/60 italic">
                "{order.buyer_message}"
              </p>
            </div>
          )}
        </div>

        {/* Seller & Status History */}
        <div className="space-y-6">
          {/* Seller Information */}
          <div className="card-base p-6 space-y-3">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Seller Contact Information
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground text-sm">
                  {order.seller?.name || 'Seller'}
                  {order.seller?.company ? ` (${order.seller.company})` : ''}
                </span>
              </div>

              {order.seller?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{order.seller.email}</span>
                </div>
              )}

              {order.seller?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground font-mono">{order.seller.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Activity / Status History */}
          <div className="card-base p-6 space-y-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Status Audit History
            </h3>

            {order.tracking_updates && order.tracking_updates.length > 0 ? (
              <div className="space-y-3">
                {order.tracking_updates.map((update, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1" />
                      {idx < order.tracking_updates.length - 1 && (
                        <div className="w-px h-6 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {update.note || `Status updated to ${update.status}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(update.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Request recorded on {formatDate(order.created_at)} with status "{order.status}".
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
