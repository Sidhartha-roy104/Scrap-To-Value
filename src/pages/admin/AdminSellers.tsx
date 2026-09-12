/**
 * pages/admin/AdminSellers.tsx
 * ----------------------------
 * Seller Verification & Operational Directory.
 * Allows administrators to review KYC status, add verification notes, and approve/reject sellers.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminSellers,
  updateSellerVerification,
  type AdminSeller,
} from '@/services/adminService';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Mail,
  Calendar,
  Package,
  Layers,
  IndianRupee,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/data/mockData';
import { useToastNotification } from '@/components/ToastNotification';

export default function AdminSellers() {
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();

  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [page, setPage] = useState(1);

  // Selected seller for verification modal
  const [selectedSeller, setSelectedSeller] = useState<AdminSeller | null>(null);
  const [verifyAction, setVerifyAction] = useState<{
    seller: AdminSeller;
    targetStatus: boolean;
  } | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Fetch sellers
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin_sellers', search, kycFilter, page],
    queryFn: async () => {
      const res = await getAdminSellers({
        search: search.trim() || undefined,
        kycStatus: kycFilter === 'all' ? undefined : kycFilter,
        page,
        limit: 15,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
  });

  const sellers = data?.sellers ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Mutation: Update KYC verification
  const verifyMutation = useMutation({
    mutationFn: async ({
      sellerId,
      kyc_verified,
      kyc_notes,
    }: {
      sellerId: string;
      kyc_verified: boolean;
      kyc_notes: string;
    }) => {
      const res = await updateSellerVerification(sellerId, { kyc_verified, kyc_notes });
      return res.data;
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin_sellers'] });
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      setVerifyAction(null);
      setVerificationNotes('');
      if (selectedSeller && selectedSeller.id === vars.sellerId) {
        setSelectedSeller((prev) => (prev ? { ...prev, kyc_verified: vars.kyc_verified, kyc_notes: vars.kyc_notes } : null));
      }
      addToast({
        type: 'success',
        title: 'Verification Updated',
        message: `Seller has been marked as ${vars.kyc_verified ? 'VERIFIED' : 'UNVERIFIED'}.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not update seller verification status.',
      });
    },
  });

  const handleOpenVerifyModal = (seller: AdminSeller, targetStatus: boolean) => {
    setVerifyAction({ seller, targetStatus });
    setVerificationNotes(seller.kyc_notes || '');
  };

  const handleConfirmVerification = () => {
    if (!verifyAction) return;
    verifyMutation.mutate({
      sellerId: verifyAction.seller.id,
      kyc_verified: verifyAction.targetStatus,
      kyc_notes: verificationNotes.trim(),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Seller Verification & Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review business credentials, manage seller KYC status, and inspect inventory activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
            Total Sellers: <strong className="text-foreground">{total}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-base p-4 bg-card/60 backdrop-blur-xs border border-border flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, company, email, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* KYC Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {(['all', 'verified', 'unverified'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setKycFilter(tab);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                kycFilter === tab
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'all' ? 'All Sellers' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Sellers Data Table */}
      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading seller records...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-500">Failed to load sellers</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <button onClick={() => refetch()} className="btn-primary text-xs px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : sellers.length === 0 ? (
        <div className="card-base p-16 text-center space-y-3">
          <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No sellers match your criteria</p>
          <p className="text-xs text-muted-foreground">Try clearing your search query or KYC filter.</p>
        </div>
      ) : (
        <div className="card-base overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Seller / Company</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-center">KYC Status</th>
                  <th className="py-3 px-4 text-center">Listings</th>
                  <th className="py-3 px-4 text-right">Fulfilled Volume</th>
                  <th className="py-3 px-4 text-center">Account</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{seller.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        <span>{seller.company || 'Individual Recycler'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 space-y-0.5">
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {seller.email}
                      </div>
                      {seller.phone && (
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {seller.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {seller.kyc_verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium text-[11px]">
                          <ShieldAlert className="h-3 w-3" />
                          Pending Review
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-semibold text-foreground">
                      {seller.listings_count}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-foreground">
                        {formatNumber(seller.total_fulfilled_kg)} kg
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatCurrency(seller.total_sales_volume)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          seller.is_active
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {seller.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedSeller(seller)}
                        className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs transition-colors font-medium"
                      >
                        Profile
                      </button>

                      {seller.kyc_verified ? (
                        <button
                          onClick={() => handleOpenVerifyModal(seller, false)}
                          className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors"
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenVerifyModal(seller, true)}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                        >
                          Verify
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
                Page {page} of {totalPages} ({total} sellers)
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
      {/* 1. SELLER PROFILE INSPECTION MODAL                                        */}
      {/* ========================================================================= */}
      {selectedSeller && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSeller(null)}
          title={`Seller Profile: ${selectedSeller.name}`}
          size="md"
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-foreground block">{selectedSeller.name}</span>
                <span className="text-muted-foreground">{selectedSeller.company || 'Individual Recycler'}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  selectedSeller.kyc_verified
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}
              >
                {selectedSeller.kyc_verified ? 'KYC Verified' : 'Pending Verification'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-card border border-border/70 space-y-1">
                <span className="text-muted-foreground block text-[11px]">Email</span>
                <span className="font-semibold text-foreground truncate block">{selectedSeller.email}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-card border border-border/70 space-y-1">
                <span className="text-muted-foreground block text-[11px]">Phone</span>
                <span className="font-semibold text-foreground">{selectedSeller.phone || 'Not provided'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-card border border-border/70 space-y-1 col-span-2">
                <span className="text-muted-foreground block text-[11px]">Registered Address</span>
                <span className="font-medium text-foreground">{selectedSeller.address || 'Address not registered'}</span>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/50">
                <span className="text-muted-foreground text-[10px] block">Listings</span>
                <span className="font-bold text-foreground text-sm">{selectedSeller.listings_count}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/50">
                <span className="text-muted-foreground text-[10px] block">Completed Orders</span>
                <span className="font-bold text-foreground text-sm">{selectedSeller.completed_orders_count}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-primary text-[10px] block">Fulfilled Scrap</span>
                <span className="font-bold text-primary text-sm">{formatNumber(selectedSeller.total_fulfilled_kg)} kg</span>
              </div>
            </div>

            {/* Verification Notes */}
            {selectedSeller.kyc_notes && (
              <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] block">
                  Admin Verification Notes
                </span>
                <p className="text-foreground italic">{selectedSeller.kyc_notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setSelectedSeller(null)}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. KYC VERIFICATION / REVOCATION ACTION MODAL                             */}
      {/* ========================================================================= */}
      {verifyAction && (
        <Modal
          isOpen={true}
          onClose={() => setVerifyAction(null)}
          title={verifyAction.targetStatus ? 'Approve Seller Verification' : 'Revoke Seller Verification'}
          size="sm"
        >
          <div className="space-y-4 pt-1 text-xs">
            <p className="text-foreground leading-relaxed">
              {verifyAction.targetStatus ? (
                <>
                  Are you sure you want to mark <strong>{verifyAction.seller.name}</strong> as{' '}
                  <span className="text-emerald-600 font-semibold">KYC Verified</span>? This grants trust badges and standard marketplace privileges.
                </>
              ) : (
                <>
                  Are you sure you want to revoke verification for <strong>{verifyAction.seller.name}</strong>?
                </>
              )}
            </p>

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">Verification Notes / Justification (Optional)</label>
              <textarea
                rows={3}
                placeholder="e.g., GST certificate verified, warehouse facility inspected..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setVerifyAction(null)}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium"
                disabled={verifyMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVerification}
                disabled={verifyMutation.isPending}
                className={`px-3.5 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 ${
                  verifyAction.targetStatus
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                  </>
                ) : verifyAction.targetStatus ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve Verification
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" /> Confirm Revocation
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
