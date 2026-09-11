import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  IndianRupee,
  ShoppingCart,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  ArrowRight,
  Eye,
  ShoppingBag,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/StatCard';
import { WasteBadge } from '@/components/WasteBadge';
import { useAuth } from '@/hooks/useAuth';
import { getRequests, type CollectionRequest } from '@/services/requestService';
import { formatCurrency, formatNumber, formatRelativeTime, WasteType } from '@/data/mockData';
import { StatCardSkeleton, ChartSkeleton } from '@/components/Skeleton';
import { getStatusBadge } from '@/pages/BuyerOrders';
import { ListingImage } from '@/components/ListingImage';

export function BuyerDashboard() {
  const { user } = useAuth();

  // Fetch buyer collection requests from backend
  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['buyer_requests'],
    queryFn: async () => {
      const res = await getRequests({ limit: 100 });
      return res.data?.requests ?? [];
    },
    staleTime: 1000 * 20, // 20s
  });

  const myRequests: CollectionRequest[] = data ?? [];

  // Summary Metrics
  const totalOrders = myRequests.length;
  const pendingRequests = useMemo(
    () => myRequests.filter(r => r.status === 'pending').length,
    [myRequests]
  );
  const confirmedOrders = useMemo(
    () => myRequests.filter(r => r.status === 'confirmed').length,
    [myRequests]
  );
  const inTransitOrders = useMemo(
    () => myRequests.filter(r => r.status === 'in_transit').length,
    [myRequests]
  );
  const deliveredOrders = useMemo(
    () => myRequests.filter(r => r.status === 'delivered').length,
    [myRequests]
  );

  // Financial summary: total value of delivered + active orders
  const totalSpent = useMemo(
    () => myRequests
      .filter(r => r.status === 'delivered' || r.status === 'confirmed' || r.status === 'in_transit')
      .reduce((acc, r) => acc + (r.amount || 0), 0),
    [myRequests]
  );

  // Spending chart by month
  const spendingData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months[monthNames[d.getMonth()]] = 0;
    }

    myRequests
      .filter(r => r.status !== 'cancelled')
      .forEach(r => {
        const d = new Date(r.created_at);
        const key = monthNames[d.getMonth()];
        if (months[key] !== undefined) {
          months[key] += r.amount || 0;
        }
      });

    return Object.entries(months).map(([month, spent]) => ({ month, spent }));
  }, [myRequests]);

  // Latest 3-5 requests
  const recentOrders = useMemo(
    () => myRequests.slice(0, 5),
    [myRequests]
  );

  const displayName = user?.full_name || user?.email || 'Buyer';

  if (isLoading) {
    return (
      <div className="container-main py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Buyer Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading your activity...</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Buyer Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <strong className="text-foreground">{displayName}</strong>. Here is your scrap procurement overview.
          </p>
        </div>

        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Browse Marketplace</span>
        </Link>
      </div>

      {/* 5 Required Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Orders"
          value={formatNumber(totalOrders)}
          icon={ShoppingCart}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <StatCard
          label="Pending Requests"
          value={formatNumber(pendingRequests)}
          icon={Clock}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatCard
          label="Confirmed Orders"
          value={formatNumber(confirmedOrders)}
          icon={CheckCircle2}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatCard
          label="In Transit"
          value={formatNumber(inTransitOrders)}
          icon={Truck}
          iconColor="text-cyan-500"
          iconBgColor="bg-cyan-500/10"
        />
        <StatCard
          label="Delivered"
          value={formatNumber(deliveredOrders)}
          icon={Package}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
      </div>

      {/* Spending Trend & Summary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-base p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Procurement Spending Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Estimated order volume over the last 6 months</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-secondary text-foreground">
              Total: {formatCurrency(totalSpent)}
            </span>
          </div>

          <div className="h-60">
            {spendingData.some(d => d.spent > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Spend']}
                  />
                  <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground space-y-2">
                <Package className="h-8 w-8 text-muted-foreground/50" />
                <p>No order transactions yet. Discover materials in the marketplace to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Procurement Highlights */}
        <div className="card-base p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">Procurement Highlights</h3>
            <p className="text-xs text-muted-foreground">Key health metrics for your account</p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-lg bg-secondary/40 border border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <IndianRupee className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Order Value</p>
                  <p className="text-sm font-bold text-foreground">{formatCurrency(totalSpent)}</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-secondary/40 border border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed Deliveries</p>
                  <p className="text-sm font-bold text-foreground">{deliveredOrders} orders</p>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/orders"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors"
          >
            <span>Go to My Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Orders Section (3-5 items) */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Orders</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Your latest scrap collection and procurement requests</p>
          </div>
          <Link
            to="/orders"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
          >
            View All Orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              No orders placed yet. Browse listings in the marketplace to create your first scrap request.
            </p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Browse Marketplace</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {recentOrders.map(order => {
              const badge = getStatusBadge(order.status);
              const StatusIcon = badge.icon;
              const title = order.listing?.title || `${order.waste_type} Scrap`;

              return (
                <div
                  key={order.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/30 px-3 -mx-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0">
                      <ListingImage
                        src={order.listing?.image_url}
                        fallbackCategory={order.waste_type}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                          {title}
                        </span>
                        <WasteBadge type={order.waste_type as WasteType} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Requested: <strong className="text-foreground">{formatNumber(order.quantity)} kg</strong></span>
                        <span>•</span>
                        <span>Seller: {order.seller?.name || 'Seller'}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(order.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(order.amount)}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatCurrency(order.price_per_kg)}/kg
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
                      <span>View Order</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
