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
  Loader2,
  Filter,
} from 'lucide-react';
import { WasteBadge } from '@/components/WasteBadge';
import { WasteType, formatCurrency, formatNumber, formatRelativeTime } from '@/data/mockData';
import { Modal } from '@/components/Modal';
import { useToastNotification } from '@/components/ToastNotification';
import { ListingImage } from '@/components/ListingImage';

type StatusFilter = 'All' | 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'All', label: 'All Requests' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

function getStatusBadge(status: RequestStatus) {
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

  // Confirmation action modals
  const [actionConfirm, setActionConfirm] = useState<{
    type: 'accept' | 'reject';
    request: CollectionRequest;
  } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

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
  const confirmedCount = useMemo(
    () => allRequests.filter((r) => r.status === 'confirmed').length,
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

  // 4. Mutation for accepting or rejecting
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
        const actionWord = updated.status === 'confirmed' ? 'accepted' : 'declined';
        addToast({
          type: 'success',
          title: `Request ${actionWord.charAt(0).toUpperCase() + actionWord.slice(1)}`,
          message: `Request for ${updated.quantity}kg of ${updated.waste_type} has been ${actionWord}.`,
        });
      }
      setActionConfirm(null);
      setRejectionNote('');
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
    const targetStatus: RequestStatus = type === 'accept' ? 'confirmed' : 'cancelled';
    const note = type === 'reject' ? (rejectionNote.trim() || 'Declined by seller') : 'Accepted by seller';

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
        <div className="card-base p-4 border-l-4 border-l-blue-500">
          <span className="text-xs text-muted-foreground block">Confirmed Orders</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
            {confirmedCount}
          </span>
        </div>
        <div className="card-base p-4 border-l-4 border-l-emerald-500">
          <span className="text-xs text-muted-foreground block">Delivered</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {allRequests.filter((r) => r.status === 'delivered').length}
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  Available in listing:{' '}
                  <strong className="text-foreground">
                    {selectedRequest.listing?.available_quantity !== undefined
                      ? `${selectedRequest.listing.available_quantity} ${selectedRequest.listing.unit || 'kg'}`
                      : 'N/A'}
                  </strong>
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

            {/* Modal Actions */}
            <div className="border-t border-border pt-4 flex gap-3 justify-end">
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

              <button onClick={() => setSelectedRequest(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. Action Confirmation Modal (Accept / Reject)                           */}
      {/* ========================================================================= */}
      {actionConfirm && (
        <Modal
          isOpen={!!actionConfirm}
          onClose={() => {
            if (!updateStatusMutation.isPending) {
              setActionConfirm(null);
              setRejectionNote('');
            }
          }}
          title={
            actionConfirm.type === 'accept'
              ? 'Accept Scrap Request'
              : 'Decline Scrap Request'
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
                  ?
                </>
              ) : (
                <>
                  Are you sure you want to decline this request for{' '}
                  <strong className="text-foreground">
                    {formatNumber(actionConfirm.request.quantity)}kg
                  </strong>{' '}
                  of {actionConfirm.request.waste_type}?
                </>
              )}
            </p>

            {actionConfirm.type === 'reject' && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  rows={2}
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="e.g. Quantity committed to another buyer, pickup timeline mismatch..."
                  className="input-base text-xs resize-none"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionConfirm(null);
                  setRejectionNote('');
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
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
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
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" /> Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
