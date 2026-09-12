/**
 * hooks/useNotifications.tsx
 * ----------------------------
 * Notification context hook connected to Rubbish Revamp Express + MySQL backend.
 */

import { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  deleteNotification as apiDeleteNotification,
  clearAllNotifications as apiClearAllNotifications,
  type AppNotification,
  type NotificationType,
} from '@/services/notificationService';

export type { AppNotification, NotificationType };

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refetch: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['notifications', user?.id];
  const unreadKey = ['notifications_unread', user?.id];

  // Fetch recent notifications (top 25)
  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await getNotifications({ limit: 25 });
      return res.data?.notifications ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 20, // Polling every 20s
  });

  // Fetch unread count
  const {
    data: countData,
    refetch: refetchCount,
  } = useQuery({
    queryKey: unreadKey,
    queryFn: async () => {
      const res = await getUnreadCount();
      return res.data?.unreadCount ?? 0;
    },
    enabled: !!user,
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 20,
  });

  const notifications = useMemo(() => {
    return (listData ?? []).map((n) => ({
      ...n,
      read: n.is_read ?? false,
      createdAt: n.created_at,
    }));
  }, [listData]);

  const unreadCount = countData ?? notifications.filter((n) => !n.is_read).length;

  // Mark single as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiMarkAsRead(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AppNotification[]>(queryKey);
      queryClient.setQueryData<AppNotification[]>(queryKey, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, is_read: true, read: true } : n))
      );
      queryClient.setQueryData<number>(unreadKey, (prev) => Math.max(0, (prev ?? 1) - 1));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiMarkAllAsRead();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AppNotification[]>(queryKey);
      queryClient.setQueryData<AppNotification[]>(queryKey, (old) =>
        (old ?? []).map((n) => ({ ...n, is_read: true, read: true }))
      );
      queryClient.setQueryData<number>(unreadKey, 0);
      return { previous };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteNotification(id);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  // Clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await apiClearAllNotifications();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading: isListLoading,
      isError: isListError,
      markAsRead: async (id: string) => {
        await markAsReadMutation.mutateAsync(id);
      },
      markAllAsRead: async () => {
        await markAllAsReadMutation.mutateAsync();
      },
      deleteNotification: async (id: string) => {
        await deleteMutation.mutateAsync(id);
      },
      clearAll: async () => {
        await clearAllMutation.mutateAsync();
      },
      refetch: () => {
        refetchList();
        refetchCount();
      },
    }),
    [
      notifications,
      unreadCount,
      isListLoading,
      isListError,
      markAsReadMutation,
      markAllAsReadMutation,
      deleteMutation,
      clearAllMutation,
      refetchList,
      refetchCount,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
