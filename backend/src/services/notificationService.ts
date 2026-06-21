// =====================================================
// NOTIFICATION SERVICE
// =====================================================
// Business logic cho Notifications.
// =====================================================

import type { Notification, NotificationType, ServiceResult } from '../types/index.js';
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Read ---

/**
 * Get user's notifications (newest first)
 */
export async function getNotificationsByUser(
  supabase: SupabaseClient, userId: string,
  limit = 50
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Không thể lấy notifications: ${error.message}`);

  return (data ?? []).map(mapDbNotification);
}

// --- Create ---

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Create new notification
 */
export async function createNotification(
  supabase: SupabaseClient, input: CreateNotificationInput
): Promise<ServiceResult<{ notificationId: string }>> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      content: input.content,
      entity_type: input.entityType,
      entity_id: input.entityId,
      is_read: false,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: { notificationId: data.id } };
}

// --- Update ---

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  supabase: SupabaseClient, notificationId: string,
  userId: string
): Promise<ServiceResult> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId); // Only update notification of the user

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(supabase: SupabaseClient, userId: string): Promise<ServiceResult> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// --- Delete ---

/**
 * Delete notification
 */
export async function deleteNotification(
  supabase: SupabaseClient, notificationId: string,
  userId: string
): Promise<ServiceResult> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}


function mapDbNotification(n: any): Notification {
  return {
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    message: n.content ?? n.message ?? '',
    entityType: n.entity_type,
    entityId: n.entity_id,
    read: n.is_read,
    readAt: n.read_at,
    createdAt: n.created_at,
  };
}
