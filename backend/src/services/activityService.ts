// =====================================================
// ACTIVITY SERVICE
// =====================================================

import type { ActivityLog } from '../types/index.js';
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Read ---

/**
 * Get project activity logs
 */
export async function getProjectActivityLogs(
  supabase: SupabaseClient, projectId: string,
  limit = 50
): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      users:user_id (name),
      tasks:task_id (title)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching project activity logs:', error);
    return [];
  }

  return (data ?? []).map((log: any): ActivityLog => ({
    id: log.id,
    action: log.action ?? 'unknown',
    entityType: log.entity_type ?? 'unknown',
    entityId: log.entity_id,
    userId: log.user_id,
    userName: log.users?.name ?? 'Unknown',
    projectId: log.project_id,
    taskId: log.task_id,
    taskTitle: log.tasks?.title,
    oldValue: log.old_value,
    newValue: log.new_value,
    createdAt: log.created_at ?? new Date().toISOString(),
  }));
}

// --- Write ---

export interface LogActivityInput {
  projectId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  taskId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Log activity
 */
export async function logProjectActivity(supabase: SupabaseClient, input: LogActivityInput): Promise<void> {
  const { error } = await supabase.from('activity_logs').insert({
    project_id: input.projectId,
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    task_id: input.taskId ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
  });

  if (error) {
    console.error('Error logging activity:', error);
  }
}

// --- Action Labels ---

/**
 * Get action label
 */
export function getActivityActionLabel(action: string, entityType: string): string {
  const labels: Record<string, Record<string, string>> = {
    task: {
      created: 'đã tạo công việc',
      updated: 'đã cập nhật công việc',
      deleted: 'đã xóa công việc',
      status_changed: 'đã thay đổi trạng thái',
      assigned: 'đã giao công việc cho',
      comment_added: 'đã bình luận về',
    },
    project: {
      created: 'đã tạo dự án',
      updated: 'đã cập nhật dự án',
      deleted: 'đã xóa dự án',
    },
    member: {
      added: 'đã thêm thành viên',
      removed: 'đã xóa thành viên',
      role_changed: 'đã thay đổi vai trò',
    },
    sprint: {
      created: 'đã tạo sprint',
      started: 'đã bắt đầu sprint',
      ended: 'đã kết thúc sprint',
    },
  };

  return labels[entityType]?.[action] ?? `${action} ${entityType}`;
}
