import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  IndianRupee,
  Package,
  ListChecks,
  ShoppingBag,
  ArrowRight,
  Eye,
  Trash2,
  Pencil,
  Plus,
  Clock,
  Truck,
  CheckCircle2,
  Star,
  Building2,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { EditListingModal } from '@/components/EditListingModal';
import { CreateListingModal } from '@/components/CreateListingModal';
import { ListingImage } from '@/components/ListingImage';
import type { DbWasteListing } from '@/hooks/useWasteListings';
import { StatCard } from '@/components/StatCard';
import { WasteBadge } from '@/components/WasteBadge';
import { useWasteListings } from '@/hooks/useWasteListings';
import { useAuth } from '@/hooks/useAuth';
import { useSellerRating } from '@/hooks/useRatings';
import { getRequests, type CollectionRequest } from '@/services/requestService';
import { formatCurrency, formatNumber, formatRelativeTime, WasteType } from '@/data/mockData';
import { StatCardSkeleton, ChartSkeleton } from '@/components/Skeleton';
import { getStatusBadge } from '@/pages/BuyerOrders';
import { toast } from 'sonner';

export function SellerDashboard() {
  const { user } = useAuth();
  const { listings, isLoading: listingsLoading, deleteListing } = useWasteListings();
  const { data: ratingData, isLoading: ratingLoading } = useSellerRating(user?.id);

  // Fetch actual requests received by this supplier from MySQL backend
  const {
    data: requestsData,
    isLoading: requestsLoading,
  } = useQuery({
    queryKey: ['seller_requests'],
    queryFn: async () => {
      const res = await getRequests({ limit: 100 });
      return res.data?.requests ?? [];
    },
    staleTime: 1000 * 20,
  });

  const [editingListing, setEditingListing] = useState<DbWasteListing | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isLoading = listingsLoading || requestsLoading || ratingLoading;

  // 1. Supplier's own scrap listings
  const myListings = useMemo(
    () => listings.filter(l => l.user_id === user?.id),
    [listings, user]
  );
  const activeListings = useMemo(
    () => myListings.filter(l => l.status === 'Available'),
    [myListings]
  );

  // Total available scrap stock across active listings (kg)
  const totalAvailableStockKg = useMemo(
    () => activeListings.reduce((acc, l) => {
      const avail = Number(l.available_quantity !== undefined ? l.available_quantity : l.quantity);
      return acc + (isNaN(avail) ? 0 : avail);
    }, 0),
    [activeListings]
  );

  // 2. Orders received from purchasing companies
  const ordersReceived: CollectionRequest[] = requestsData ?? [];

  // Breakdowns by status
  const pendingOrders = useMemo(
    () => ordersReceived.filter(r => r.status === 'pending'),
    [ordersReceived]
  );
  const awaitingPaymentOrders = useMemo(
    () => ordersReceived.filter(r => r.status === 'awaiting_payment'),
    [ordersReceived]
  );
  const inFulfillmentOrders = useMemo(
    () => ordersReceived.filter(r => ['confirmed', 'ready_for_pickup', 'in_transit'].includes(r.status)),
    [ordersReceived]
  );
  const deliveredOrders = useMemo(
    () => ordersReceived.filter(r => r.status === 'delivered'),
    [ordersReceived]
  );

  // Total completed sales value (delivered orders only; cancelled/pending excluded)
  const totalSalesValue = useMemo(
    () => deliveredOrders.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [deliveredOrders]
  );

  // Monthly sales trend for delivered orders
  const revenueData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months[monthNames[d.getMonth()]] = 0;
    }
    deliveredOrders.forEach(r => {
      const key = monthNames[new Date(r.created_at).getMonth()];
      if (months[key] !== undefined) {
        months[key] += Number(r.amount) || 0;
      }
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [deliveredOrders]);

  const displayName = user?.full_name || user?.company_name || user?.email || 'Supplier';

  if (isLoading) {
    return (
      <div className="container-main py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Scrap Supplier Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading supplier metrics...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Supplier Welcome & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Scrap Supplier Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <strong className="text-foreground">{displayName}</strong>. Manage your scrap listings and buyer orders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary text-sm gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Post Scrap Listing
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Delivered Order Value"
          value={formatCurrency(totalSalesValue)}
          icon={IndianRupee}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <StatCard
          label="Available Scrap Stock"
          value={`${formatNumber(totalAvailableStockKg)} kg`}
          icon={Package}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
        <StatCard
          label="Active Scrap Listings"
          value={formatNumber(activeListings.length)}
          icon={ListChecks}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatCard
          label="Orders Received from Buyers"
          value={formatNumber(ordersReceived.length)}
          icon={ShoppingBag}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
      </div>

      {/* Supplier Operational Status Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-base p-3.5 flex items-center justify-between border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Action</p>
              <p className="text-lg font-bold text-foreground">{pendingOrders.length}</p>
            </div>
          </div>
          {pendingOrders.length > 0 && (
            <Link
              to="/orders"
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Review
            </Link>
          )}
        </div>

        <div className="card-base p-3.5 flex items-center justify-between border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-2.5">
            <IndianRupee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Awaiting Payment</p>
              <p className="text-lg font-bold text-foreground">{awaitingPaymentOrders.length}</p>
            </div>
          </div>
          <Link
            to="/orders"
            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            Track
          </Link>
        </div>

        <div className="card-base p-3.5 flex items-center justify-between border-cyan-500/30 bg-cyan-500/5">
          <div className="flex items-center gap-2.5">
            <Truck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">In Fulfillment</p>
              <p className="text-lg font-bold text-foreground">{inFulfillmentOrders.length}</p>
            </div>
          </div>
          <Link
            to="/orders"
            className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
          >
            Dispatch
          </Link>
        </div>

        <div className="card-base p-3.5 flex items-center justify-between border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Delivered Orders</p>
              <p className="text-lg font-bold text-foreground">{deliveredOrders.length}</p>
            </div>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            Fulfilled
          </span>
        </div>
      </div>

      {/* Supplier Trust & Reputation Banner */}
      <div className="card-base p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/5 via-card to-card border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Verified Supplier Rating</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
                {ratingData?.avg_rating ? `${ratingData.avg_rating} / 5.0` : 'New Supplier'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Public reputation calculated exclusively from verified buyer reviews after completed deliveries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right">
            <span className="text-xs font-semibold text-foreground">
              {ratingData?.total_ratings || 0} Buyer Review{ratingData?.total_ratings === 1 ? '' : 's'}
            </span>
          </div>
          <Link
            to="/profile"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors inline-flex items-center gap-1"
          >
            View Reviews <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Delivered Order Value Trend Chart */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Supplier Sales Trend</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Delivered scrap order value over the last 6 months (excluding cancelled/pending requests)
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-secondary text-foreground">
            Total Fulfilled: {formatCurrency(totalSalesValue)}
          </span>
        </div>

        <div className="h-64">
          {revenueData.some(d => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Completed Sales']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEarnings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground space-y-2">
              <Package className="h-8 w-8 text-muted-foreground/40" />
              <p>No fulfilled orders yet. Accept and deliver scrap requests to see your sales trend.</p>
            </div>
          )}
        </div>
      </div>

      {/* My Scrap Listings Section */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              My Scrap Listings ({myListings.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available scrap inventory posted for buyers on the marketplace
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Post Scrap Listing
          </button>
        </div>

        {myListings.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              You haven't posted any scrap listings yet. Post industrial scrap materials to connect with purchasing companies.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary text-xs gap-1.5 inline-flex"
            >
              <Plus className="h-3.5 w-3.5" /> Post First Listing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myListings.slice(0, 5).map(listing => (
              <div
                key={listing.id}
                className="flex items-center gap-3.5 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-border/40"
              >
                <ListingImage
                  src={listing.image_url}
                  alt={listing.title}
                  containerClassName="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative border border-border/40"
                  className="w-full h-full object-cover"
                  fallbackCategory={listing.waste_type}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{listing.title}</span>
                    <WasteBadge type={listing.waste_type as WasteType} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                    <span>
                      Available Stock: <strong className="text-foreground">{formatNumber(Number(listing.available_quantity !== undefined ? listing.available_quantity : listing.quantity))} kg</strong>
                    </span>
                    {Number(listing.reserved_quantity || 0) > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        ({formatNumber(Number(listing.reserved_quantity))} kg reserved)
                      </span>
                    )}
                    <span>· Total: {formatNumber(Number(listing.quantity))} kg</span>
                    <span>· {listing.location}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(listing.total_price))}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${listing.status === 'Available' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {listing.status}
                    </span>
                  </div>
                  {listing.status === 'Available' && (
                    <>
                      <button
                        onClick={() => setEditingListing(listing)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit Listing"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this scrap listing?')) return;
                          setDeletingId(listing.id);
                          try {
                            await deleteListing(listing.id);
                            toast.success('Scrap listing deleted successfully');
                          } catch (e: any) {
                            toast.error(e.message || 'Failed to delete listing');
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === listing.id}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete Listing"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders Received from Buyers */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Orders Received from Buyers</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Purchase and collection requests submitted by purchasing companies
            </p>
          </div>
          <Link
            to="/orders"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            Manage All Orders <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {ordersReceived.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No orders received from buyers yet.</p>
            <p className="text-xs text-muted-foreground">
              When purchasing companies place orders for your scrap materials, they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {ordersReceived.slice(0, 5).map(req => {
              const badge = getStatusBadge(req.status);
              const StatusIcon = badge.icon;
              const title = req.listing?.title || `${req.waste_type} Scrap Material`;
              const buyerDisplay = req.buyer?.company || req.buyer?.name || 'Purchasing Company';

              return (
                <div
                  key={req.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/30 px-3 -mx-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0">
                      <ListingImage
                        src={req.listing?.image_url}
                        fallbackCategory={req.waste_type}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                          {title}
                        </span>
                        <WasteBadge type={req.waste_type as WasteType} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 text-foreground font-medium">
                          <Building2 className="h-3 w-3 text-primary" />
                          {buyerDisplay}
                        </span>
                        <span>•</span>
                        <span>Quantity: <strong className="text-foreground">{formatNumber(req.quantity)} kg</strong></span>
                        <span>•</span>
                        <span>{formatRelativeTime(req.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(req.amount)}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatCurrency(req.price_per_kg)}/kg
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      <span>{badge.label}</span>
                    </span>

                    <Link
                      to="/orders"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Manage</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Listing Modal */}
      <EditListingModal
        listing={editingListing}
        isOpen={!!editingListing}
        onClose={() => setEditingListing(null)}
      />

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
