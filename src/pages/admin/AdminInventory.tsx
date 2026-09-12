/**
 * pages/admin/AdminInventory.tsx
 * ------------------------------
 * Platform Inventory Overview & Audit Ledger.
 * Displays global scrap stock (available, reserved, fulfilled) and real-time inventory ledger transactions.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAdminInventory,
  getInventoryTransactions,
  type AdminInventoryItem,
  type InventoryTransaction,
} from '@/services/adminService';
import {
  Layers,
  Search,
  Filter,
  Package,
  Calendar,
  IndianRupee,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  History,
  Scale,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { WasteBadge } from '@/components/WasteBadge';
import { WasteType, formatCurrency, formatNumber, formatRelativeTime } from '@/data/mockData';

const MATERIALS = ['All', 'plastic', 'metal', 'paper', 'glass', 'electronic', 'organic'];

export default function AdminInventory() {
  const [activeTab, setActiveTab] = useState<'listings' | 'transactions'>('listings');
  const [search, setSearch] = useState('');
  const [material, setMaterial] = useState('All');
  const [page, setPage] = useState(1);

  // 1. Fetch Inventory Summary & Listings
  const { data: inventoryData, isLoading: inventoryLoading, isError: isInventoryError, error: inventoryError } = useQuery({
    queryKey: ['admin_inventory', search, material, page],
    queryFn: async () => {
      const res = await getAdminInventory({
        search: search.trim() || undefined,
        material: material === 'All' ? undefined : material,
        page,
        limit: 15,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
    enabled: activeTab === 'listings',
  });

  // 2. Fetch Inventory Transaction Audit Log
  const { data: txData, isLoading: txLoading, isError: isTxError, error: txError } = useQuery({
    queryKey: ['admin_inventory_tx', page],
    queryFn: async () => {
      const res = await getInventoryTransactions({
        page,
        limit: 20,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
    enabled: activeTab === 'transactions',
  });

  const summary = inventoryData?.summary;
  const items = inventoryData?.inventory ?? [];
  const transactions = txData?.transactions ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Inventory Overview & Audit Ledger
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time scrap quantity reservations, fulfillment metrics, and immutable transaction history.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center p-1 rounded-xl bg-secondary/60 border border-border">
          <button
            onClick={() => {
              setActiveTab('listings');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'listings'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inventory by Listing
          </button>
          <button
            onClick={() => {
              setActiveTab('transactions');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'transactions'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Transaction Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Platform Inventory Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-base p-4 border border-border">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Cataloged Stock</span>
          <p className="text-xl font-extrabold text-foreground mt-1">
            {formatNumber(summary?.total_quantity || 0)} <span className="text-xs font-normal text-muted-foreground">kg</span>
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Across {summary?.total_listings || 0} active listings
          </span>
        </div>

        <div className="card-base p-4 border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">Available For Order</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatNumber(summary?.total_available || 0)} <span className="text-xs font-normal text-muted-foreground">kg</span>
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Immediate purchase capacity</span>
        </div>

        <div className="card-base p-4 border border-amber-500/20 bg-amber-500/5">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">Reserved (In Orders)</span>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {formatNumber(summary?.total_reserved || 0)} <span className="text-xs font-normal text-muted-foreground">kg</span>
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Locked pending payment & pickup</span>
        </div>

        <div className="card-base p-4 border border-blue-500/20 bg-blue-500/5">
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 block">Fulfilled & Delivered</span>
          <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {formatNumber(summary?.total_fulfilled || 0)} <span className="text-xs font-normal text-muted-foreground">kg</span>
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Total recycled through platform</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INVENTORY BY LISTING                                               */}
      {/* ========================================================================= */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card-base p-4 bg-card/60 backdrop-blur-xs border border-border flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search listing title, seller..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMaterial(m);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                    material === m
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Listings Table */}
          {inventoryLoading ? (
            <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading inventory balance...</p>
            </div>
          ) : isInventoryError ? (
            <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
              <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-rose-500">Failed to load inventory data</p>
              <p className="text-xs text-muted-foreground">{(inventoryError as Error)?.message}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="card-base p-16 text-center space-y-3">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No inventory items found</p>
            </div>
          ) : (
            <div className="card-base overflow-hidden border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Material / Title</th>
                      <th className="py-3 px-4">Seller</th>
                      <th className="py-3 px-4 text-right">Available Qty</th>
                      <th className="py-3 px-4 text-right">Reserved Qty</th>
                      <th className="py-3 px-4 text-right">Fulfilled Qty</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{item.title}</div>
                          <div className="mt-0.5">
                            <WasteBadge type={item.waste_type as WasteType} size="sm" />
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{item.seller_name}</div>
                          <div className="text-[10px] text-muted-foreground">{item.seller_company || 'Independent'}</div>
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(item.available_quantity)} {item.unit}
                        </td>

                        <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {formatNumber(item.reserved_quantity)} {item.unit}
                        </td>

                        <td className="py-3 px-4 text-right font-semibold text-blue-600 dark:text-blue-400">
                          {formatNumber(item.fulfilled_quantity)} {item.unit}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {formatCurrency(item.price_per_kg)}/{item.unit}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                              item.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {inventoryData?.totalPages && inventoryData.totalPages > 1 && (
                <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Page {page} of {inventoryData.totalPages}
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
                      disabled={page >= inventoryData.totalPages}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INVENTORY TRANSACTION LEDGER                                       */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {txLoading ? (
            <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading transaction ledger...</p>
            </div>
          ) : isTxError ? (
            <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
              <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-rose-500">Failed to load ledger transactions</p>
              <p className="text-xs text-muted-foreground">{(txError as Error)?.message}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="card-base p-16 text-center space-y-3">
              <History className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No inventory transactions recorded yet</p>
            </div>
          ) : (
            <div className="card-base overflow-hidden border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Listing</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-center">Balance Transition</th>
                      <th className="py-3 px-4">Notes / Source</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                              tx.transaction_type === 'RESERVATION'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : tx.transaction_type === 'RELEASE'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : tx.transaction_type === 'FULFILLMENT'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-secondary text-foreground'
                            }`}
                          >
                            {tx.transaction_type}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{tx.listing_title}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Listing: #{tx.listing_id.slice(0, 8)}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {formatNumber(tx.quantity)} kg
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {formatNumber(tx.previous_available_quantity)} kg →{' '}
                            <strong className="text-foreground">{formatNumber(tx.resulting_available_quantity)} kg</strong>
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-foreground truncate max-w-xs">{tx.note || 'Standard ledger event'}</div>
                          <div className="text-[10px] text-muted-foreground">{tx.source}</div>
                        </td>

                        <td className="py-3 px-4 text-right text-muted-foreground whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {txData?.totalPages && txData.totalPages > 1 && (
                <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Page {page} of {txData.totalPages}
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
                      disabled={page >= txData.totalPages}
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
      )}
    </div>
  );
}
