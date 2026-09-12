/**
 * pages/admin/AdminListings.tsx
 * -----------------------------
 * Marketplace Listing Management & Moderation.
 * Inspect listings, filter by category/seller, and safely toggle active/flagged/inactive status.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminListings,
  updateListingStatus,
  type AdminListing,
} from '@/services/adminService';
import {
  Package,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  MapPin,
  Scale,
  IndianRupee,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { WasteBadge } from '@/components/WasteBadge';
import { WasteType, formatCurrency, formatNumber, formatRelativeTime } from '@/data/mockData';
import { ListingImage } from '@/components/ListingImage';
import { useToastNotification } from '@/components/ToastNotification';

const CATEGORIES = ['All', 'plastic', 'metal', 'paper', 'glass', 'electronic', 'organic'];
const STATUSES = ['All', 'active', 'inactive', 'flagged', 'sold'];

export default function AdminListings() {
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);

  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    listing: AdminListing;
    newStatus: string;
  } | null>(null);

  // Fetch listings
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin_listings', search, category, status, page],
    queryFn: async () => {
      const res = await getAdminListings({
        search: search.trim() || undefined,
        category: category === 'All' ? undefined : category,
        status: status === 'All' ? undefined : status,
        page,
        limit: 15,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
  });

  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Mutation: Moderate listing status
  const statusMutation = useMutation({
    mutationFn: async ({ listingId, newStatus }: { listingId: string; newStatus: string }) => {
      const res = await updateListingStatus(listingId, newStatus);
      return res.data;
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin_listings'] });
      queryClient.invalidateQueries({ queryKey: ['admin_inventory'] });
      setStatusTarget(null);
      if (selectedListing && selectedListing.id === vars.listingId) {
        setSelectedListing((prev) => (prev ? { ...prev, status: vars.newStatus } : null));
      }
      addToast({
        type: 'success',
        title: 'Listing Status Updated',
        message: `Listing status updated to ${vars.newStatus.toUpperCase()}.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update listing status.',
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Marketplace Listing Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit scrap listings, monitor available inventory quantities, and moderate item visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
            Total Listings: <strong className="text-foreground">{total}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-base p-4 bg-card/60 backdrop-blur-xs border border-border flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="relative w-full lg:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search title, location, seller..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Category:</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-border bg-background focus:outline-hidden capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-border bg-background focus:outline-hidden capitalize"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listings Table */}
      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading listings...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-500">Failed to load listings</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <button onClick={() => refetch()} className="btn-primary text-xs px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="card-base p-16 text-center space-y-3">
          <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No listings found</p>
          <p className="text-xs text-muted-foreground">Try broadening your search or clearing filters.</p>
        </div>
      ) : (
        <div className="card-base overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Listing Title & Category</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Reserved</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {listings.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0">
                          <ListingImage
                            src={item.image_url}
                            fallbackCategory={item.waste_type}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate max-w-[200px]">
                            {item.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <WasteBadge type={item.waste_type as WasteType} size="sm" />
                            {item.location && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[120px]">
                                <MapPin className="h-2.5 w-2.5" />
                                {item.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{item.seller.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span>{item.seller.company || item.seller.email}</span>
                        {item.seller.kyc_verified && (
                          <span title="KYC Verified">
                            <ShieldCheck className="h-3 w-3 text-emerald-500 inline" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-foreground">
                        {formatNumber(item.available_quantity)} {item.unit}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        of {formatNumber(item.quantity)} total
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-400">
                      {formatNumber(item.reserved_quantity)} {item.unit}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCurrency(item.price_per_kg)}/{item.unit}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          item.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : item.status === 'flagged'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : item.status === 'inactive'
                            ? 'bg-secondary text-muted-foreground'
                            : 'bg-blue-500/10 text-blue-600'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedListing(item)}
                        className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs transition-colors font-medium"
                      >
                        Inspect
                      </button>

                      {item.status === 'active' ? (
                        <button
                          onClick={() => setStatusTarget({ listing: item, newStatus: 'inactive' })}
                          className="px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground text-xs transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatusTarget({ listing: item, newStatus: 'active' })}
                          className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                        >
                          Activate
                        </button>
                      )}

                      {item.status !== 'flagged' && (
                        <button
                          onClick={() => setStatusTarget({ listing: item, newStatus: 'flagged' })}
                          className="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs transition-colors"
                          title="Flag inappropriate listing"
                        >
                          Flag
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
                Page {page} of {totalPages} ({total} listings)
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
      {/* 1. LISTING INSPECTION MODAL                                               */}
      {/* ========================================================================= */}
      {selectedListing && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedListing(null)}
          title={`Listing Details: ${selectedListing.title}`}
          size="md"
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0">
                <ListingImage
                  src={selectedListing.image_url}
                  fallbackCategory={selectedListing.waste_type}
                  alt={selectedListing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-foreground truncate">{selectedListing.title}</span>
                  <WasteBadge type={selectedListing.waste_type as WasteType} size="sm" />
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-2">
                  {selectedListing.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Inventory Breakdown */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-card border border-border/70">
                <span className="text-muted-foreground text-[10px] block">Total Stock</span>
                <span className="font-bold text-foreground text-sm">
                  {formatNumber(selectedListing.quantity)} {selectedListing.unit}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] block font-medium">Available</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatNumber(selectedListing.available_quantity)} {selectedListing.unit}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-600 dark:text-amber-400 text-[10px] block font-medium">Reserved</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                  {formatNumber(selectedListing.reserved_quantity)} {selectedListing.unit}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/70">
                <span className="text-muted-foreground text-[10px] block">Fulfilled</span>
                <span className="font-bold text-foreground text-sm">
                  {formatNumber(selectedListing.fulfilled_quantity)} {selectedListing.unit}
                </span>
              </div>
            </div>

            {/* Seller Contact */}
            <div className="p-3 rounded-lg bg-secondary/20 border border-border space-y-1.5">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] block">
                Seller Information
              </span>
              <div className="grid grid-cols-2 gap-2 text-foreground">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Name</span>
                  <span className="font-medium">{selectedListing.seller.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Email</span>
                  <span className="font-medium truncate block">{selectedListing.seller.email}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setSelectedListing(null)}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. STATUS CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {statusTarget && (
        <Modal
          isOpen={true}
          onClose={() => setStatusTarget(null)}
          title={`Update Listing Status to "${statusTarget.newStatus.toUpperCase()}"`}
          size="sm"
        >
          <div className="space-y-4 pt-1 text-xs">
            <p className="text-foreground leading-relaxed">
              Are you sure you want to change the status of{' '}
              <strong>"{statusTarget.listing.title}"</strong> to{' '}
              <strong className="capitalize">{statusTarget.newStatus}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setStatusTarget(null)}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium"
                disabled={statusMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  statusMutation.mutate({
                    listingId: statusTarget.listing.id,
                    newStatus: statusTarget.newStatus,
                  })
                }
                disabled={statusMutation.isPending}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5"
              >
                {statusMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Update
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
