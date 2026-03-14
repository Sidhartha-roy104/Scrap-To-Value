import { useMemo, useState } from 'react';
import { Package, Truck, CheckCircle2, Filter, ChevronDown, Loader2 } from 'lucide-react';
import { useTransactions, DbTransaction } from '@/hooks/useTransactions';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatNumber } from '@/data/mockData';
import { WasteBadge } from '@/components/WasteBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

type StatusFilter = 'All' | 'Processing' | 'Shipped' | 'Completed';
const STATUS_OPTIONS: StatusFilter[] = ['All', 'Processing', 'Shipped', 'Completed'];
const NEXT_STATUS: Record<string, string | null> = {
  Processing: 'Shipped',
  Shipped: 'Delivered',
  Completed: null,
  Delivered: null,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function statusBadgeClass(status: string) {
  if (status === 'Completed') return 'bg-success/10 text-success border-success/20';
  if (status === 'Shipped') return 'bg-primary/10 text-primary border-primary/20';
  return 'bg-warning/10 text-warning border-warning/20';
}

function displayStatus(status: string) {
  return status === 'Completed' ? 'Delivered' : status;
}

export default function SellerOrders() {
  const { user } = useAuth();
  const { transactions, isLoading } = useTransactions();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);

  const orders = useMemo(
    () => transactions
      .filter(t => t.seller_id === user?.id)
      .filter(t => filter === 'All' || t.status === filter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [transactions, user, filter]
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map(o => o.id)));
    }
  };

  const updateSingle = async (tx: DbTransaction, newStatus: string) => {
    setUpdating(true);
    try {
      const existing = (tx.tracking_updates as Array<{ status: string; timestamp: string }>) || [];
      const updates = [...existing, { status: newStatus, timestamp: new Date().toISOString() }];
      const updateData: Record<string, unknown> = {
        status: newStatus === 'Delivered' ? 'Completed' : newStatus,
        tracking_updates: updates,
      };
      if (newStatus === 'Shipped') {
        const est = new Date();
        est.setDate(est.getDate() + 5);
        updateData.estimated_delivery = est.toISOString();
      }
      const { error } = await supabase.from('transactions').update(updateData).eq('id', tx.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Order updated to ${newStatus}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const bulkUpdate = async (targetStatus: string) => {
    const eligible = orders.filter(o => selected.has(o.id) && NEXT_STATUS[o.status] !== null);
    if (eligible.length === 0) {
      toast.error('No selected orders can be advanced');
      return;
    }
    setUpdating(true);
    let successCount = 0;
    for (const tx of eligible) {
      const next = NEXT_STATUS[tx.status];
      if (!next) continue;
      try {
        const existing = (tx.tracking_updates as Array<{ status: string; timestamp: string }>) || [];
        const updates = [...existing, { status: next, timestamp: new Date().toISOString() }];
        const updateData: Record<string, unknown> = {
          status: next === 'Delivered' ? 'Completed' : next,
          tracking_updates: updates,
        };
        if (next === 'Shipped') {
          const est = new Date();
          est.setDate(est.getDate() + 5);
          updateData.estimated_delivery = est.toISOString();
        }
        const { error } = await supabase.from('transactions').update(updateData).eq('id', tx.id);
        if (!error) successCount++;
      } catch {}
    }
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    toast.success(`${successCount} order(s) advanced to next status`);
    setSelected(new Set());
    setUpdating(false);
  };

  if (isLoading) {
    return (
      <div className="container-main py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedEligible = orders.filter(o => selected.has(o.id) && NEXT_STATUS[o.status] !== null).length;

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Orders Received</h1>
          <p className="text-muted-foreground mt-1">Manage and fulfill buyer orders</p>
        </div>

        {/* Bulk action */}
        {selected.size > 0 && (
          <Button
            onClick={() => bulkUpdate('next')}
            disabled={updating || selectedEligible === 0}
            size="sm"
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Advance {selectedEligible} order(s)
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => { setFilter(s); setSelected(new Set()); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {s === 'Completed' ? 'Delivered' : s}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="card-base p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">No orders found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'All' ? 'You haven\'t received any orders yet.' : `No ${filter === 'Completed' ? 'delivered' : filter.toLowerCase()} orders.`}
          </p>
        </div>
      ) : (
        <div className="card-base overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === orders.length && orders.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                </TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Waste Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => {
                const next = NEXT_STATUS[order.status];
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <WasteBadge type={order.waste_type as any} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(Number(order.quantity))} kg</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(order.amount))}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(order.status)}`}>
                        {displayStatus(order.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(order.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {next ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSingle(order, next)}
                          disabled={updating}
                          className="text-xs"
                        >
                          Mark {next}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Complete</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
