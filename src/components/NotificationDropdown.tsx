import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Package, 
  ShoppingCart, 
  Leaf, 
  Info, 
  Check, 
  CheckCheck,
  Trash2
} from 'lucide-react';
import { useNotifications, NotificationType } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/data/mockData';

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  listing: { icon: Package, color: 'text-accent', bg: 'bg-accent/10' },
  deal: { icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
  score: { icon: Leaf, color: 'text-success', bg: 'bg-success/10' },
  system: { icon: Info, color: 'text-muted-foreground', bg: 'bg-secondary' },
};

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-lg z-50 animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => { clearAll(); setIsOpen(false); }}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(notification => {
                  const config = typeConfig[notification.type];
                  const Icon = config.icon;

                  return (
                    <button
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-0 ${
                        !notification.read ? 'bg-primary/[0.03]' : ''
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
