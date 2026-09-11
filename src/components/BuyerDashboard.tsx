import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/StatCard';
import { WasteBadge } from '@/components/WasteBadge';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatNumber, formatRelativeTime, WasteType } from '@/data/mockData';
import { StatCardSkeleton, ChartSkeleton } from '@/components/Skeleton';

export function BuyerDashboard() {
  const { user } = useAuth();
  const { transactions, isLoading } = useTransactions();

  const myPurchases = useMemo(
    () => transactions.filter(t => t.buyer_id === user?.id),
    [transactions, user]
  );

  const completedPurchases = myPurchases.filter(t => t.status === 'Completed');
  const totalSpent = completedPurchases.reduce((s, t) => s + Number(t.amount), 0);
  const totalBought = completedPurchases.reduce((s, t) => s + Number(t.quantity), 0);
  const pendingOrders = myPurchases.filter(t => t.status === 'Processing').length;

  const spendingData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months[monthNames[d.getMonth()]] = 0;
    }
    completedPurchases.forEach(t => {
      const key = monthNames[new Date(t.created_at).getMonth()];
      if (months[key] !== undefined) months[key] += Number(t.amount);
    });
    return Object.entries(months).map(([month, spent]) => ({ month, spent }));
  }, [completedPurchases]);

  const displayName = user?.full_name || user?.email || 'Buyer';

  if (isLoading) {
    return (
      <div className="container-main py-8 space-y-6">
        <div><h1 className="text-2xl font-semibold text-foreground">Buyer Dashboard</h1><p className="text-muted-foreground mt-1">Loading…</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}</div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Buyer Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {displayName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={IndianRupee} iconColor="text-primary" iconBgColor="bg-primary/10" />
        <StatCard label="Waste Bought" value={`${formatNumber(totalBought)} kg`} icon={Package} iconColor="text-accent" iconBgColor="bg-accent/10" />
        <StatCard label="Total Orders" value={formatNumber(myPurchases.length)} icon={ShoppingCart} iconColor="text-warning" iconBgColor="bg-warning/10" />
        <StatCard label="Pending Orders" value={formatNumber(pendingOrders)} icon={TrendingUp} iconColor="text-success" iconBgColor="bg-success/10" />
      </div>

      {/* Spending Chart */}
      <div className="card-base p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Spending Trend</h3>
        <div className="h-64">
          {spendingData.some(d => d.spent > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [formatCurrency(value), 'Spent']} />
                <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No spending data yet. Purchase waste from the marketplace.</div>
          )}
        </div>
      </div>

      {/* Order History */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Order History</h3>
          <Link to="/orders" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            View All Orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {myPurchases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No purchases yet. Browse the marketplace to find waste materials.</p>
        ) : (
          <div className="space-y-3">
            {myPurchases.slice(0, 10).map(tx => (
              <Link key={tx.id} to={`/orders/${tx.id}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{tx.waste_type}</span>
                    <WasteBadge type={tx.waste_type as WasteType} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground">{formatNumber(Number(tx.quantity))}kg</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(tx.amount))}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    tx.status === 'Completed' ? 'bg-success/10 text-success' :
                    tx.status === 'Processing' ? 'bg-warning/10 text-warning' :
                    'bg-muted text-muted-foreground'
                  }`}>{tx.status}</span>
                </div>
                <p className="text-xs text-muted-foreground flex-shrink-0">{formatRelativeTime(tx.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
