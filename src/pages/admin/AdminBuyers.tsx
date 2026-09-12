/**
 * pages/admin/AdminBuyers.tsx
 * ---------------------------
 * Buyer Directory & Account Oversight.
 * Manage buyer accounts, inspect procurement activity, and soft-toggle account status.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminBuyers,
  updateUserStatus,
  type AdminBuyer,
} from '@/services/adminService';
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
  IndianRupee,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/data/mockData';
import { useToastNotification } from '@/components/ToastNotification';

export default function AdminBuyers() {
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  // Selected buyer for profile modal & status toggle
  const [selectedBuyer, setSelectedBuyer] = useState<AdminBuyer | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{
    buyer: AdminBuyer;
    targetStatus: boolean;
  } | null>(null);

  // Fetch buyers
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin_buyers', search, activeFilter, page],
    queryFn: async () => {
      const res = await getAdminBuyers({
        search: search.trim() || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter,
        page,
        limit: 15,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
  });

  const buyers = data?.buyers ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Mutation: Soft Activate / Deactivate Buyer
  const statusMutation = useMutation({
    mutationFn: async ({ buyerId, isActive }: { buyerId: string; isActive: boolean }) => {
      const res = await updateUserStatus(buyerId, isActive);
      return res.data;
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin_buyers'] });
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      setStatusConfirm(null);
      if (selectedBuyer && selectedBuyer.id === vars.buyerId) {
        setSelectedBuyer((prev) => (prev ? { ...prev, is_active: vars.isActive } : null));
      }
      addToast({
        type: 'success',
        title: 'Buyer Status Updated',
        message: `Account has been ${vars.isActive ? 'activated' : 'deactivated'}.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not update buyer account status.',
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Buyer Management & Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor recycler organizations, procurement spend, and manage account authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
            Total Buyers: <strong className="text-foreground">{total}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-base p-4 bg-card/60 backdrop-blur-xs border border-border flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by buyer name, company, email, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {(['all', 'active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveFilter(tab);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                activeFilter === tab
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'all' ? 'All Buyers' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Buyers Data Table */}
      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading buyer records...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-500">Failed to load buyers</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <button onClick={() => refetch()} className="btn-primary text-xs px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : buyers.length === 0 ? (
        <div className="card-base p-16 text-center space-y-3">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No buyers found</p>
          <p className="text-xs text-muted-foreground">Try clearing your search query or filters.</p>
        </div>
      ) : (
        <div className="card-base overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Buyer / Enterprise</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-center">Orders Placed</th>
                  <th className="py-3 px-4 text-center">Delivered</th>
                  <th className="py-3 px-4 text-right">Procured Volume</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{buyer.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        <span>{buyer.company || 'Direct Buyer'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 space-y-0.5">
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {buyer.email}
                      </div>
                      {buyer.phone && (
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {buyer.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-foreground">
                      {buyer.orders_count}
                    </td>

                    <td className="py-3 px-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                      {buyer.delivered_orders_count}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-foreground">
                        {formatNumber(buyer.total_purchased_kg)} kg
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatCurrency(buyer.total_ordered_amount)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          buyer.is_active
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {buyer.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedBuyer(buyer)}
                        className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs transition-colors font-medium"
                      >
                        Profile
                      </button>

                      {buyer.is_active ? (
                        <button
                          onClick={() => setStatusConfirm({ buyer, targetStatus: false })}
                          className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatusConfirm({ buyer, targetStatus: true })}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                        >
                          Activate
                        </button>
                      )}
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
                Page {page} of {totalPages} ({total} buyers)
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

      {/* ========================================================================= */}
      {/* 1. BUYER PROFILE MODAL                                                    */}
      {/* ========================================================================= */}
      {selectedBuyer && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBuyer(null)}
          title={`Buyer Details: ${selectedBuyer.name}`}
          size="md"
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-foreground block">{selectedBuyer.name}</span>
                <span className="text-muted-foreground">{selectedBuyer.company || 'Direct Buyer'}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  selectedBuyer.is_active
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-rose-500/10 text-rose-600'
                }`}
              >
                {selectedBuyer.is_active ? 'Account Active' : 'Account Disabled'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-card border border-border/70 space-y-1">
                <span className="text-muted-foreground block text-[11px]">Email</span>
                <span className="font-semibold text-foreground truncate block">{selectedBuyer.email}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-card border border-border/70 space-y-1">
                <span className="text-muted-foreground block text-[11px]">Phone</span>
                <span className="font-semibold text-foreground">{selectedBuyer.phone || 'Not provided'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-card border border-border/70 space-y-1 col-span-2">
                <span className="text-muted-foreground block text-[11px]">Delivery Location</span>
                <span className="font-medium text-foreground">{selectedBuyer.address || 'Address not registered'}</span>
              </div>
            </div>

            {/* Procurement Performance */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/50">
                <span className="text-muted-foreground text-[10px] block">Requests Raised</span>
                <span className="font-bold text-foreground text-sm">{selectedBuyer.orders_count}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/50">
                <span className="text-muted-foreground text-[10px] block">Fulfilled Orders</span>
                <span className="font-bold text-foreground text-sm">{selectedBuyer.delivered_orders_count}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-primary text-[10px] block">Total Procured</span>
                <span className="font-bold text-primary text-sm">{formatNumber(selectedBuyer.total_purchased_kg)} kg</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setSelectedBuyer(null)}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. SOFT DEACTIVATION CONFIRMATION DIALOG                                  */}
      {/* ========================================================================= */}
      {statusConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setStatusConfirm(null)}
          title={statusConfirm.targetStatus ? 'Activate Buyer Account' : 'Deactivate Buyer Account'}
          size="sm"
        >
          <div className="space-y-4 pt-1 text-xs">
            <p className="text-foreground leading-relaxed">
              {statusConfirm.targetStatus ? (
                <>
                  Are you sure you want to <strong>activate</strong> the account for{' '}
                  <strong>{statusConfirm.buyer.name}</strong>? The buyer will immediately regain access to order scrap.
                </>
              ) : (
                <>
                  Are you sure you want to <strong>deactivate</strong> the account for{' '}
                  <strong>{statusConfirm.buyer.name}</strong>? They will be unable to log in or submit scrap purchase requests until re-activated.
                </>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setStatusConfirm(null)}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium"
                disabled={statusMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  statusMutation.mutate({
                    buyerId: statusConfirm.buyer.id,
                    isActive: statusConfirm.targetStatus,
                  })
                }
                disabled={statusMutation.isPending}
                className={`px-3.5 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 ${
                  statusConfirm.targetStatus
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {statusMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                  </>
                ) : statusConfirm.targetStatus ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Activation
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" /> Confirm Deactivation
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
