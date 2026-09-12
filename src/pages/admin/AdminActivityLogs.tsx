/**
 * pages/admin/AdminActivityLogs.tsx
 * ---------------------------------
 * Global Append-Only Audit Trail.
 * Aggregates real operational events across fulfillment, disputes, and payment transactions.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAdminActivityLogs,
  type AdminActivityLog,
} from '@/services/adminService';
import {
  FileText,
  Search,
  Filter,
  Truck,
  ShieldAlert,
  CreditCard,
  User,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Shield,
} from 'lucide-react';

export default function AdminActivityLogs() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FULFILLMENT' | 'DISPUTE' | 'PAYMENT'>('ALL');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin_activity_logs', page],
    queryFn: async () => {
      const res = await getAdminActivityLogs({
        page,
        limit: 25,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
  });

  const allLogs = data?.logs ?? [];
  const filteredLogs = categoryFilter === 'ALL' ? allLogs : allLogs.filter((l) => l.category === categoryFilter);
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'FULFILLMENT':
        return {
          label: 'Fulfillment',
          className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          icon: Truck,
        };
      case 'DISPUTE':
        return {
          label: 'Dispute',
          className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          icon: ShieldAlert,
        };
      case 'PAYMENT':
        return {
          label: 'Payment',
          className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: CreditCard,
        };
      default:
        return {
          label: cat,
          className: 'bg-secondary text-muted-foreground',
          icon: Clock,
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Global Activity & Audit Logs
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable chronological ledger of fulfillment state transitions, dispute adjudications, and gateway payments.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border">
          {(['ALL', 'FULFILLMENT', 'DISPUTE', 'PAYMENT'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                categoryFilter === cat
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat === 'ALL' ? 'All Events' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading audit ledger entries...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-500">Failed to load activity logs</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <button onClick={() => refetch()} className="btn-primary text-xs px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card-base p-16 text-center space-y-3">
          <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No activity logs found</p>
        </div>
      ) : (
        <div className="card-base overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Event Category</th>
                  <th className="py-3 px-4">Action & Operational Details</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map((log) => {
                  const badge = getCategoryBadge(log.category);
                  const Icon = badge.icon;

                  return (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}
                        >
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="font-semibold text-foreground">{log.action}</div>
                        {log.notes && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 italic truncate">
                            "{log.notes}"
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        #{log.reference_id ? log.reference_id.slice(0, 8).toUpperCase() : 'N/A'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{log.actor_name}</div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          Role: {log.actor_role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({total} audit events)
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
    </div>
  );
}
