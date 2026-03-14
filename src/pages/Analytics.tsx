import { useState, useMemo } from 'react';
import { 
  Package, 
  Leaf, 
  Handshake, 
  IndianRupee,
  Download,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { StatCard } from '@/components/StatCard';
import { StatCardSkeleton, ChartSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useTransactions } from '@/hooks/useTransactions';
import { useWasteListings } from '@/hooks/useWasteListings';
import { formatCurrency, formatNumber, WasteType } from '@/data/mockData';

const dateRanges = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 3 months', value: 90 },
  { label: 'Last 6 months', value: 180 },
];

export default function Analytics() {
  const { stats, transactions, isLoading: txLoading } = useTransactions();
  const { listings, isLoading: listingsLoading } = useWasteListings();
  const [selectedRange, setSelectedRange] = useState(30);

  const isLoading = txLoading || listingsLoading;

  // Build monthly revenue from real transactions
  const revenueData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months: Record<string, { revenue: number; transactions: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = monthNames[d.getMonth()];
      months[key] = { revenue: 0, transactions: 0 };
    }
    transactions.filter(t => t.status === 'Completed').forEach(t => {
      const d = new Date(t.created_at);
      const key = monthNames[d.getMonth()];
      if (months[key]) {
        months[key].revenue += Number(t.amount);
        months[key].transactions += 1;
      }
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  }, [transactions]);

  // Build waste breakdown from listings
  const wasteBreakdown = useMemo(() => {
    const byType: Record<string, number> = {};
    listings.forEach(l => {
      byType[l.waste_type] = (byType[l.waste_type] || 0) + Number(l.quantity);
    });
    return Object.entries(byType).map(([name, quantity]) => ({ name, quantity }));
  }, [listings]);

  // Transaction timeline (last 30 days)
  const transactionTimelineData = useMemo(() => {
    const last30Days: { date: string; amount: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayTx = transactions.filter(t => {
        const tDate = new Date(t.created_at);
        return tDate.toDateString() === date.toDateString() && t.status === 'Completed';
      });
      last30Days.push({
        date: dateStr,
        amount: dayTx.reduce((sum, t) => sum + Number(t.amount), 0),
        count: dayTx.length,
      });
    }
    return last30Days;
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="container-main py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">Track your environmental impact</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your environmental impact</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(Number(e.target.value))}
              className="input-base appearance-none pr-10 min-w-[160px]"
            >
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <button className="btn-outline gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Waste Diverted"
          value={`${formatNumber(stats.totalWasteSold)} kg`}
          icon={Package}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <StatCard
          label="Carbon Saved"
          value={`${(stats.carbonSaved / 1000).toFixed(1)} tons`}
          icon={Leaf}
          iconColor="text-success"
          iconBgColor="bg-success/10"
        />
        <StatCard
          label="Deals Completed"
          value={formatNumber(stats.completedDeals)}
          icon={Handshake}
          iconColor="text-accent"
          iconBgColor="bg-accent/10"
        />
        <StatCard
          label="Avg. Price"
          value={stats.averagePrice > 0 ? `${formatCurrency(Math.round(stats.averagePrice))}/kg` : '—'}
          icon={IndianRupee}
          iconColor="text-warning"
          iconBgColor="bg-warning/10"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="card-base p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Monthly Revenue</h3>
          <div className="h-64">
            {revenueData.some(d => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No revenue data yet</div>
            )}
          </div>
        </div>

        {/* Waste Types Breakdown */}
        <div className="card-base p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Waste Types Breakdown</h3>
          <div className="h-64">
            {wasteBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteBreakdown} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k kg`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${formatNumber(value)} kg`, 'Quantity']} />
                  <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No listings yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Timeline */}
      <div className="card-base p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Transaction Timeline (Last 14 Days)</h3>
        <div className="h-64">
          {transactionTimelineData.some(d => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transactionTimelineData.slice(-14)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} interval={1} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number, name: string) => [name === 'amount' ? formatCurrency(value) : value, name === 'amount' ? 'Revenue' : 'Transactions']} />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No transactions yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
