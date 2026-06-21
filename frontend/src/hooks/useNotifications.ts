import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { User } from './useAuth';
import { supabase } from '../lib/supabase-client';
import {
  getNotificationsByUser,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '@backend/services/notificationService';
import type { Notification, NotificationType } from '@backend/types/index';

export type { Notification, NotificationType };

interface UseNotificationsProps {
  user: User | null;
}

export function useNotifications({ user }: UseNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const channelRef = useRef<any>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getNotificationsByUser(supabase as any, user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const channelId = `${user.id}_${Date.now()}`;
    const notificationsChannel = supabase
      .channel(`notifications_changes_${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    channelRef.current = notificationsChannel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchNotifications]);

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    if (!user) return false;
    const res = await markNotificationAsRead(supabase as any, notificationId, user.id);
    if (res.success) {
      fetchNotifications();
      return true;
    }
    toast.error(res.error);
    return false;
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (!user) return false;
    const res = await markAllNotificationsAsRead(supabase as any, user.id);
    if (res.success) {
      toast.success('Đã đánh dấu tất cả là đã đọc');
      fetchNotifications();
      return true;
    }
    toast.error(res.error);
    return false;
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return false;
    const res = await deleteNotification(supabase as any, notificationId, user.id);
    if (res.success) {
      fetchNotifications();
      return true;
    }
    toast.error(res.error);
    return false;
  };

  const handleAddNotification = async (
    type: NotificationType,
    title: string,
    content: string,
    entityType?: string,
    entityId?: string
  ) => {
    if (!user) return false;
    const res = await createNotification(supabase as any, {
      userId: user.id,
      type,
      title,
      content,
      entityType,
      entityId
    });
    if (res.success) {
      fetchNotifications();
      return true;
    }
    return false;
  };

  return {
    notifications,
    loading,
    unreadCount,
    refetch: fetchNotifications,
    handleMarkNotificationAsRead,
    handleMarkAllNotificationsAsRead,
    handleDeleteNotification,
    handleAddNotification,
  };
}
