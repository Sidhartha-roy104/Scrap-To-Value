/**
 * pages/NotificationsPage.tsx
 * ----------------------------
 * Dedicated Notification Center for Buyers & Sellers.
 * Features:
 * - Category filter tabs (All, Unread, Orders, Payments, Fulfillment, Disputes)
 * - Search bar across titles and messages
 * - Mark individual/all as read & delete notifications
 * - In-app notification preferences manager
 * - Pagination and empty states
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Package,
  CreditCard,
  Truck,
  AlertTriangle,
  Info,
  CheckCheck,
  Trash2,
  Check,
  Search,
  Sliders,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
  X,
  Settings2,
} from 'lucide-react';
import {
  getNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  deleteNotification as apiDeleteNotification,
  clearAllNotifications as apiClearAllNotifications,
  type AppNotification,
  type NotificationType,
  type NotificationPreferences,
} from '@/services/notificationService';
import { formatRelativeTime } from '@/data/mockData';
import { useToastNotification } from '@/components/ToastNotification';
import { Link } from 'react-router-dom';

const FILTER_TABS = [
  { id: 'ALL', label: 'All Notifications' },
  { id: 'UNREAD', label: 'Unread Only' },
  { id: 'ORDERS', label: 'Orders' },
  { id: 'PAYMENTS', label: 'Payments' },
  { id: 'FULFILLMENT', label: 'Fulfillment' },
  { id: 'DISPUTES', label: 'Disputes' },
];

function getNotificationDetails(type: NotificationType) {
  switch (type) {
    case 'ORDER_CREATED':
    case 'ORDER_ACCEPTED':
    case 'ORDER_CONFIRMED':
    case 'deal':
      return {
        category: 'Orders',
        icon: Package,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10 border-emerald-500/25',
      };

    case 'PAYMENT_REQUIRED':
    case 'PAYMENT_SUCCEEDED':
    case 'PAYMENT_FAILED':
      return {
        category: 'Payments',
        icon: CreditCard,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10 border-amber-500/25',
      };

    case 'READY_FOR_PICKUP':
    case 'ORDER_IN_TRANSIT':
    case 'ORDER_DELIVERED':
      return {
        category: 'Fulfillment',
        icon: Truck,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10 border-blue-500/25',
      };

    case 'DISPUTE_RAISED':
    case 'DISPUTE_UNDER_REVIEW':
    case 'DISPUTE_RESOLVED':
    case 'DISPUTE_REJECTED':
      return {
        category: 'Disputes',
        icon: AlertTriangle,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10 border-rose-500/25',
      };

    case 'SELLER_VERIFICATION_UPDATED':
    case 'LISTING_FLAGGED':
    case 'ADMIN_ALERT':
    case 'SYSTEM_ALERT':
      return {
        category: 'System',
        icon: ShieldAlert,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10 border-purple-500/25',
      };

    default:
      return {
        category: 'General',
        icon: Info,
        color: 'text-muted-foreground',
        bg: 'bg-secondary border-border',
      };
  }
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();

  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Fetch notifications with pagination and unread filter
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications_page', activeTab, page],
    queryFn: async () => {
      const res = await getNotifications({
        unreadOnly: activeTab === 'UNREAD',
        page,
        limit: 15,
      });
      return res.data;
    },
    staleTime: 1000 * 15,
  });

  // Fetch preferences
  const { data: prefsData } = useQuery({
    queryKey: ['notification_preferences'],
    queryFn: async () => {
      const res = await getNotificationPreferences();
      return res.data;
    },
    enabled: preferencesOpen,
  });

  const [prefForm, setPrefForm] = useState<NotificationPreferences | null>(null);

  // Update preferences mutation
  const prefMutation = useMutation({
    mutationFn: async (updated: Partial<NotificationPreferences>) => {
      const res = await updateNotificationPreferences(updated);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_preferences'] });
      addToast({
        type: 'success',
        title: 'Preferences Updated',
        message: 'Your notification preferences have been saved successfully.',
      });
      setPreferencesOpen(false);
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not update preferences.',
      });
    },
  });

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiMarkAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications_page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread'] });
    },
  });

  // Mark all as read
  const markAllMutation = useMutation({
    mutationFn: async () => {
      await apiMarkAllAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications_page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread'] });
      addToast({
        type: 'success',
        title: 'All Caught Up',
        message: 'All notifications have been marked as read.',
      });
    },
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteNotification(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications_page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread'] });
    },
  });

  // Clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await apiClearAllNotifications();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications_page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread'] });
      addToast({
        type: 'success',
        title: 'Notifications Cleared',
        message: 'All notification history has been cleared.',
      });
    },
  });

  const rawNotifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Filter client-side by tab & search
  const filteredNotifications = rawNotifications.filter((n) => {
    // Tab filter
    if (activeTab === 'ORDERS') {
      if (!['ORDER_CREATED', 'ORDER_ACCEPTED', 'ORDER_CONFIRMED', 'ORDER_CANCELLED', 'deal'].includes(n.type)) {
        return false;
      }
    } else if (activeTab === 'PAYMENTS') {
      if (!['PAYMENT_REQUIRED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED'].includes(n.type)) {
        return false;
      }
    } else if (activeTab === 'FULFILLMENT') {
      if (!['READY_FOR_PICKUP', 'ORDER_IN_TRANSIT', 'ORDER_DELIVERED'].includes(n.type)) {
        return false;
      }
    } else if (activeTab === 'DISPUTES') {
      if (!['DISPUTE_RAISED', 'DISPUTE_UNDER_REVIEW', 'DISPUTE_RESOLVED', 'DISPUTE_REJECTED'].includes(n.type)) {
        return false;
      }
    }

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  const activePrefs = prefForm || prefsData || {
    orders_enabled: true,
    payments_enabled: true,
    fulfillment_enabled: true,
    disputes_enabled: true,
    listings_enabled: true,
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto px-4 py-6 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notification Center</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-white shadow-xs">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time operational alerts for orders, payments, fulfillment tracking, and disputes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4 text-muted-foreground" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={() => setPreferencesOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/80 hover:bg-secondary text-foreground text-xs font-semibold transition-colors"
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Preferences</span>
          </button>

          {rawNotifications.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all notifications?')) {
                  clearAllMutation.mutate();
                }
              }}
              disabled={clearAllMutation.isPending}
              className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
              title="Clear all notification history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs divide-y divide-border/60">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Fetching notifications...</p>
          </div>
        ) : isError ? (
          <div className="py-16 text-center px-4">
            <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">Could not load notifications</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-secondary/70 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Bell className="h-6 w-6 opacity-40" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No notifications found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {search
                ? `No notifications matched "${search}". Try adjusting your search query.`
                : activeTab === 'UNREAD'
                ? 'You have read all notifications!'
                : 'Your notification center is currently empty. New order, payment, and fulfillment updates will appear here.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const config = getNotificationDetails(n.type);
            const Icon = config.icon;
            const isUnread = !n.is_read;

            return (
              <div
                key={n.id}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-secondary/40 ${
                  isUnread ? 'bg-primary/[0.03]' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-xl border ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {config.category}
                      </span>
                      <h4
                        className={`text-sm font-semibold leading-tight truncate ${
                          isUnread ? 'text-foreground' : 'text-foreground/80'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="Unread" />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground/70">
                      <span>{formatRelativeTime(n.created_at || n.createdAt || '')}</span>

                      {n.link && (
                        <>
                          <span>•</span>
                          <Link
                            to={n.link}
                            onClick={() => {
                              if (!n.is_read) markReadMutation.mutate(n.id);
                            }}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          >
                            <span>Open Details</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isUnread && (
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      disabled={markReadMutation.isPending}
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(n.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-border/80 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-border/80 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {preferencesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-secondary/30">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Notification Preferences</h3>
              </div>
              <button
                onClick={() => setPreferencesOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                Control which operational event categories trigger notifications for your account.
              </p>

              <div className="space-y-3">
                {[
                  {
                    key: 'orders_enabled',
                    label: 'Order Updates',
                    desc: 'New scrap requests, acceptance alerts, and cancellations',
                  },
                  {
                    key: 'payments_enabled',
                    label: 'Payment Alerts',
                    desc: 'Payment confirmation receipts, payment required, and failed attempts',
                  },
                  {
                    key: 'fulfillment_enabled',
                    label: 'Fulfillment Logistics',
                    desc: 'Ready for pickup, dispatch in transit, and delivery notices',
                  },
                  {
                    key: 'disputes_enabled',
                    label: 'Dispute Updates',
                    desc: 'Progress alerts when a dispute status is reviewed or resolved',
                  },
                  {
                    key: 'listings_enabled',
                    label: 'Listing & Moderation Updates',
                    desc: 'Marketplace stock alerts and moderation notices',
                  },
                ].map((item) => {
                  const isChecked = Boolean(activePrefs[item.key as keyof NotificationPreferences]);

                  return (
                    <label
                      key={item.key}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          setPrefForm({
                            ...activePrefs,
                            [item.key]: e.target.checked,
                          });
                        }}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Note: </span>
                Critical security notices and required dispute resolutions will always be delivered regardless of preferences.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/80 bg-secondary/20 flex items-center justify-end gap-2">
              <button
                onClick={() => setPreferencesOpen(false)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (prefForm) {
                    prefMutation.mutate(prefForm);
                  } else {
                    setPreferencesOpen(false);
                  }
                }}
                disabled={prefMutation.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {prefMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
