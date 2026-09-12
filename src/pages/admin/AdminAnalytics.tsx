/**
 * pages/admin/AdminAnalytics.tsx
 * ------------------------------
 * Platform Operational Analytics & Intelligence.
 * Visual charts and aggregate performance metrics for volume, material distribution, and order velocity.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAdminAnalytics,
  getAdminStats,
} from '@/services/adminService';
import {
  BarChart3,
  TrendingUp,
  Package,
  IndianRupee,
  Users,
  ShieldAlert,
  Calendar,
  Loader2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/data/mockData';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export default function AdminAnalytics() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin_analytics'],
    queryFn: async () => {
      const res = await getAdminAnalytics();
      return res.data;
    },
    staleTime: 1000 * 30,
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin_analytics_stats'],
    queryFn: async () => {
      const res = await getAdminStats();
      return res.data?.stats;
    },
    staleTime: 1000 * 30,
  });

  if (isLoading) {
    return (
      <div className="card-base p-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Aggregating platform operational telemetry...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold text-rose-500">Failed to load platform analytics</p>
        <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
        <button onClick={() => refetch()} className="btn-primary text-xs px-3 py-1.5">
          Retry
        </button>
      </div>
    );
  }

  const dailyTrends = data?.daily_trends ?? [];
  const categories = data?.category_distribution ?? [];
  const userDist = data?.user_distribution ?? [];
  const disputeDist = data?.dispute_distribution ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Platform Analytics & Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time transactional trends, material category adoption, and order fulfillment throughput.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
            Total Fulfilled Scrap: <strong className="text-foreground">{formatNumber(statsData?.orders?.total_fulfilled_quantity || 0)} kg</strong>
          </span>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-base p-4 border border-border">
          <span className="text-[11px] font-medium text-muted-foreground block">Active Buyers</span>
          <p className="text-xl font-extrabold text-foreground mt-1">
            {statsData?.users?.buyers || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">Recycling & processing enterprises</span>
        </div>

        <div className="card-base p-4 border border-border">
          <span className="text-[11px] font-medium text-muted-foreground block">Active Sellers</span>
          <p className="text-xl font-extrabold text-foreground mt-1">
            {statsData?.users?.sellers || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">Industrial & commercial scrap generators</span>
        </div>

        <div className="card-base p-4 border border-border">
          <span className="text-[11px] font-medium text-muted-foreground block">Delivered Orders</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {statsData?.orders?.delivered || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">Out of {statsData?.orders?.total || 0} total requests</span>
        </div>

        <div className="card-base p-4 border border-border">
          <span className="text-[11px] font-medium text-muted-foreground block">Captured Revenue</span>
          <p className="text-xl font-extrabold text-primary mt-1">
            {formatCurrency(statsData?.payments?.total_succeeded_amount || 0)}
          </p>
          <span className="text-[10px] text-muted-foreground">Settled through gateway</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Orders & Delivery Trend */}
        <div className="card-base p-5 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Order Volume Velocity (Last 14 Days)</h3>
              <p className="text-[11px] text-muted-foreground">Daily incoming orders versus successfully delivered batches</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {dailyTrends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                No orders recorded in the last 14 days
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrends}>
                  <defs>
                    <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="delivGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders Placed"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#orderGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    name="Orders Delivered"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#delivGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Scrap Material Category Distribution */}
        <div className="card-base p-5 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Scrap Volume by Waste Category</h3>
              <p className="text-[11px] text-muted-foreground">Cumulative kilograms ordered across scrap types</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {categories.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                No scrap volume categorized yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="waste_type" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val: number) => [`${formatNumber(val)} kg`, 'Quantity']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="quantity_kg" name="Weight (kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="card-base overflow-hidden border border-border">
        <div className="p-4 border-b border-border bg-secondary/20">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Material Breakdown Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="py-2.5 px-4">Waste Category</th>
                <th className="py-2.5 px-4 text-center">Orders Count</th>
                <th className="py-2.5 px-4 text-right">Total Quantity (kg)</th>
                <th className="py-2.5 px-4 text-right">Gross Transacted Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {categories.map((c) => (
                <tr key={c.waste_type} className="hover:bg-secondary/20">
                  <td className="py-2.5 px-4 font-semibold capitalize text-foreground">
                    {c.waste_type}
                  </td>
                  <td className="py-2.5 px-4 text-center font-bold text-foreground">
                    {c.orders}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {formatNumber(c.quantity_kg)} kg
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-foreground">
                    {formatCurrency(c.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
