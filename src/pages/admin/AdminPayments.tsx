/**
 * pages/admin/AdminPayments.tsx
 * -----------------------------
 * Payment Monitoring & Financial Audit Console.
 * Read-only monitoring of mock & gateway transactions, settlement volume, and buyer reconciliation.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAdminPayments,
  type AdminPaymentRecord,
} from '@/services/adminService';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  Calendar,
  Building2,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/data/mockData';
import { Modal } from '@/components/Modal';

const STATUS_FILTERS = ['All', 'SUCCEEDED', 'PENDING', 'FAILED', 'CANCELLED'];

export default function AdminPayments() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentRecord | null>(null);

  // Fetch payments
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin_payments', search, status, page],
    queryFn: async () => {
      const res = await getAdminPayments({
        search: search.trim() || undefined,
        status: status === 'All' ? undefined : status,
        page,
        limit: 15,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
  });

  const summary = data?.summary;
  const payments = data?.payments ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Monitoring & Settlements
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit buyer checkout transactions, payment statuses, and transaction volume across all scrap orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
            Total Captured: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(summary?.succeeded_amount || 0)}</strong>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-base p-4 border border-border">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Transactions</span>
          <p className="text-xl font-extrabold text-foreground mt-1">{summary?.total_payments || 0}</p>
          <span className="text-[10px] text-muted-foreground">Volume: {formatCurrency(summary?.total_volume || 0)}</span>
        </div>

        <div className="card-base p-4 border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">Succeeded Payments</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary?.succeeded_count || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">Captured: {formatCurrency(summary?.succeeded_amount || 0)}</span>
        </div>

        <div className="card-base p-4 border border-amber-500/20 bg-amber-500/5">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">Pending Checkouts</span>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {summary?.pending_count || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">Awaiting buyer checkout</span>
        </div>

        <div className="card-base p-4 border border-rose-500/20 bg-rose-500/5">
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 block">Failed Attempts</span>
          <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {summary?.failed_count || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">Cancelled or simulation errors</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="card-base p-4 bg-card/60 backdrop-blur-xs border border-border flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search payment ID, order ID, buyer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === s
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'All' ? 'All Payments' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading payment records...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-500">Failed to load payments</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <button onClick={() => refetch()} className="btn-primary text-xs px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : payments.length === 0 ? (
        <div className="card-base p-16 text-center space-y-3">
          <CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No payments found</p>
          <p className="text-xs text-muted-foreground">Try clearing filters or search query.</p>
        </div>
      ) : (
        <div className="card-base overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Material / Quantity</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Date / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      #{p.id.slice(0, 8).toUpperCase()}
                    </td>

                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      #{p.request_id.slice(0, 8).toUpperCase()}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{p.buyer.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.buyer.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground capitalize">{p.order.waste_type}</div>
                      <div className="text-[10px] text-muted-foreground">{formatNumber(p.order.quantity)} kg</div>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                          p.status === 'SUCCEEDED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : p.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <span className="text-muted-foreground text-[11px]">
                        {new Date(p.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-medium text-[11px]"
                      >
                        Details
                      </button>
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
                Page {page} of {totalPages} ({total} payments)
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

      {/* Payment Details Modal */}
      {selectedPayment && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPayment(null)}
          title={`Payment #${selectedPayment.id.slice(0, 8).toUpperCase()}`}
          size="md"
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
              <div>
                <span className="font-mono text-muted-foreground text-[11px] block">
                  Reference: {selectedPayment.id}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(selectedPayment.amount)} {selectedPayment.currency}
                </span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                  selectedPayment.status === 'SUCCEEDED'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}
              >
                {selectedPayment.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-card border border-border/70">
                <span className="text-muted-foreground block text-[10px]">Buyer Details</span>
                <span className="font-semibold text-foreground block">{selectedPayment.buyer.name}</span>
                <span className="text-muted-foreground text-[11px]">{selectedPayment.buyer.email}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-card border border-border/70">
                <span className="text-muted-foreground block text-[10px]">Seller Beneficiary</span>
                <span className="font-semibold text-foreground block">{selectedPayment.seller.name}</span>
                <span className="text-muted-foreground text-[11px]">Order #{selectedPayment.request_id.slice(0, 8)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-card border border-border/70">
                <span className="text-muted-foreground block text-[10px]">Gateway Provider</span>
                <span className="font-mono font-medium text-foreground">{selectedPayment.payment_method}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-card border border-border/70">
                <span className="text-muted-foreground block text-[10px]">Paid Timestamp</span>
                <span className="text-foreground">
                  {selectedPayment.paid_at
                    ? new Date(selectedPayment.paid_at).toLocaleString('en-IN')
                    : 'Not paid / Incomplete'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium"
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
