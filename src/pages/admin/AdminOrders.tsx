import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminOrders, getAdminOrderById, type AdminOrder, type AdminOrderDetails } from '@/services/adminService';
import { getStatusBadge, getPaymentBadge } from '@/pages/BuyerOrders';
import type { RequestStatus } from '@/services/requestService';
import {
  Search,
  Package,
  Eye,
  Calendar,
  Building2,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  AlertTriangle,
  XCircle,
  CreditCard,
  Scale,
  RefreshCw,
  Loader2,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { WasteBadge } from '@/components/WasteBadge';
import { WasteType, formatCurrency, formatNumber } from '@/data/mockData';

const STATUS_FILTERS = [
  'All',
  'pending',
  'awaiting_payment',
  'confirmed',
  'ready_for_pickup',
  'in_transit',
  'delivered',
  'cancelled',
  'disputed',
];

export default function AdminOrders() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Fetch admin orders
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin_orders', status, search, page],
    queryFn: async () => {
      const res = await getAdminOrders({
        status: status === 'All' ? undefined : status,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
  });

  // Fetch single order details if modal is open
  const { data: detailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ['admin_order_details', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await getAdminOrderById(selectedOrderId);
      return res.data?.order;
    },
    enabled: Boolean(selectedOrderId),
  });

  const orders = data?.orders || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase">
              Admin Control
            </span>
            <span className="text-xs text-muted-foreground">• Platform Orders</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Order Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit collection requests across all buyers and sellers, inspect fulfillment logs and dispute states.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Controls: Search and Status Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order ID, material, buyer name, or seller..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-base pl-9 text-sm h-10 w-full"
            />
          </div>

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Found <strong>{total}</strong> orders
          </span>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {STATUS_FILTERS.map((s) => {
            const isActive = status === s;
            return (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/60'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center bg-destructive/5 border-destructive/20 space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Failed to load orders</h3>
          <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : 'Database error'}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card-base p-12 text-center space-y-3">
          <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">No orders matching your criteria</h3>
          <p className="text-xs text-muted-foreground">Try adjusting your status filter or search term.</p>
        </div>
      ) : (
        <div className="card-base overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Material / Listing</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-center">Dispute</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((ord) => {
                  const badge = getStatusBadge(ord.status);
                  const payBadge = getPaymentBadge(ord.payment as any, ord.status as any);
                  return (
                    <tr key={ord.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        #{ord.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground truncate max-w-[180px]">
                          {ord.listing?.title || `${ord.waste_type} Scrap`}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{ord.waste_type}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{ord.buyer?.name || 'Buyer'}</div>
                        <span className="text-[10px] text-muted-foreground">{ord.buyer?.company || ord.buyer?.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{ord.seller?.name || 'Seller'}</div>
                        <span className="text-[10px] text-muted-foreground">{ord.seller?.company || ord.seller?.email}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">
                        {formatNumber(ord.quantity)} {ord.listing?.unit || 'kg'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCurrency(ord.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}
                        >
                          <badge.icon className="h-3 w-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {payBadge ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${payBadge.className}`}
                          >
                            <payBadge.icon className="h-3 w-3" />
                            <span>{payBadge.label}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Unpaid</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ord.dispute_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <ShieldAlert className="h-3 w-3" />
                            <span>{ord.dispute_count}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedOrderId(ord.id)}
                          className="btn-secondary text-[11px] px-2.5 py-1 gap-1"
                          title="Inspect Order Details"
                        >
                          <Eye className="h-3.5 w-3.5" /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-secondary/20 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total orders)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Order Inspection Modal                                                   */}
      {/* ========================================================================= */}
      {selectedOrderId && (
        <Modal
          isOpen={Boolean(selectedOrderId)}
          onClose={() => setSelectedOrderId(null)}
          title="Order Inspection & Audit Log"
          size="lg"
        >
          {detailsLoading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Fetching complete order audit record...</p>
            </div>
          ) : detailsData ? (
            <div className="space-y-6 pt-1">
              {/* Header Ribbon */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-foreground font-bold">
                      ORDER #{detailsData.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Full ID: {detailsData.id}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {detailsData.listing?.title || `${detailsData.waste_type} Scrap`}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      getStatusBadge(detailsData.status).className
                    }`}
                  >
                    {getStatusBadge(detailsData.status).label}
                  </span>
                </div>
              </div>

              {/* Parties Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Buyer Card */}
                <div className="p-3.5 bg-secondary/20 rounded-xl border border-border/60 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Buyer Details
                  </span>
                  <p className="font-bold text-foreground text-sm">{detailsData.buyer?.name}</p>
                  {detailsData.buyer?.company && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {detailsData.buyer.company}
                    </p>
                  )}
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {detailsData.buyer?.email}
                  </p>
                  {detailsData.buyer?.phone && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {detailsData.buyer.phone}
                    </p>
                  )}
                </div>

                {/* Seller Card */}
                <div className="p-3.5 bg-secondary/20 rounded-xl border border-border/60 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Seller Details
                  </span>
                  <p className="font-bold text-foreground text-sm">{detailsData.seller?.name}</p>
                  {detailsData.seller?.company && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {detailsData.seller.company}
                    </p>
                  )}
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {detailsData.seller?.email}
                  </p>
                  {detailsData.seller?.phone && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {detailsData.seller.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Financials & Inventory Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-secondary/20 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Quantity</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatNumber(detailsData.quantity)} {detailsData.listing?.unit || 'kg'}
                  </span>
                </div>
                <div className="p-3 bg-secondary/20 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Unit Rate</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(detailsData.price_per_kg)}/kg
                  </span>
                </div>
                <div className="p-3 bg-secondary/20 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Total Amount</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(detailsData.amount)}
                  </span>
                </div>
                <div className="p-3 bg-secondary/20 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Inventory Status</span>
                  <span className="text-sm font-bold text-primary">
                    {detailsData.reservation?.status || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Fulfillment Milestones if recorded */}
              <div className="p-3.5 bg-secondary/20 rounded-xl border border-border/50 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-primary" />
                  Fulfillment Timestamps
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-card p-2 rounded border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Ready for Pickup</span>
                    <span className="font-semibold text-foreground">
                      {detailsData.ready_at ? new Date(detailsData.ready_at).toLocaleString('en-IN') : '—'}
                    </span>
                  </div>
                  <div className="bg-card p-2 rounded border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">In Transit</span>
                    <span className="font-semibold text-foreground">
                      {detailsData.dispatched_at ? new Date(detailsData.dispatched_at).toLocaleString('en-IN') : '—'}
                    </span>
                  </div>
                  <div className="bg-card p-2 rounded border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Delivered & Fulfilled</span>
                    <span className="font-semibold text-foreground">
                      {detailsData.delivered_at ? new Date(detailsData.delivered_at).toLocaleString('en-IN') : '—'}
                    </span>
                  </div>
                </div>
                {detailsData.fulfillment_notes && (
                  <p className="text-xs text-muted-foreground italic pt-1">
                    Notes: {detailsData.fulfillment_notes}
                  </p>
                )}
              </div>

              {/* Disputes on this order if any */}
              {detailsData.disputes && detailsData.disputes.length > 0 && (
                <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Associated Disputes ({detailsData.disputes.length})
                  </h4>
                  <div className="space-y-1.5">
                    {detailsData.disputes.map((dsp) => (
                      <div key={dsp.id} className="text-xs bg-card/60 p-2 rounded border border-amber-500/20 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground">{dsp.reason}</span>
                          <span className="text-muted-foreground text-[10px] ml-2">by {dsp.raised_by_name}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary uppercase">
                          {dsp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Audit History */}
              {detailsData.fulfillment_activity && detailsData.fulfillment_activity.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Append-Only Fulfillment Audit History
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                    {detailsData.fulfillment_activity.map((act) => (
                      <div key={act.id} className="p-2 rounded bg-card border border-border/50 flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">
                            {act.notes || `Transition: ${act.previous_status || 'initial'} -> ${act.new_status}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(act.created_at).toLocaleString('en-IN')} • Changed by {act.actor_name || act.actor_role} ({act.actor_role})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
