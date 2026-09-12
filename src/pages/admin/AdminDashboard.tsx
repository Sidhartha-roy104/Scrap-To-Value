import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAdminStats } from '@/services/adminService';
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
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/data/mockData';

export default function AdminDashboard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const res = await getAdminStats();
      return res.data?.stats;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const stats = data;

  return (
    <div className="container-main py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold tracking-wider uppercase">
              Admin Portal
            </span>
            <span className="text-xs text-muted-foreground">• Operational Control</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">System Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time platform metrics, user directory, order fulfillment, and dispute operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Aggregating live platform metrics...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center bg-destructive/5 border-destructive/20 space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Failed to load platform metrics</h3>
          <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : 'Database error'}</p>
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <div className="card-base p-5 border-l-4 border-l-primary space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Platform Users
                </span>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">{stats.users.total}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>Buyers: <strong className="text-foreground">{stats.users.buyers}</strong></span>
                  <span>•</span>
                  <span>Sellers: <strong className="text-foreground">{stats.users.sellers}</strong></span>
                </div>
              </div>
              <Link
                to="/admin/users"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1 pt-1"
              >
                Manage Users <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Total Orders */}
            <div className="card-base p-5 border-l-4 border-l-blue-500 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Collection Orders
                </span>
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">{stats.orders.total}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Delivered: <strong className="text-foreground">{stats.orders.delivered}</strong></span>
                  <span>•</span>
                  <span>In-Flight: <strong className="text-foreground">{stats.orders.confirmed + stats.orders.ready_for_pickup + stats.orders.in_transit}</strong></span>
                </div>
              </div>
              <Link
                to="/admin/orders"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 pt-1"
              >
                Inspect All Orders <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Scrap Fulfilled Volume */}
            <div className="card-base p-5 border-l-4 border-l-emerald-500 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Scrap Fulfilled
                </span>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Scale className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {formatNumber(stats.orders.total_fulfilled_quantity)} kg
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Available in Listings: <strong>{formatNumber(stats.inventory.available_quantity)} kg</strong>
                </p>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block pt-1">
                ✓ Verified Deliveries Completed
              </span>
            </div>

            {/* Active Disputes */}
            <div className="card-base p-5 border-l-4 border-l-amber-500 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Disputes
                </span>
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">{stats.disputes.active}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Open: <strong className="text-amber-600">{stats.disputes.open}</strong></span>
                  <span>•</span>
                  <span>Under Review: <strong className="text-blue-600">{stats.disputes.under_review}</strong></span>
                </div>
              </div>
              <Link
                to="/admin/disputes"
                className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 pt-1"
              >
                Resolve Disputes <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Detailed Order Status Breakdown */}
          <div className="card-base p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                Order Lifecycle Distribution
              </h3>
              <span className="text-xs text-muted-foreground">
                Total Orders: <strong>{stats.orders.total}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block">Pending Review</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                  {stats.orders.pending}
                </span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block">Awaiting Pay</span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-0.5 block">
                  {stats.orders.awaiting_payment}
                </span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block">Confirmed</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                  {stats.orders.confirmed}
                </span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block">Ready Pickup</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {stats.orders.ready_for_pickup}
                </span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block">In Transit</span>
                <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                  {stats.orders.in_transit}
                </span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block">Delivered</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {stats.orders.delivered}
                </span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block">Cancelled</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
                  {stats.orders.cancelled}
                </span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block">Disputed</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5 block">
                  {stats.orders.disputed}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Operation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/admin/orders"
              className="card-base p-5 hover:border-primary/50 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  Order Management
                </h4>
                <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground">
                Inspect buyer & seller requests, track fulfillment milestones, and view complete audit trails.
              </p>
            </Link>

            <Link
              to="/admin/disputes"
              className="card-base p-5 hover:border-primary/50 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  Dispute Center
                </h4>
                <ShieldAlert className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground">
                Review complaints raised by buyers or sellers, enter resolution notes, and resolve cases.
              </p>
            </Link>

            <Link
              to="/admin/users"
              className="card-base p-5 hover:border-primary/50 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  User Directory
                </h4>
                <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground">
                View buyer & seller activity, inspect KYC verification status, and soft-disable suspicious accounts.
              </p>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
