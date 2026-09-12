import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getRequests, 
  updateRequestStatus, 
  type CollectionRequest, 
  type RequestStatus 
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
  Filter,
  PackageCheck,
} from 'lucide-react';
import { WasteBadge } from '@/components/WasteBadge';
import { WasteType, formatCurrency, formatNumber, formatRelativeTime } from '@/data/mockData';
import { Modal } from '@/components/Modal';
import { useToastNotification } from '@/components/ToastNotification';
import { ListingImage } from '@/components/ListingImage';
import { RaiseDisputeModal } from '@/components/RaiseDisputeModal';

type StatusFilter = 'All' | 'pending' | 'awaiting_payment' | 'confirmed' | 'ready_for_pickup' | 'in_transit' | 'delivered' | 'cancelled' | 'disputed';

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'All', label: 'All Requests' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'awaiting_payment', label: 'Awaiting Payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'disputed', label: 'Disputed' },
];

function getStatusBadge(status: RequestStatus) {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending Approval',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: Clock,
      };
    case 'awaiting_payment':
      return {
        label: 'Awaiting Payment',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: Clock,
      };
    case 'confirmed':
      return {
        label: 'Confirmed',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        icon: CheckCircle2,
      };
    case 'ready_for_pickup':
      return {
        label: 'Ready for Pickup',
        className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        icon: PackageCheck,
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

export default function SellerOrders() {
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();

  const [activeFilter, setActiveFilter] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<CollectionRequest | null>(null);
  const [disputeTargetRequest, setDisputeTargetRequest] = useState<CollectionRequest | null>(null);

  // Confirmation action modals
  const [actionConfirm, setActionConfirm] = useState<{
    type: 'accept' | 'reject' | 'ready_for_pickup' | 'in_transit' | 'delivered';
    request: CollectionRequest;
  } | null>(null);
  const [actionNote, setActionNote] = useState('');

  // 1. Fetch Requests from backend
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['seller_requests'],
    queryFn: async () => {
      const res = await getRequests({ limit: 200 });
      return res.data?.requests ?? [];
    },
    staleTime: 1000 * 20, // 20 seconds
  });

  const allRequests = data ?? [];

  // 2. Status counts for quick dashboard tabs
  const pendingCount = useMemo(
    () => allRequests.filter((r) => r.status === 'pending').length,
    [allRequests]
  );
  const awaitingPaymentCount = useMemo(
    () => allRequests.filter((r) => r.status === 'awaiting_payment').length,
    [allRequests]
  );
  const confirmedCount = useMemo(
    () => allRequests.filter((r) => r.status === 'confirmed').length,
    [allRequests]
  );
  const readyForPickupCount = useMemo(
    () => allRequests.filter((r) => r.status === 'ready_for_pickup').length,
    [allRequests]
  );
  const inTransitCount = useMemo(
    () => allRequests.filter((r) => r.status === 'in_transit').length,
    [allRequests]
  );
  const deliveredCount = useMemo(
    () => allRequests.filter((r) => r.status === 'delivered').length,
    [allRequests]
  );

  // 3. Filtered and searched list
  const filteredRequests = useMemo(() => {
    return allRequests.filter((req) => {
      // Status filter
      if (activeFilter !== 'All' && req.status !== activeFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesBuyer = req.buyer?.name.toLowerCase().includes(q) || req.buyer?.company?.toLowerCase().includes(q);
        const matchesTitle = req.listing?.title.toLowerCase().includes(q);
        const matchesCategory = req.waste_type.toLowerCase().includes(q);
        const matchesId = req.id.toLowerCase().includes(q);
        if (!matchesBuyer && !matchesTitle && !matchesCategory && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [allRequests, activeFilter, searchQuery]);

  // 4. Mutation for updating status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: RequestStatus;
      note?: string;
    }) => {
      const res = await updateRequestStatus(id, { status, note });
      return res.data?.request;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['seller_requests'] });
      if (updated) {
        if (selectedRequest?.id === updated.id) {
          setSelectedRequest(updated);
        }
        let actionWord = 'Updated';
        let detailMessage = `Order #${updated.id.slice(0, 8).toUpperCase()} status is now ${updated.status}.`;
        if (updated.status === 'awaiting_payment') {
          actionWord = 'Accepted';
          detailMessage = `Request for ${updated.quantity}kg of ${updated.waste_type} accepted! Order is now awaiting buyer payment.`;
        } else if (updated.status === 'ready_for_pickup') {
          actionWord = 'Ready for Pickup';
          detailMessage = `Order #${updated.id.slice(0, 8).toUpperCase()} marked ready for pickup.`;
        } else if (updated.status === 'in_transit') {
          actionWord = 'Dispatched';
          detailMessage = `Order #${updated.id.slice(0, 8).toUpperCase()} is now in transit.`;
        } else if (updated.status === 'delivered') {
          actionWord = 'Delivered';
          detailMessage = `Order #${updated.id.slice(0, 8).toUpperCase()} marked delivered! Reserved inventory has been fulfilled.`;
        } else if (updated.status === 'cancelled') {
          actionWord = 'Declined';
          detailMessage = `Request has been declined/cancelled.`;
        }

        addToast({
          type: 'success',
          title: `Order ${actionWord}`,
          message: detailMessage,
        });
      }
      setActionConfirm(null);
      setActionNote('');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update request status';
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: msg,
      });
    },
  });

  const handleConfirmAction = () => {
    if (!actionConfirm) return;
    const { type, request } = actionConfirm;
    let targetStatus: RequestStatus;
    let note = actionNote.trim();

    switch (type) {
      case 'accept':
        targetStatus = 'awaiting_payment';
        note = note || 'Accepted by seller - awaiting buyer payment';
        break;
      case 'reject':
        targetStatus = 'cancelled';
        note = note || 'Declined by seller';
        break;
      case 'ready_for_pickup':
        targetStatus = 'ready_for_pickup';
        note = note || 'Scrap weighed, packed, and ready for pickup';
        break;
      case 'in_transit':
        targetStatus = 'in_transit';
        note = note || 'Scrap dispatched / in transit to buyer';
        break;
      case 'delivered':
        targetStatus = 'delivered';
        note = note || 'Scrap delivery completed and verified';
        break;
      default:
        return;
    }

    updateStatusMutation.mutate({
      id: request.id,
      status: targetStatus,
      note,
    });
  };

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Incoming Scrap Requests
            {pendingCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                {pendingCount} Pending
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and respond to collection requests from buyers for your scrap materials
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="btn-secondary text-xs gap-1.5 h-9"
            title="Refresh requests"
          >
            <Clock className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card-base p-4">
          <span className="text-xs text-muted-foreground block">Total Requests</span>
          <span className="text-xl font-bold text-foreground mt-1 block">
            {allRequests.length}
          </span>
        </div>
        <div className="card-base p-4 border-l-4 border-l-amber-500">
          <span className="text-xs text-muted-foreground block">Pending Review</span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            {pendingCount}
          </span>
        </div>
        <div className="card-base p-4 border-l-4 border-l-orange-500">
          <span className="text-xs text-muted-foreground block">Awaiting Payment</span>
          <span className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1 block">
            {awaitingPaymentCount}
          </span>
        </div>
        <div className="card-base p-4 border-l-4 border-l-blue-500">
          <span className="text-xs text-muted-foreground block">Confirmed</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
            {confirmedCount}
          </span>
        </div>
        <div className="card-base p-4 border-l-4 border-l-indigo-500">
          <span className="text-xs text-muted-foreground block">Ready Pickup</span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
            {readyForPickupCount}
          </span>
        </div>
        <div className="card-base p-4 border-l-4 border-l-emerald-500">
          <span className="text-xs text-muted-foreground block">Delivered</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {deliveredCount}
          </span>
        </div>
      </div>

      {/* Controls: Search and Filter Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by buyer, material, listing title, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base pl-10 text-sm h-10"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count =
              tab.key === 'All'
                ? allRequests.length
                : allRequests.filter((r) => r.status === tab.key).length;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="card-base p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Loading incoming requests...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center bg-destructive/5 border-destructive/20">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h3 className="text-base font-semibold text-foreground">Failed to load requests</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {error instanceof Error ? error.message : 'A network error occurred'}
          </p>
          <button onClick={() => refetch()} className="btn-secondary text-xs">
            Try Again
          </button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card-base p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No requests found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeFilter !== 'All'
              ? `There are no requests with status "${activeFilter}".`
              : 'You have not received any scrap collection requests yet.'}
          </p>
          {activeFilter !== 'All' && (
            <button
              onClick={() => setActiveFilter('All')}
              className="btn-secondary text-xs mt-4"
            >
              Show All Requests
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const statusConfig = getStatusBadge(req.status);
            const StatusIcon = statusConfig.icon;
            const isPending = req.status === 'pending';

            return (
              <div
                key={req.id}
                className={`card-base p-4 transition-all hover:border-border/80 ${
                  isPending ? 'border-l-4 border-l-amber-500 bg-amber-500/[0.02]' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Scrap & Buyer Information */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 relative border border-border/50">
                      <ListingImage
                        src={req.listing?.image_url}
                        alt={req.listing?.title || req.waste_type}
                        containerClassName="w-full h-full"
                        fallbackCategory={req.waste_type}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <WasteBadge type={req.waste_type as WasteType} size="sm" />
                        <span className="text-xs text-muted-foreground font-mono">
                          ID: #{req.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${statusConfig.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {req.listing?.title || `${req.waste_type} Scrap`}
                      </h4>

                      {/* Buyer Details Sub-row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">
                          Buyer: {req.buyer?.name || 'Anonymous Buyer'}
                        </span>
                        {req.buyer?.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground/70" />
                            {req.buyer.company}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground/70" />
                          {formatRelativeTime(req.created_at)}
                        </span>
                      </div>

                      {/* Buyer Message Snippet */}
                      {req.buyer_message && (
                        <div className="mt-2 text-xs text-muted-foreground bg-secondary/40 p-2 rounded-md flex items-start gap-1.5 border border-border/40">
                          <MessageSquare className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="italic line-clamp-1">"{req.buyer_message}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Quantity and Total Amount */}
                  <div className="flex sm:flex-row lg:flex-col items-start lg:items-end justify-between sm:justify-start lg:justify-center gap-1 sm:gap-4 lg:gap-0.5 border-t lg:border-t-0 pt-2 lg:pt-0 border-border/50">
                    <div className="text-left lg:text-right">
                      <span className="text-xs text-muted-foreground block">Requested</span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatNumber(req.quantity)} {req.listing?.unit || 'kg'}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          (@ {formatCurrency(req.price_per_kg)}/kg)
                        </span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Total Amount</span>
                      <span className="text-base font-bold text-foreground">
                        {formatCurrency(req.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-border/50 justify-end">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => setActionConfirm({ type: 'reject', request: req })}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1"
                          title="Decline request"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>

                        <button
                          onClick={() => setActionConfirm({ type: 'accept', request: req })}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-sm"
                          title="Accept request"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Accept Request
                        </button>
                      </>
                    ) : req.status === 'confirmed' ? (
                      <button
                        onClick={() => setActionConfirm({ type: 'ready_for_pickup', request: req })}
                        disabled={updateStatusMutation.isPending}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
                        title="Mark scrap ready for pickup"
                      >
                        <PackageCheck className="h-3.5 w-3.5" /> Mark Ready for Pickup
                      </button>
                    ) : req.status === 'ready_for_pickup' ? (
                      <button
                        onClick={() => setActionConfirm({ type: 'in_transit', request: req })}
                        disabled={updateStatusMutation.isPending}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-cyan-600 hover:bg-cyan-700 transition-colors flex items-center gap-1.5 shadow-sm"
                        title="Mark scrap in transit"
                      >
                        <Truck className="h-3.5 w-3.5" /> Mark In Transit
                      </button>
                    ) : req.status === 'in_transit' ? (
                      <button
                        onClick={() => setActionConfirm({ type: 'delivered', request: req })}
                        disabled={updateStatusMutation.isPending}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                        title="Confirm delivery and fulfill inventory"
                      >
                        <Package className="h-3.5 w-3.5" /> Mark Delivered
                      </button>
                    ) : req.status === 'delivered' ? (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </span>
                    ) : null}

                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. Request Details Modal                                                  */}
      {/* ========================================================================= */}
      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title="Scrap Request Details"
          size="lg"
        >
          <div className="space-y-5">
            {/* Header Badge & ID */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="text-xs text-muted-foreground font-mono block">
                  Request ID: {selectedRequest.id}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  Submitted: {new Date(selectedRequest.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <div
                className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5 ${
                  getStatusBadge(selectedRequest.status).className
                }`}
              >
                {getStatusBadge(selectedRequest.status).label}
              </div>
            </div>

            {/* Listing Summary Card */}
            <div className="p-3.5 bg-secondary/30 rounded-xl border border-border/50 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative border border-border/50">
                <ListingImage
                  src={selectedRequest.listing?.image_url}
                  alt={selectedRequest.listing?.title || selectedRequest.waste_type}
                  containerClassName="w-full h-full"
                  fallbackCategory={selectedRequest.waste_type}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1">
                  <WasteBadge type={selectedRequest.waste_type as WasteType} size="sm" />
                </div>
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {selectedRequest.listing?.title || `${selectedRequest.waste_type} Waste`}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>
                    Available in listing:{' '}
                    <strong className="text-foreground">
                      {selectedRequest.listing?.available_quantity !== undefined
                        ? `${selectedRequest.listing.available_quantity} ${selectedRequest.listing.unit || 'kg'}`
                        : 'N/A'}
                    </strong>
                  </span>
                  {selectedRequest.listing?.reserved_quantity !== undefined && Number(selectedRequest.listing.reserved_quantity) > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      ({selectedRequest.listing.reserved_quantity} {selectedRequest.listing.unit || 'kg'} reserved)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Buyer Contact Card */}
            <div className="p-3.5 bg-secondary/20 rounded-xl border border-border/40 space-y-2">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Buyer Contact Details
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block">Name:</span>
                  <span className="font-medium text-foreground">
                    {selectedRequest.buyer?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Company:</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {selectedRequest.buyer?.company || 'Individual Recycler'}
                  </span>
                </div>
                {selectedRequest.buyer?.phone && (
                  <div>
                    <span className="text-muted-foreground block">Phone:</span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3 text-primary" />
                      {selectedRequest.buyer.phone}
                    </span>
                  </div>
                )}
                {selectedRequest.buyer?.email && (
                  <div>
                    <span className="text-muted-foreground block">Email:</span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {selectedRequest.buyer.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Terms Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/40">
                <Scale className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <span className="text-xs text-muted-foreground block">Requested Qty</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatNumber(selectedRequest.quantity)} {selectedRequest.listing?.unit || 'kg'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border/40">
                <IndianRupee className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <span className="text-xs text-muted-foreground block">Price / kg</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(selectedRequest.price_per_kg)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <IndianRupee className="h-4 w-4 text-primary mx-auto mb-1" />
                <span className="text-xs text-primary font-medium block">Total Value</span>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(selectedRequest.amount)}
                </span>
              </div>
            </div>

            {/* Buyer Message Callout */}
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Buyer Message / Notes
              </h5>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs leading-relaxed text-foreground">
                {selectedRequest.buyer_message ? (
                  <p className="whitespace-pre-line italic">"{selectedRequest.buyer_message}"</p>
                ) : (
                  <p className="text-muted-foreground italic">No optional message was attached by the buyer.</p>
                )}
              </div>
            </div>

            {/* Tracking History */}
            {selectedRequest.tracking_updates && selectedRequest.tracking_updates.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Timeline / Updates
                </h5>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedRequest.tracking_updates.map((update, idx) => (
                    <div
                      key={idx}
                      className="text-xs p-2 rounded bg-secondary/20 border border-border/30 flex items-center justify-between"
                    >
                      <span className="font-medium capitalize text-foreground">
                        {update.status.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(update.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fulfillment Milestones if available */}
            {(selectedRequest.ready_at || selectedRequest.dispatched_at || selectedRequest.delivered_at || selectedRequest.fulfillment_notes) && (
              <div className="p-3.5 bg-secondary/20 rounded-xl border border-border/50 space-y-2">
                <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-primary" />
                  Fulfillment Milestones
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {selectedRequest.ready_at && (
                    <div className="bg-card p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[11px]">Ready for Pickup</span>
                      <span className="font-semibold text-foreground">
                        {new Date(selectedRequest.ready_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  )}
                  {selectedRequest.dispatched_at && (
                    <div className="bg-card p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[11px]">Dispatched / In Transit</span>
                      <span className="font-semibold text-foreground">
                        {new Date(selectedRequest.dispatched_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  )}
                  {selectedRequest.delivered_at && (
                    <div className="bg-card p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[11px]">Delivered & Fulfilled</span>
                      <span className="font-semibold text-foreground">
                        {new Date(selectedRequest.delivered_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  )}
                </div>
                {selectedRequest.fulfillment_notes && (
                  <p className="text-xs text-muted-foreground italic">
                    Notes: {selectedRequest.fulfillment_notes}
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="border-t border-border pt-4 flex gap-3 justify-end flex-wrap items-center">
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setActionConfirm({ type: 'reject', request: selectedRequest });
                    }}
                    className="btn-secondary text-rose-600 dark:text-rose-400 gap-1.5 text-xs"
                  >
                    <XCircle className="h-4 w-4" /> Reject Request
                  </button>

                  <button
                    onClick={() => {
                      setActionConfirm({ type: 'accept', request: selectedRequest });
                    }}
                    className="btn-primary gap-1.5 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Accept Request
                  </button>
                </>
              )}

              {selectedRequest.status === 'confirmed' && (
                <button
                  onClick={() => {
                    setActionConfirm({ type: 'ready_for_pickup', request: selectedRequest });
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <PackageCheck className="h-4 w-4" /> Mark Ready for Pickup
                </button>
              )}

              {selectedRequest.status === 'ready_for_pickup' && (
                <button
                  onClick={() => {
                    setActionConfirm({ type: 'in_transit', request: selectedRequest });
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Truck className="h-4 w-4" /> Mark In Transit
                </button>
              )}

              {selectedRequest.status === 'in_transit' && (
                <button
                  onClick={() => {
                    setActionConfirm({ type: 'delivered', request: selectedRequest });
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Package className="h-4 w-4" /> Mark Delivered
                </button>
              )}

              {selectedRequest.status !== 'cancelled' && selectedRequest.status !== 'disputed' && selectedRequest.status !== 'pending' && (
                <button
                  type="button"
                  onClick={() => {
                    setDisputeTargetRequest(selectedRequest);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Raise Dispute
                </button>
              )}

              <button onClick={() => setSelectedRequest(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. Action Confirmation Modal (Accept / Reject / Fulfillment)              */}
      {/* ========================================================================= */}
      {actionConfirm && (
        <Modal
          isOpen={!!actionConfirm}
          onClose={() => {
            if (!updateStatusMutation.isPending) {
              setActionConfirm(null);
              setActionNote('');
            }
          }}
          title={
            actionConfirm.type === 'accept'
              ? 'Accept Scrap Request'
              : actionConfirm.type === 'reject'
              ? 'Decline Scrap Request'
              : actionConfirm.type === 'ready_for_pickup'
              ? 'Mark Order Ready for Pickup'
              : actionConfirm.type === 'in_transit'
              ? 'Mark Order In Transit'
              : 'Confirm Order Delivery'
          }
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              {actionConfirm.type === 'accept' ? (
                <>
                  Are you sure you want to accept this request from{' '}
                  <strong className="text-foreground">
                    {actionConfirm.request.buyer?.name || 'the buyer'}
                  </strong>{' '}
                  for{' '}
                  <strong className="text-foreground">
                    {formatNumber(actionConfirm.request.quantity)}kg
                  </strong>{' '}
                  amounting to{' '}
                  <strong className="text-foreground">
                    {formatCurrency(actionConfirm.request.amount)}
                  </strong>
                  ? The order will be placed into "Awaiting Payment" status awaiting buyer checkout.
                </>
              ) : actionConfirm.type === 'reject' ? (
                <>
                  Are you sure you want to decline this request for{' '}
                  <strong className="text-foreground">
                    {formatNumber(actionConfirm.request.quantity)}kg
                  </strong>{' '}
                  of {actionConfirm.request.waste_type}?
                </>
              ) : actionConfirm.type === 'ready_for_pickup' ? (
                <>
                  Mark order <strong className="text-foreground">#{actionConfirm.request.id.slice(0, 8).toUpperCase()}</strong> as ready for collection?
                  This confirms the scrap has been prepared and packed.
                </>
              ) : actionConfirm.type === 'in_transit' ? (
                <>
                  Mark order <strong className="text-foreground">#{actionConfirm.request.id.slice(0, 8).toUpperCase()}</strong> as dispatched/in transit?
                  The buyer will see that their scrap is en route.
                </>
              ) : (
                <>
                  Mark order <strong className="text-foreground">#{actionConfirm.request.id.slice(0, 8).toUpperCase()}</strong> as delivered?
                  This will finalize the order and atomically mark the reserved inventory as <strong>FULFILLED</strong>.
                </>
              )}
            </p>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {actionConfirm.type === 'reject'
                  ? 'Reason for Rejection (Optional)'
                  : 'Fulfillment / Status Notes (Optional)'}
              </label>
              <textarea
                rows={2}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  actionConfirm.type === 'reject'
                    ? 'e.g. Quantity committed to another buyer...'
                    : actionConfirm.type === 'ready_for_pickup'
                    ? 'e.g. Packed in warehouse Bay 3, gate 2 pickup...'
                    : actionConfirm.type === 'in_transit'
                    ? 'e.g. Vehicle #KA-01-AB-1234, estimated delivery today...'
                    : 'e.g. Verified by receiving supervisor, signed gate pass...'
                }
                className="input-base text-xs resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionConfirm(null);
                  setActionNote('');
                }}
                disabled={updateStatusMutation.isPending}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={updateStatusMutation.isPending}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  actionConfirm.type === 'accept'
                    ? 'btn-primary'
                    : actionConfirm.type === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : actionConfirm.type === 'ready_for_pickup'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : actionConfirm.type === 'in_transit'
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                  </>
                ) : actionConfirm.type === 'accept' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Acceptance
                  </>
                ) : actionConfirm.type === 'reject' ? (
                  <>
                    <XCircle className="h-3.5 w-3.5" /> Confirm Rejection
                  </>
                ) : actionConfirm.type === 'ready_for_pickup' ? (
                  <>
                    <PackageCheck className="h-3.5 w-3.5" /> Mark Ready
                  </>
                ) : actionConfirm.type === 'in_transit' ? (
                  <>
                    <Truck className="h-3.5 w-3.5" /> Mark In Transit
                  </>
                ) : (
                  <>
                    <Package className="h-3.5 w-3.5" /> Confirm Delivery
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* 3. Raise Dispute Modal */}
      {disputeTargetRequest && (
        <RaiseDisputeModal
          isOpen={!!disputeTargetRequest}
          onClose={() => setDisputeTargetRequest(null)}
          order={disputeTargetRequest}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['seller_requests'] });
            refetch();
            setSelectedRequest(null);
            addToast({
              type: 'success',
              title: 'Dispute Submitted',
              message: 'Your dispute has been logged and is under admin review.',
            });
          }}
        />
      )}
    </div>
  );
}
