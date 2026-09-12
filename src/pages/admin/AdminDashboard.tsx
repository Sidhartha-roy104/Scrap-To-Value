/**
 * pages/admin/AdminDashboard.tsx
 * ------------------------------
 * Executive Administration & Operational Overview.
 * Displays real-time database KPIs, operational pipeline distribution, recent attention items, and quick management links.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getAdminStats,
  getAdminOrders,
  getAdminActivityLogs,
} from '@/services/adminService';
import {
  Users,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  AlertTriangle,
  XCircle,
  IndianRupee,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Scale,
  ArrowRight,
  ShieldAlert,
  Sliders,
  CheckCircle,
  UserCheck,
  Layers,
  CreditCard,
  FileText,
  Settings,
  ArrowUpRight,
  PackageCheck,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/data/mockData';
import { WasteBadge } from '@/components/WasteBadge';
import { WasteType } from '@/data/mockData';

export default function AdminDashboard() {
  const { data: stats, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin_overview_stats'],
    queryFn: async () => {
      const res = await getAdminStats();
      return res.data?.stats;
    },
    staleTime: 1000 * 30,
  });

  // Recent orders requiring attention (pending, awaiting payment, disputed)
  const { data: recentOrdersData } = useQuery({
    queryKey: ['admin_overview_recent_orders'],
    queryFn: async () => {
      const res = await getAdminOrders({ limit: 5 });
      return res.data?.orders ?? [];
    },
    staleTime: 1000 * 30,
  });

  // Recent activity logs
  const { data: activityData } = useQuery({
    queryKey: ['admin_overview_recent_activity'],
    queryFn: async () => {
      const res = await getAdminActivityLogs({ limit: 5 });
      return res.data?.logs ?? [];
    },
    staleTime: 1000 * 30,
  });

  const recentOrders = recentOrdersData ?? [];
  const recentLogs = activityData ?? [];

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold tracking-wider uppercase">
              Operational Command
            </span>
            <span className="text-xs text-muted-foreground">• Real Database Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Executive Administration Console</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Monitor platform metrics, user directory, fulfillment lifecycle, settlements, and dispute adjudications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Aggregating live platform metrics from MySQL...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center bg-destructive/5 border-destructive/20 space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Failed to load platform metrics</h3>
          <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : 'Database error'}</p>
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {/* ========================================================================= */}
          {/* 1. TOP KPI CARDS GRID                                                     */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Platform Users */}
            <Link
              to="/admin/users"
              className="card-base p-4 border border-border hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">Users</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-extrabold text-foreground mt-2 group-hover:text-primary transition-colors">
                {stats.users.total}
              </p>
              <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                <span>{stats.users.buyers} Buyers</span>
                <span>{stats.users.sellers} Sellers</span>
              </div>
            </Link>

            {/* Active Buyers */}
            <Link
              to="/admin/buyers"
              className="card-base p-4 border border-border hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">Buyers</span>
                <UserCheck className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-extrabold text-foreground mt-2 group-hover:text-primary transition-colors">
                {stats.users.buyers}
              </p>
              <span className="text-[10px] text-muted-foreground mt-1 block">Recyclers & factories</span>
            </Link>

            {/* Active Sellers */}
            <Link
              to="/admin/sellers"
              className="card-base p-4 border border-border hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">Sellers</span>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-foreground mt-2 group-hover:text-primary transition-colors">
                {stats.users.sellers}
              </p>
              <span className="text-[10px] text-muted-foreground mt-1 block">Scrap suppliers</span>
            </Link>

            {/* Total Orders */}
            <Link
              to="/admin/orders"
              className="card-base p-4 border border-border hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">Orders</span>
                <ShoppingBag className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-foreground mt-2 group-hover:text-primary transition-colors">
                {stats.orders.total}
              </p>
              <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                <span>{stats.orders.delivered} Delivered</span>
                <span>{stats.orders.pending} Pending</span>
              </div>
            </Link>

            {/* In Fulfillment */}
            <Link
              to="/admin/fulfillment"
              className="card-base p-4 border border-border hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">Fulfillment</span>
                <Truck className="h-4 w-4 text-cyan-500" />
              </div>
              <p className="text-2xl font-extrabold text-foreground mt-2 group-hover:text-primary transition-colors">
                {stats.orders.ready_for_pickup + stats.orders.in_transit}
              </p>
              <span className="text-[10px] text-muted-foreground mt-1 block">Ready / In-transit batches</span>
            </Link>

            {/* Active Disputes */}
            <Link
              to="/admin/disputes"
              className={`card-base p-4 border transition-all group ${
                stats.disputes.open > 0 ? 'border-purple-500/40 bg-purple-500/5' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">Disputes</span>
                <ShieldAlert className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
                {stats.disputes.active}
              </p>
              <span className="text-[10px] text-muted-foreground mt-1 block">
                {stats.disputes.open} open for review
              </span>
            </Link>
          </div>

          {/* Secondary Financial & Volume Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/admin/inventory"
              className="card-base p-4 bg-secondary/30 border border-border flex items-center gap-4 hover:border-primary/40 transition-colors"
            >
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Fulfilled Scrap Quantity</span>
                <p className="text-xl font-extrabold text-foreground">
                  {formatNumber(stats.orders.total_fulfilled_quantity)} <span className="text-xs font-normal text-muted-foreground">kg</span>
                </p>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatNumber(stats.inventory.available_quantity)} kg stock available
                </span>
              </div>
            </Link>

            <Link
              to="/admin/payments"
              className="card-base p-4 bg-secondary/30 border border-border flex items-center gap-4 hover:border-primary/40 transition-colors"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                <IndianRupee className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Captured Platform Payments</span>
                <p className="text-xl font-extrabold text-primary">
                  {formatCurrency(stats.payments.total_succeeded_amount)}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {stats.payments.succeeded} successful checkouts
                </span>
              </div>
            </Link>

            <Link
              to="/admin/orders?status=awaiting_payment"
              className="card-base p-4 bg-secondary/30 border border-border flex items-center gap-4 hover:border-primary/40 transition-colors"
            >
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 flex-shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Awaiting Buyer Payment</span>
                <p className="text-xl font-extrabold text-orange-600 dark:text-orange-400">
                  {stats.orders.awaiting_payment} <span className="text-xs font-normal text-muted-foreground">orders</span>
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Accepted by seller, pending checkout
                </span>
              </div>
            </Link>
          </div>

          {/* ========================================================================= */}
          {/* 2. ORDER LIFECYCLE DISTRIBUTION PROGRESSION                               */}
          {/* ========================================================================= */}
          <div className="card-base p-5 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Order Pipeline Distribution
                </h3>
                <p className="text-xs text-muted-foreground">Real-time status breakdown across all collection requests</p>
              </div>
              <Link to="/admin/orders" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                <span>View All Orders</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-center">
              <Link
                to="/admin/orders?status=pending"
                className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Pending</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{stats.orders.pending}</p>
              </Link>

              <Link
                to="/admin/orders?status=awaiting_payment"
                className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
              >
                <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 block">To Pay</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{stats.orders.awaiting_payment}</p>
              </Link>

              <Link
                to="/admin/orders?status=confirmed"
                className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Confirmed</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{stats.orders.confirmed}</p>
              </Link>

              <Link
                to="/admin/orders?status=ready_for_pickup"
                className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
              >
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Pickup</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{stats.orders.ready_for_pickup}</p>
              </Link>

              <Link
                to="/admin/orders?status=in_transit"
                className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
              >
                <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 block">Transit</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{stats.orders.in_transit}</p>
              </Link>

              <Link
                to="/admin/orders?status=delivered"
                className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Delivered</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{stats.orders.delivered}</p>
              </Link>

              <Link
                to="/admin/orders?status=cancelled"
                className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
              >
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Cancelled</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{stats.orders.cancelled}</p>
              </Link>

              <Link
                to="/admin/orders?status=disputed"
                className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
              >
                <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Disputed</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{stats.orders.disputed}</p>
              </Link>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. OPERATIONAL SECTIONS: RECENT ORDERS & AUDIT TRAIL                       */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders Requiring Attention */}
            <div className="card-base p-5 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    Recent Orders
                  </h3>
                  <p className="text-xs text-muted-foreground">Latest collection requests received on platform</p>
                </div>
                <Link to="/admin/orders" className="text-xs text-primary font-semibold hover:underline">
                  Manage
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No orders recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 rounded-lg bg-secondary/20 border border-border/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-bold text-foreground">
                            #{ord.id.slice(0, 8).toUpperCase()}
                          </span>
                          <WasteBadge type={ord.waste_type as WasteType} size="sm" />
                        </div>
                        <p className="text-muted-foreground truncate">
                          Buyer: <strong>{ord.buyer.name}</strong> • Seller: {ord.seller.name}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-foreground block">
                          {formatCurrency(ord.amount)}
                        </span>
                        <span className="text-[10px] font-mono text-primary font-semibold uppercase">
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent System Activity Log */}
            <div className="card-base p-5 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Recent Operational Activity
                  </h3>
                  <p className="text-xs text-muted-foreground">Live event stream from fulfillment, disputes, and checkouts</p>
                </div>
                <Link to="/admin/activity-logs" className="text-xs text-primary font-semibold hover:underline">
                  View All
                </Link>
              </div>

              {recentLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No activity events logged yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-secondary/15 border border-border/50 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-secondary text-foreground">
                            {log.category}
                          </span>
                          <span className="font-semibold text-foreground truncate">{log.action}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Actor: {log.actor_name} ({log.actor_role})
                        </p>
                      </div>

                      <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. OPERATIONAL CONTROL SHORTCUTS                                           */}
          {/* ========================================================================= */}
          <div className="card-base p-5 border border-border space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary" />
              Administrative Operations Shortcuts
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <Link
                to="/admin/sellers"
                className="p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border/70 text-xs font-medium text-foreground flex items-center gap-2 transition-colors"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Verify Sellers</span>
              </Link>

              <Link
                to="/admin/buyers"
                className="p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border/70 text-xs font-medium text-foreground flex items-center gap-2 transition-colors"
              >
                <UserCheck className="h-4 w-4 text-blue-500" />
                <span>Buyer Directory</span>
              </Link>

              <Link
                to="/admin/listings"
                className="p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border/70 text-xs font-medium text-foreground flex items-center gap-2 transition-colors"
              >
                <Package className="h-4 w-4 text-amber-500" />
                <span>Moderate Listings</span>
              </Link>

              <Link
                to="/admin/inventory"
                className="p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border/70 text-xs font-medium text-foreground flex items-center gap-2 transition-colors"
              >
                <Layers className="h-4 w-4 text-cyan-500" />
                <span>Inventory Ledger</span>
              </Link>

              <Link
                to="/admin/payments"
                className="p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border/70 text-xs font-medium text-foreground flex items-center gap-2 transition-colors"
              >
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Audit Payments</span>
              </Link>

              <Link
                to="/admin/settings"
                className="p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border/70 text-xs font-medium text-foreground flex items-center gap-2 transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>System Settings</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
