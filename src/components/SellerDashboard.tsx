import { useMemo, useState } from 'react';
import {
  IndianRupee,
  Package,
  ListChecks,
  Leaf,
  ArrowUpRight,
  Eye,
  Trash2,
  Pencil,
  ChevronDown,
} from 'lucide-react';
import { EditListingModal } from '@/components/EditListingModal';
import type { DbWasteListing } from '@/hooks/useWasteListings';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/StatCard';
import { WasteBadge } from '@/components/WasteBadge';
import { useTransactions, DbTransaction } from '@/hooks/useTransactions';
import { useWasteListings } from '@/hooks/useWasteListings';
import { useGreenScore } from '@/hooks/useGreenScore';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatNumber, formatRelativeTime, WasteType } from '@/data/mockData';
import { StatCardSkeleton, ChartSkeleton } from '@/components/Skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const STATUS_FLOW = ['Processing', 'Shipped', 'Delivered'] as const;

export function SellerDashboard() {
  const { user } = useAuth();
  const { stats, recentTransactions, isLoading: txLoading } = useTransactions();
  const { listings, isLoading: listingsLoading } = useWasteListings();
  const { scoreData, isLoading: scoreLoading } = useGreenScore();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<DbWasteListing | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isLoading = txLoading || listingsLoading || scoreLoading;

  const updateOrderStatus = async (tx: DbTransaction, newStatus: string) => {
    setUpdatingId(tx.id);
    try {
      const existingUpdates = (tx.tracking_updates as Array<{ status: string; timestamp: string; note?: string }>) || [];
      const newUpdates = [...existingUpdates, { status: newStatus, timestamp: new Date().toISOString() }];
      
      const updateData: Record<string, unknown> = {
        status: newStatus === 'Delivered' ? 'Completed' : newStatus,
        tracking_updates: newUpdates,
      };
      if (newStatus === 'Shipped') {
        const est = new Date();
        est.setDate(est.getDate() + 5);
        updateData.estimated_delivery = est.toISOString();
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', tx.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Order updated to ${newStatus}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  };

  const myListings = useMemo(
    () => listings.filter(l => l.user_id === user?.id),
    [listings, user]
  );
  const activeListings = myListings.filter(l => l.status === 'Available');

  // Orders received (transactions where I'm the seller)
  const ordersReceived = useMemo(
    () => recentTransactions.filter(t => t.seller_id === user?.id),
    [recentTransactions, user]
  );

  const revenueData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months[monthNames[d.getMonth()]] = 0;
    }
    ordersReceived.filter(t => t.status === 'Completed').forEach(t => {
      const key = monthNames[new Date(t.created_at).getMonth()];
      if (months[key] !== undefined) months[key] += Number(t.amount);
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [ordersReceived]);

  const displayName = user?.user_metadata?.full_name || user?.email || 'Seller';

  if (isLoading) {
    return (
      <div className="container-main py-8 space-y-6">
        <div><h1 className="text-2xl font-semibold text-foreground">Seller Dashboard</h1><p className="text-muted-foreground mt-1">Loading…</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}</div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Seller Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {displayName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Earnings" value={formatCurrency(stats.totalRevenue)} icon={IndianRupee} iconColor="text-primary" iconBgColor="bg-primary/10" />
        <StatCard label="Waste Sold" value={`${formatNumber(stats.totalWasteSold)} kg`} icon={Package} iconColor="text-accent" iconBgColor="bg-accent/10" />
        <StatCard label="Active Listings" value={formatNumber(activeListings.length)} icon={ListChecks} iconColor="text-warning" iconBgColor="bg-warning/10" />
        <StatCard label="Orders Received" value={formatNumber(ordersReceived.length)} icon={Leaf} iconColor="text-success" iconBgColor="bg-success/10" />
      </div>

      {/* Earnings Chart */}
      <div className="card-base p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Earnings Trend</h3>
        <div className="h-64">
          {revenueData.some(d => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs><linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.3}/><stop offset="95%" stopColor="#059669" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [formatCurrency(value), 'Earnings']} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No earnings yet. Sell waste to see your trend.</div>
          )}
        </div>
      </div>

      {/* My Listings */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">My Listings ({myListings.length})</h3>
        </div>
        {myListings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">You haven't posted any listings yet. Go to Marketplace to create one.</p>
        ) : (
          <div className="space-y-3">
            {myListings.slice(0, 5).map(listing => (
              <div key={listing.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{listing.title}</span>
                    <WasteBadge type={listing.waste_type as WasteType} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground">{formatNumber(Number(listing.quantity))}kg · {listing.location}</p>
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
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this listing?')) return;
                          setDeletingId(listing.id);
                          try {
                            const { deleteListing } = await import('@/hooks/useWasteListings').then(m => ({ deleteListing: null }));
                            await supabase.from('waste_listings').delete().eq('id', listing.id);
                            queryClient.invalidateQueries({ queryKey: ['waste_listings'] });
                            toast.success('Listing deleted');
                          } catch (e: any) {
                            toast.error(e.message || 'Failed to delete');
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === listing.id}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
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

      {/* Recent Orders */}
      <div className="card-base p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Recent Orders Received</h3>
        {ordersReceived.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No orders received yet.</p>
        ) : (
          <div className="space-y-3">
            {ordersReceived.slice(0, 5).map(tx => {
              const currentIdx = STATUS_FLOW.indexOf(tx.status === 'Completed' ? 'Delivered' : tx.status as any);
              const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
              const displayStatus = tx.status === 'Completed' ? 'Delivered' : tx.status;
              
              return (
                <div key={tx.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{tx.waste_type}</span>
                    <p className="text-sm text-muted-foreground">{formatNumber(Number(tx.quantity))}kg · {displayStatus}</p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    <div>
                      <p className="text-sm font-semibold text-success">{formatCurrency(Number(tx.amount))}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.created_at)}</p>
                    </div>
                    {nextStatus && (
                      <button
                        onClick={() => updateOrderStatus(tx, nextStatus)}
                        disabled={updatingId === tx.id}
                        className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {updatingId === tx.id ? '…' : `Mark ${nextStatus}`}
                      </button>
                    )}
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
    </div>
  );
}
