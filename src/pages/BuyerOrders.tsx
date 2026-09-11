import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getRequests,
  type CollectionRequest,
  type RequestStatus,
} from '@/services/requestService';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Package,
  Search,
  Eye,
  Building2,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Scale,
  IndianRupee,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShoppingBag,
  MapPin,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { WasteBadge } from '@/components/WasteBadge';
import { WasteType, formatCurrency, formatNumber, formatRelativeTime } from '@/data/mockData';
import { Modal } from '@/components/Modal';
import { ListingImage } from '@/components/ListingImage';

type StatusFilter = 'All' | 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled' | 'disputed';

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'All', label: 'All Orders' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'disputed', label: 'Disputed' },
];

export function getStatusBadge(status: RequestStatus) {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending Approval',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: Clock,
      };
    case 'confirmed':
      return {
        label: 'Confirmed',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        icon: CheckCircle2,
      };
    case 'in_transit':
      return {
        label: 'In Transit',
        className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        icon: Truck,
      };
    case 'delivered':
      return {
        label: 'Delivered',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        icon: Package,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        icon: XCircle,
      };
    case 'disputed':
      return {
        label: 'Disputed',
        className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        icon: AlertTriangle,
      };
    default:
      return {
        label: status,
        className: 'bg-secondary text-muted-foreground border-border',
        icon: Clock,
      };
  }
}

// Visual tracking steps
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

export default function BuyerOrders() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<CollectionRequest | null>(null);

  // Fetch buyer requests from backend
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['buyer_requests'],
    queryFn: async () => {
      const res = await getRequests({ limit: 200 });
      return res.data?.requests ?? [];
    },
    staleTime: 1000 * 20, // 20 seconds
  });

  const allRequests = data ?? [];

  // Filter counts
  const pendingCount = useMemo(
    () => allRequests.filter(r => r.status === 'pending').length,
    [allRequests]
  );
  const confirmedCount = useMemo(
    () => allRequests.filter(r => r.status === 'confirmed').length,
    [allRequests]
  );
  const inTransitCount = useMemo(
    () => allRequests.filter(r => r.status === 'in_transit').length,
    [allRequests]
  );
  const deliveredCount = useMemo(
    () => allRequests.filter(r => r.status === 'delivered').length,
    [allRequests]
  );
  const cancelledCount = useMemo(
    () => allRequests.filter(r => r.status === 'cancelled').length,
    [allRequests]
  );
  const disputedCount = useMemo(
    () => allRequests.filter(r => r.status === 'disputed').length,
    [allRequests]
  );

  // Filtered and searched list
  const filteredRequests = useMemo(() => {
    return allRequests.filter(req => {
      // 1. Status Filter
      if (activeFilter !== 'All' && req.status !== activeFilter) {
        return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = req.listing?.title?.toLowerCase().includes(q) ?? false;
        const wasteMatch = req.waste_type?.toLowerCase().includes(q) ?? false;
        const sellerMatch = req.seller?.name?.toLowerCase().includes(q) ?? false;
        const companyMatch = req.seller?.company?.toLowerCase().includes(q) ?? false;
        const idMatch = req.id?.toLowerCase().includes(q) ?? false;
        return titleMatch || wasteMatch || sellerMatch || companyMatch || idMatch;
      }

      return true;
    });
  }, [allRequests, activeFilter, searchQuery]);

  // Keep selectedRequest synced with fresh data if open
  const activeSelectedRequest = useMemo(() => {
    if (!selectedRequest) return null;
    return allRequests.find(r => r.id === selectedRequest.id) || selectedRequest;
  }, [selectedRequest, allRequests]);

  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['buyer_requests'] });
    refetch();
  };

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your scrap purchase requests and live order fulfillment status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Browse Marketplace</span>
          </Link>
        </div>
      </div>

      {/* Quick Status KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="card-base p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
            <p className="text-xl font-bold text-foreground">{allRequests.length}</p>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Pending</p>
            <p className="text-xl font-bold text-foreground">{pendingCount}</p>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Confirmed</p>
            <p className="text-xl font-bold text-foreground">{confirmedCount}</p>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">In Transit</p>
            <p className="text-xl font-bold text-foreground">{inTransitCount}</p>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Delivered</p>
            <p className="text-xl font-bold text-foreground">{deliveredCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Scrollable Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-thin">
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab.key;
            let count = allRequests.length;
            if (tab.key === 'pending') count = pendingCount;
            else if (tab.key === 'confirmed') count = confirmedCount;
            else if (tab.key === 'in_transit') count = inTransitCount;
            else if (tab.key === 'delivered') count = deliveredCount;
            else if (tab.key === 'cancelled') count = cancelledCount;
            else if (tab.key === 'disputed') count = disputedCount;

            // Only show Disputed tab if count > 0 or it is selected
            if (tab.key === 'disputed' && count === 0 && !isActive) return null;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground font-bold'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search scrap, seller, ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="card-base p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your orders...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center space-y-4 border-destructive/20 bg-destructive/5">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Failed to Load Orders</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {(error as Error)?.message || 'An unexpected error occurred while fetching your orders.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card-base p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">No orders found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {searchQuery
                ? `No orders matching "${searchQuery}". Try refining your search query or clear filters.`
                : activeFilter !== 'All'
                ? `You have no orders currently in "${FILTER_TABS.find(t => t.key === activeFilter)?.label}" status.`
                : 'You have not submitted any scrap purchase requests yet.'}
            </p>
          </div>
          {allRequests.length === 0 ? (
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Explore Marketplace</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                setActiveFilter('All');
                setSearchQuery('');
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Order Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredRequests.map(req => {
            const badge = getStatusBadge(req.status);
            const StatusIcon = badge.icon;
            const listingTitle = req.listing?.title || `${req.waste_type} Scrap`;
            const sellerName = req.seller?.name || 'Seller';
            const sellerCompany = req.seller?.company;

            return (
              <div
                key={req.id}
                className="card-base overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow border-border/80 group"
              >
                {/* Card Header with Image & Title */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0 relative">
                      <ListingImage
                        src={req.listing?.image_url}
                        fallbackCategory={req.waste_type}
                        alt={listingTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <WasteBadge type={req.waste_type as WasteType} size="sm" />
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                      <h3
                        className="font-semibold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors"
                        title={listingTitle}
                      >
                        {listingTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        ID: {req.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Pricing and Quantity Highlights */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary/40 border border-border/50 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Requested Qty</p>
                      <p className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatNumber(req.quantity)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rate</p>
                      <p className="font-semibold text-foreground flex items-center gap-0.5 mt-0.5">
                        <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatNumber(req.price_per_kg)}/kg
                      </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Total Order Amount</span>
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(req.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Seller & Meta Info */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/80" />
                      <span className="truncate">
                        Seller: <strong className="text-foreground font-medium">{sellerName}</strong>
                        {sellerCompany ? ` (${sellerCompany})` : ''}
                      </span>
                    </div>

                    {req.listing?.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/80" />
                        <span className="truncate">{req.listing.location}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>Requested: {formatRelativeTime(req.created_at)}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground/70">
                        Updated {formatRelativeTime(req.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 border-t border-border/80 bg-secondary/15 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {req.status === 'pending'
                      ? 'Waiting for seller response'
                      : req.status === 'confirmed'
                      ? 'Seller accepted your order'
                      : req.status === 'in_transit'
                      ? 'Order is on its way'
                      : req.status === 'delivered'
                      ? 'Fulfilled & Delivered'
                      : 'Order finalized'}
                  </span>

                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal with Tracking Timeline */}
      {activeSelectedRequest && (
        <OrderDetailsModal
          request={activeSelectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRefresh={handleManualRefresh}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// Order Details Modal Component
// ----------------------------------------------------
interface OrderDetailsModalProps {
  request: CollectionRequest;
  onClose: () => void;
  onRefresh: () => void;
}

function OrderDetailsModal({ request, onClose, onRefresh }: OrderDetailsModalProps) {
  const badge = getStatusBadge(request.status);
  const StatusIcon = badge.icon;
  const currentStep = getTrackingStepIndex(request.status);

  const listingTitle = request.listing?.title || `${request.waste_type} Scrap`;
  const sellerName = request.seller?.name || 'Seller';
  const sellerCompany = request.seller?.company;
  const sellerEmail = request.seller?.email;
  const sellerPhone = request.seller?.phone;

  return (
    <Modal isOpen={true} onClose={onClose} title="Order Details & Live Tracking" size="lg">
      <div className="space-y-6 pt-1">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-foreground font-semibold">
                ORDER #{request.id.slice(0, 8).toUpperCase()}
              </span>
              <WasteBadge type={request.waste_type as WasteType} size="sm" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{listingTitle}</h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${badge.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              <span>{badge.label}</span>
            </span>
          </div>
        </div>

        {/* Visual Tracking Timeline */}
        <div className="card-base p-5 bg-card/60 border border-border/80 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Order Progress
            </h3>
            {request.estimated_delivery && (
              <span className="text-xs text-muted-foreground">
                Est. Delivery: <strong>{new Date(request.estimated_delivery).toLocaleDateString('en-IN')}</strong>
              </span>
            )}
          </div>

          {request.status === 'cancelled' ? (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Order Cancelled</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This scrap request was cancelled by the seller. No further action is required.
                </p>
              </div>
            </div>
          ) : request.status === 'disputed' ? (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Order in Dispute</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A dispute has been raised for this order and is under review.
                </p>
              </div>
            </div>
          ) : (
            /* Normal 4-step Timeline */
            <div className="relative pt-2 pb-1">
              <div className="grid grid-cols-4 gap-2 relative z-10">
                {TRACKING_STEPS.map((step, idx) => {
                  const isCompleted = currentStep >= idx;
                  const isCurrent = currentStep === idx;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
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
                        className={`text-xs mt-2 font-medium leading-tight ${
                          isCurrent
                            ? 'text-primary font-bold'
                            : isCompleted
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] text-primary/80 font-medium mt-0.5">
                          Current Stage
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Connecting progress bar */}
              <div className="absolute top-7 left-[12%] right-[12%] h-1 bg-border -z-0">
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

        {/* Order Details & Financials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Scrap Listing Information */}
          <div className="card-base p-4 space-y-3 bg-secondary/15">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Listing & Quantity
            </h4>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0">
                <ListingImage
                  src={request.listing?.image_url}
                  fallbackCategory={request.waste_type}
                  alt={listingTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{listingTitle}</p>
                <p className="text-xs text-muted-foreground">Category: {request.waste_type}</p>
                {request.listing?.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{request.listing.location}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested Quantity:</span>
                <span className="font-semibold text-foreground">{formatNumber(request.quantity)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per kg:</span>
                <span className="font-semibold text-foreground">{formatCurrency(request.price_per_kg)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/40 text-sm">
                <span className="font-medium text-foreground">Total Value:</span>
                <span className="font-bold text-primary">{formatCurrency(request.amount)}</span>
              </div>
            </div>
          </div>

          {/* Seller Information */}
          <div className="card-base p-4 space-y-3 bg-secondary/15">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Seller Details
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{sellerName}</p>
                  {sellerCompany && <p className="text-muted-foreground">{sellerCompany}</p>}
                </div>
              </div>

              {sellerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground">{sellerEmail}</span>
                </div>
              )}

              {sellerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground font-mono">{sellerPhone}</span>
                </div>
              )}

              <div className="pt-2 border-t border-border/60 flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Verified Marketplace Seller</span>
              </div>
            </div>
          </div>
        </div>

        {/* Buyer Message if present */}
        {request.buyer_message && (
          <div className="card-base p-4 bg-secondary/15 space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Your Note to Seller
            </h4>
            <p className="text-sm text-foreground italic bg-card p-3 rounded-lg border border-border/50">
              "{request.buyer_message}"
            </p>
          </div>
        )}

        {/* Status History / Audit Log */}
        {request.tracking_updates && request.tracking_updates.length > 0 && (
          <div className="card-base p-4 space-y-3 bg-secondary/15">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Activity & Status History
            </h4>
            <div className="space-y-2">
              {request.tracking_updates.map((update, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {update.note || `Status marked as ${update.status}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(update.timestamp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Created on {new Date(request.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onRefresh();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Status
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
