/**
 * pages/admin/AdminFulfillment.tsx
 * --------------------------------
 * Operational Fulfillment & Dispatch Tracker.
 * Monitors pipeline progression, milestones (Ready for Pickup, In Transit, Delivered), and detects stuck orders.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getAdminFulfillment,
  type AdminFulfillmentOrder,
} from '@/services/adminService';
import {
  Truck,
  Package,
  PackageCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Calendar,
  Building2,
  Scale,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { WasteBadge } from '@/components/WasteBadge';
import { WasteType, formatCurrency, formatNumber } from '@/data/mockData';
import { Modal } from '@/components/Modal';

const STAGES = [
  'All',
  'pending',
  'awaiting_payment',
  'confirmed',
  'ready_for_pickup',
  'in_transit',
  'delivered',
  'disputed',
];

export default function AdminFulfillment() {
  const [stage, setStage] = useState('All');
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<AdminFulfillmentOrder | null>(null);

  // Fetch fulfillment pipeline
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin_fulfillment', stage, delayedOnly, page],
    queryFn: async () => {
      const res = await getAdminFulfillment({
        stage: stage === 'All' ? undefined : stage,
        delayedOnly,
        page,
        limit: 15,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
  });

  const pipeline = data?.pipeline;
  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Fulfillment & Logistics Monitoring
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track scrap transport milestones, detect stalled shipments, and maintain delivery SLA integrity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDelayedOnly(!delayedOnly);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              delayedOnly
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-xs'
                : 'bg-secondary text-muted-foreground hover:text-foreground border-border'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Delayed Orders ({pipeline?.delayed || 0})</span>
          </button>
        </div>
      </div>

      {/* Fulfillment Pipeline Stage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
        <div
          onClick={() => {
            setStage('pending');
            setPage(1);
          }}
          className={`card-base p-3 border cursor-pointer transition-all ${
            stage === 'pending' ? 'ring-2 ring-primary border-primary' : 'border-border hover:bg-secondary/30'
          }`}
        >
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">1. Pending</span>
          <p className="text-lg font-extrabold text-foreground mt-0.5">{pipeline?.pending || 0}</p>
        </div>

        <div
          onClick={() => {
            setStage('awaiting_payment');
            setPage(1);
          }}
          className={`card-base p-3 border cursor-pointer transition-all ${
            stage === 'awaiting_payment' ? 'ring-2 ring-primary border-primary' : 'border-border hover:bg-secondary/30'
          }`}
        >
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">2. To Pay</span>
          <p className="text-lg font-extrabold text-foreground mt-0.5">{pipeline?.awaiting_payment || 0}</p>
        </div>

        <div
          onClick={() => {
            setStage('confirmed');
            setPage(1);
          }}
          className={`card-base p-3 border cursor-pointer transition-all ${
            stage === 'confirmed' ? 'ring-2 ring-primary border-primary' : 'border-border hover:bg-secondary/30'
          }`}
        >
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">3. Confirmed</span>
          <p className="text-lg font-extrabold text-foreground mt-0.5">{pipeline?.confirmed || 0}</p>
        </div>

        <div
          onClick={() => {
            setStage('ready_for_pickup');
            setPage(1);
          }}
          className={`card-base p-3 border cursor-pointer transition-all ${
            stage === 'ready_for_pickup' ? 'ring-2 ring-primary border-primary' : 'border-border hover:bg-secondary/30'
          }`}
        >
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold block">4. Pickup</span>
          <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
            {pipeline?.ready_for_pickup || 0}
          </p>
        </div>

        <div
          onClick={() => {
            setStage('in_transit');
            setPage(1);
          }}
          className={`card-base p-3 border cursor-pointer transition-all ${
            stage === 'in_transit' ? 'ring-2 ring-primary border-primary' : 'border-border hover:bg-secondary/30'
          }`}
        >
          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-bold block">5. Transit</span>
          <p className="text-lg font-extrabold text-cyan-600 dark:text-cyan-400 mt-0.5">
            {pipeline?.in_transit || 0}
          </p>
        </div>

        <div
          onClick={() => {
            setStage('delivered');
            setPage(1);
          }}
          className={`card-base p-3 border cursor-pointer transition-all ${
            stage === 'delivered' ? 'ring-2 ring-primary border-primary' : 'border-border hover:bg-secondary/30'
          }`}
        >
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">6. Delivered</span>
          <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {pipeline?.delivered || 0}
          </p>
        </div>

        <div
          onClick={() => {
            setStage('disputed');
            setPage(1);
          }}
          className={`card-base p-3 border cursor-pointer transition-all ${
            stage === 'disputed' ? 'ring-2 ring-primary border-primary' : 'border-border hover:bg-secondary/30'
          }`}
        >
          <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold block">Disputed</span>
          <p className="text-lg font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
            {pipeline?.disputed || 0}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card-base p-3 bg-card/60 backdrop-blur-xs border border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStage(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                stage === s
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'All' ? 'All Orders' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {stage !== 'All' && (
          <button
            onClick={() => {
              setStage('All');
              setDelayedOnly(false);
              setPage(1);
            }}
            className="text-xs text-primary font-medium hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading fulfillment pipeline...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-500">Failed to load fulfillment data</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <button onClick={() => refetch()} className="btn-primary text-xs px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="card-base p-16 text-center space-y-3">
          <PackageCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No orders currently in this fulfillment state</p>
        </div>
      ) : (
        <div className="card-base overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Material / Listing</th>
                  <th className="py-3 px-4">Buyer & Seller</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-center">Fulfillment Stage</th>
                  <th className="py-3 px-4 text-center">Time in Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((ord) => (
                  <tr
                    key={ord.id}
                    className={`hover:bg-secondary/20 transition-colors ${
                      ord.is_delayed ? 'bg-rose-500/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      #{ord.id.slice(0, 8).toUpperCase()}
                      {ord.is_delayed && (
                        <span className="block text-[9px] font-bold text-rose-600 uppercase mt-0.5">
                          Delayed (&gt;48h)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground truncate max-w-[180px]">
                        {ord.listing_title || `${ord.waste_type} Scrap`}
                      </div>
                      <div className="mt-0.5">
                        <WasteBadge type={ord.waste_type as WasteType} size="sm" />
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-foreground">
                        Buyer: <strong>{ord.buyer.name}</strong>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Seller: {ord.seller.name}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatNumber(ord.quantity)} kg
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium capitalize border ${
                          ord.status === 'delivered'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold'
                            : ord.status === 'in_transit'
                            ? 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
                            : ord.status === 'ready_for_pickup'
                            ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-medium'
                            : ord.status === 'confirmed'
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : ord.status === 'disputed'
                            ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                            : 'bg-secondary text-muted-foreground border-border'
                        }`}
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-[11px] text-muted-foreground">
                      {ord.hours_in_status}h
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs transition-colors font-medium"
                      >
                        Milestones
                      </button>

                      <Link
                        to={`/admin/orders`}
                        className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs transition-colors font-semibold"
                      >
                        Inspect Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({total} orders)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-border hover:bg-secondary disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1 rounded border border-border hover:bg-secondary disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fulfillment Milestones Modal */}
      {selectedOrder && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedOrder(null)}
          title={`Milestone Progression: Order #${selectedOrder.id.slice(0, 8).toUpperCase()}`}
          size="md"
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <span className="font-bold text-sm text-foreground block">
                {selectedOrder.listing_title || `${selectedOrder.waste_type} Scrap`}
              </span>
              <span className="text-muted-foreground">
                Buyer: {selectedOrder.buyer.name} | Seller: {selectedOrder.seller.name}
              </span>
            </div>

            {/* Milestones Grid */}
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-card border border-border/70 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground block">Ready for Pickup</span>
                  <span className="text-[11px] text-muted-foreground">Seller packed and marked ready</span>
                </div>
                <span className="font-mono text-foreground">
                  {selectedOrder.ready_at
                    ? new Date(selectedOrder.ready_at).toLocaleString('en-IN')
                    : 'Not reached yet'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border/70 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground block">Dispatched / In Transit</span>
                  <span className="text-[11px] text-muted-foreground">Cargo handed over to carrier</span>
                </div>
                <span className="font-mono text-foreground">
                  {selectedOrder.dispatched_at
                    ? new Date(selectedOrder.dispatched_at).toLocaleString('en-IN')
                    : 'Not reached yet'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border/70 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground block">Delivered & Fulfilled</span>
                  <span className="text-[11px] text-muted-foreground">Scrap received and stock fulfilled</span>
                </div>
                <span className="font-mono text-emerald-600 font-semibold">
                  {selectedOrder.delivered_at
                    ? new Date(selectedOrder.delivered_at).toLocaleString('en-IN')
                    : 'Not reached yet'}
                </span>
              </div>
            </div>

            {selectedOrder.fulfillment_notes && (
              <div className="p-3 rounded-lg bg-secondary/20 border border-border space-y-1">
                <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">
                  Fulfillment Notes
                </span>
                <p className="text-foreground italic">{selectedOrder.fulfillment_notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
