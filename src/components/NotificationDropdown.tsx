/**
 * components/NotificationDropdown.tsx
 * -----------------------------------
 * Interactive notifications dropdown for buyer & seller top navigation.
 * Displays live database notifications, unread counts, and quick navigation links.
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Package,
  CreditCard,
  Truck,
  AlertTriangle,
  Info,
  CheckCheck,
  Trash2,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useNotifications, type NotificationType, type AppNotification } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/data/mockData';

function getNotificationConfig(type: NotificationType) {
  switch (type) {
    case 'ORDER_CREATED':
    case 'ORDER_ACCEPTED':
    case 'ORDER_CONFIRMED':
    case 'deal':
      return {
        icon: Package,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      };

    case 'PAYMENT_REQUIRED':
    case 'PAYMENT_SUCCEEDED':
    case 'PAYMENT_FAILED':
      return {
        icon: CreditCard,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10 border-amber-500/20',
      };

    case 'READY_FOR_PICKUP':
    case 'ORDER_IN_TRANSIT':
    case 'ORDER_DELIVERED':
      return {
        icon: Truck,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10 border-blue-500/20',
      };

    case 'DISPUTE_RAISED':
    case 'DISPUTE_UNDER_REVIEW':
    case 'DISPUTE_RESOLVED':
    case 'DISPUTE_REJECTED':
      return {
        icon: AlertTriangle,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10 border-rose-500/20',
      };

    case 'ADMIN_ALERT':
    case 'SYSTEM_ALERT':
    case 'LISTING_FLAGGED':
    case 'SELLER_VERIFICATION_UPDATED':
      return {
        icon: ShieldAlert,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10 border-purple-500/20',
      };

    default:
      return {
        icon: Info,
        color: 'text-muted-foreground',
        bg: 'bg-secondary border-border',
      };
  }
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    } else if (n.related_request_id) {
      navigate('/orders');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors focus:outline-hidden"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-secondary/30">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    clearAll();
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-rose-500 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
            {isLoading && notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="h-10 w-10 rounded-full bg-secondary/60 flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                  <Bell className="h-5 w-5 opacity-40" />
                </div>
                <p className="text-sm font-medium text-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll be alerted when orders, payments, or fulfillment stages update.
                </p>
              </div>
            ) : (
              notifications.slice(0, 15).map((notification) => {
                const config = getNotificationConfig(notification.type);
                const Icon = config.icon;
                const isUnread = !notification.is_read;

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-secondary/60 transition-colors ${
                      isUnread ? 'bg-primary/[0.04]' : ''
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg border ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isUnread ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {notification.title}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                        {formatRelativeTime(notification.created_at || notification.createdAt || '')}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer link to full notification center */}
          <div className="p-2.5 border-t border-border/80 bg-secondary/20 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline py-1"
            >
              <span>View All Notifications & Preferences</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
