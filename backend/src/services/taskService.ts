// =====================================================
// TASK SERVICE - Planora Backend
// =====================================================
// Business logic for Tasks: CRUD, Comments, Attachments.
// =====================================================

import {
  findTasksByUserId,
  findTasksByProjectId,
  findTaskById,
  createTask as createTaskRepo,
  updateTask as updateTaskRepo,
  softDeleteTask,
  restoreTask as restoreTaskRepo,
  hardDeleteTask,
  addComment as addCommentRepo,
  addAttachmentByUrl,
  deleteAttachment as deleteAttachmentRepo,
  updateParentTaskStatus,
} from '../repositories/taskRepository.js';
import { logProjectActivity } from './activityService.js';
import { createNotification } from './notificationService.js';
import type { Task, ServiceResult } from '../types/index.js';
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Read ---

export async function getTasksByUser(supabase: SupabaseClient, userId: string): Promise<Task[]> {
  return findTasksByUserId(supabase, userId);
}

export async function getTasksByProject(supabase: SupabaseClient, projectId: string): Promise<Task[]> {
  return findTasksByProjectId(supabase, projectId);
}

// --- Create ---

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  type?: Task['type'];
  dueDate?: string | null;
  parentTaskId?: string | null;
  sprintId?: string | null;
  reporterId: string;
  assignees?: string[];
  timeEstimate?: number | null;
  storyPoints?: number | null;
}

export async function createTask(
  supabase: SupabaseClient, input: CreateTaskInput
): Promise<ServiceResult<{ taskId: string }>> {
  try {
    const taskId = await createTaskRepo(supabase, input);

    // Send notifications for assignees
    if (input.assignees && input.assignees.length > 0) {
      for (const assigneeId of input.assignees) {
        if (assigneeId !== input.reporterId) {
          await createNotification(supabase, {
            userId: assigneeId,
            type: 'task_assigned',
            title: `Nhiệm vụ mới: ${input.title}`,
            content: `Bạn được giao nhiệm vụ mới`,
            entityType: 'task',
            entityId: taskId,
          });
        }
      }
    }

    // Update parent task status if subtask
    if (input.parentTaskId) {
      await updateParentTaskStatus(supabase, input.parentTaskId);
    }

    // Log activity
    await logProjectActivity(supabase, {
      projectId: input.projectId,
      userId: input.reporterId,
      action: 'created',
      entityType: 'task',
      entityId: taskId,
      taskId,
      newValue: { title: input.title, status: input.status },
    });

    return { success: true, data: { taskId } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Update ---

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  type?: Task['type'];
  dueDate?: string | null;
  sprintId?: string | null;
  timeEstimate?: number | null;
  timeSpent?: number | null;
  storyPoints?: number | null;
  assignees?: string[];
}

export async function updateTask(
  supabase: SupabaseClient, taskId: string,
  updates: UpdateTaskInput,
  requestingUserId: string
): Promise<ServiceResult> {
  try {
    const currentTask = await findTaskById(supabase, taskId);
    if (!currentTask) return { success: false, error: 'Không tìm thấy task' };

    await updateTaskRepo(supabase, taskId, updates);

    // Update parent task status if status changed
    if (updates.status && currentTask.parentTaskId) {
      await updateParentTaskStatus(supabase, currentTask.parentTaskId);
    }

    // Log activity
    if (updates.status && updates.status !== currentTask.status) {
      await logProjectActivity(supabase, {
        projectId: currentTask.projectId,
        userId: requestingUserId,
        action: 'status_changed',
        entityType: 'task',
        entityId: taskId,
        taskId,
        oldValue: currentTask.status,
        newValue: updates.status,
      });
    } else {
      await logProjectActivity(supabase, {
        projectId: currentTask.projectId,
        userId: requestingUserId,
        action: 'updated',
        entityType: 'task',
        entityId: taskId,
        taskId,
        newValue: updates,
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Delete / Restore ---

export async function deleteTask(
  supabase: SupabaseClient, taskId: string,
  requestingUserId: string
): Promise<ServiceResult> {
  try {
    const task = await findTaskById(supabase, taskId);
    if (!task) return { success: false, error: 'Không tìm thấy task' };

    await softDeleteTask(supabase, taskId);

    await logProjectActivity(supabase, {
      projectId: task.projectId,
      userId: requestingUserId,
      action: 'deleted',
      entityType: 'task',
      entityId: taskId,
      taskId,
      oldValue: { title: task.title },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function restoreTask(supabase: SupabaseClient, taskId: string): Promise<ServiceResult> {
  try {
    await restoreTaskRepo(supabase, taskId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function permanentlyDeleteTask(supabase: SupabaseClient, taskId: string): Promise<ServiceResult> {
  try {
    await hardDeleteTask(supabase, taskId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Comments ---

export async function addComment(
  supabase: SupabaseClient, taskId: string,
  content: string,
  authorId: string
): Promise<ServiceResult<{ commentId: string }>> {
  try {
    const task = await findTaskById(supabase, taskId);
    const commentId = await addCommentRepo(supabase, taskId, content, authorId);

    if (task) {
      await logProjectActivity(supabase, {
        projectId: task.projectId,
        userId: authorId,
        action: 'comment_added',
        entityType: 'task',
        entityId: taskId,
        taskId,
        newValue: { content: content.substring(0, 100) },
      });
    }

    return { success: true, data: { commentId } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Attachments ---

export async function addAttachment(
  supabase: SupabaseClient, taskId: string,
  attachment: { name: string; url: string; type: string },
  uploadedBy: string
): Promise<ServiceResult<{ attachmentId: string }>> {
  try {
    const attachmentId = await addAttachmentByUrl(supabase, taskId, attachment, uploadedBy);
    return { success: true, data: { attachmentId } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAttachment(
  supabase: SupabaseClient, attachmentId: string
): Promise<ServiceResult<{ url: string; type: string }>> {
  try {
    const result = await deleteAttachmentRepo(supabase, attachmentId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
