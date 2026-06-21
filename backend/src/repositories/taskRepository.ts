// =====================================================
// TASK REPOSITORY
// =====================================================
import type { Task, Comment, Attachment } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Fetch ---

/**
 * Get all tasks of user's projects
 */
export async function findTasksByUserId(supabase: SupabaseClient, userId: string): Promise<Task[]> {
  const { data: projectMembers, error: pmError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (pmError) throw new Error(`Không thể lấy projects: ${pmError.message}`);

  const projectIds = (projectMembers ?? []).map((pm: any) => pm.project_id);
  if (projectIds.length === 0) return [];

  return findTasksByProjectIds(supabase, projectIds);
}

/**
 * Get tasks by projectIds
 */
export async function findTasksByProjectIds(supabase: SupabaseClient, projectIds: string[]): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignees!task_assignees_task_id_fkey (
        user_id,
        users!task_assignees_user_id_fkey ( id, name, email )
      ),
      comments (
        id, content, author_id, created_at,
        users ( id, name )
      ),
      attachments (
        id, name, url, type, file_size, uploaded_by, created_at
      )
    `)
    .in('project_id', projectIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Không thể lấy tasks: ${error.message}`);

  return (data ?? []).map(mapDbTaskToTask);
}

/**
 * Get tasks by project ID
 */
export async function findTasksByProjectId(supabase: SupabaseClient, projectId: string): Promise<Task[]> {
  return findTasksByProjectIds(supabase, [projectId]);
}

/**
 * Get task by ID
 */
export async function findTaskById(supabase: SupabaseClient, taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignees!task_assignees_task_id_fkey (
        user_id,
        users!task_assignees_user_id_fkey ( id, name, email )
      ),
      comments (
        id, content, author_id, created_at,
        users ( id, name )
      ),
      attachments (
        id, name, url, type, file_size, uploaded_by, created_at
      )
    `)
    .eq('id', taskId)
    .maybeSingle();

  if (error) throw new Error(`Không thể lấy task: ${error.message}`);
  return data ? mapDbTaskToTask(data) : null;
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
  timeSpent?: number | null;
  storyPoints?: number | null;
}

/**
 * Create task
 */
export async function createTask(supabase: SupabaseClient, input: CreateTaskInput): Promise<string> {
  const taskId = uuidv4();
  const now = new Date().toISOString();

  // Get next task_number
  const { data: existing } = await supabase
    .from('tasks')
    .select('task_number')
    .eq('project_id', input.projectId)
    .order('task_number', { ascending: false })
    .limit(1);

  const nextTaskNumber =
    existing && existing.length > 0 ? existing[0].task_number + 1 : 1;

  const { error: taskError } = await supabase
    .from('tasks')
    .insert({
      id: taskId,
      project_id: input.projectId,
      task_number: nextTaskNumber,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      type: input.type ?? 'task',
      due_date: input.dueDate,
      parent_id: input.parentTaskId,
      sprint_id: input.sprintId,
      reporter_id: input.reporterId,
      time_estimate: input.timeEstimate,
      time_spent: input.timeSpent,
      story_points: input.storyPoints,
      created_at: now,
      updated_at: now,
    });

  if (taskError) throw new Error(`Không thể tạo task: ${taskError.message}`);

  // Add assignees
  if (input.assignees && input.assignees.length > 0) {
    const assigneesData = input.assignees.map((userId) => ({
      task_id: taskId,
      user_id: userId,
      assigned_at: now,
    }));

    const { error: assigneeError } = await supabase
      .from('task_assignees')
      .insert(assigneesData);

    if (assigneeError) throw new Error(`Không thể thêm assignees: ${assigneeError.message}`);
  }

  return taskId;
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

/**
 * Update task
 */
export async function updateTask(
  supabase: SupabaseClient, taskId: string,
  updates: UpdateTaskInput
): Promise<void> {
  const dbUpdates: any = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.sprintId !== undefined) dbUpdates.sprint_id = updates.sprintId;
  if (updates.timeEstimate !== undefined) dbUpdates.time_estimate = updates.timeEstimate;
  if (updates.timeSpent !== undefined) dbUpdates.time_spent = updates.timeSpent;
  if (updates.storyPoints !== undefined) dbUpdates.story_points = updates.storyPoints;

  const { error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', taskId);

  if (error) throw new Error(`Không thể cập nhật task: ${error.message}`);

  // Update assignees if needed
  if (updates.assignees !== undefined) {
    await supabase.from('task_assignees').delete().eq('task_id', taskId);

    if (updates.assignees.length > 0) {
      const assigneesData = updates.assignees.map((userId) => ({
        task_id: taskId,
        user_id: userId,
        assigned_at: new Date().toISOString(),
      }));
      await supabase.from('task_assignees').insert(assigneesData);
    }
  }
}

// --- Delete ---

/**
 * Soft delete task
 */
export async function softDeleteTask(supabase: SupabaseClient, taskId: string): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', taskId);

  if (error) throw new Error(`Không thể xóa task: ${error.message}`);
}

/**
 * Restore soft deleted task
 */
export async function restoreTask(supabase: SupabaseClient, taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'todo', deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) throw new Error(`Không thể khôi phục task: ${error.message}`);
}

/**
 * Hard delete task
 */
export async function hardDeleteTask(supabase: SupabaseClient, taskId: string): Promise<void> {
  await Promise.all([
    supabase.from('task_assignees').delete().eq('task_id', taskId),
    supabase.from('comments').delete().eq('task_id', taskId),
    supabase.from('attachments').delete().eq('task_id', taskId),
  ]);

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(`Không thể xóa vĩnh viễn task: ${error.message}`);
}

// --- Comments ---

/**
 * Add comment to task
 */
export async function addComment(
  supabase: SupabaseClient, taskId: string,
  content: string,
  authorId: string
): Promise<string> {
  const commentId = uuidv4();

  const { error } = await supabase.from('comments').insert({
    id: commentId,
    task_id: taskId,
    content,
    author_id: authorId,
    created_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Không thể thêm comment: ${error.message}`);
  return commentId;
}

// --- Attachments ---

/**
 * Add attachment by URL
 */
export async function addAttachmentByUrl(
  supabase: SupabaseClient, taskId: string,
  attachment: { name: string; url: string; type: string },
  uploadedBy: string
): Promise<string> {
  const attachmentId = uuidv4();

  const { error } = await supabase.from('attachments').insert({
    id: attachmentId,
    task_id: taskId,
    name: attachment.name,
    url: attachment.url,
    type: attachment.type,
    file_size: 0,
    uploaded_by: uploadedBy,
    created_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Không thể thêm attachment: ${error.message}`);
  return attachmentId;
}

/**
 * Delete attachment
 */
export async function deleteAttachment(supabase: SupabaseClient, attachmentId: string): Promise<{ url: string; type: string }> {
  const { data, error: fetchError } = await supabase
    .from('attachments')
    .select('url, type')
    .eq('id', attachmentId)
    .single();

  if (fetchError) throw new Error(`Không tìm thấy attachment: ${fetchError.message}`);

  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (error) throw new Error(`Không thể xóa attachment: ${error.message}`);
  return { url: data.url, type: data.type };
}

// --- Business Logic Helpers ---

/**
 * Update parent task status based on subtasks
 */
export async function updateParentTaskStatus(supabase: SupabaseClient, parentTaskId: string): Promise<void> {
  const { data: subtasks, error } = await supabase
    .from('tasks')
    .select('status')
    .eq('parent_id', parentTaskId)
    .is('deleted_at', null);

  if (error || !subtasks || subtasks.length === 0) return;

  const allDone = subtasks.every((t: any) => t.status === 'done');
  const anyInProgress = subtasks.some((t: any) => t.status === 'in-progress');

  let newStatus: 'todo' | 'in-progress' | 'done' = 'todo';
  if (allDone) newStatus = 'done';
  else if (anyInProgress) newStatus = 'in-progress';

  await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', parentTaskId);
}

// --- Private Mappers ---

function mapDbTaskToTask(dbTask: any): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description ?? '',
    status: dbTask.status,
    priority: dbTask.priority as any,
    type: dbTask.type as any,
    dueDate: dbTask.due_date,
    parentTaskId: dbTask.parent_id,
    sprintId: dbTask.sprint_id,
    projectId: dbTask.project_id,
    createdBy: dbTask.reporter_id,
    assignees: (dbTask.task_assignees ?? []).map((ta: any) => ta.user_id),
    comments: (dbTask.comments ?? []).map(
      (c: any): Comment => ({
        id: c.id,
        taskId: dbTask.id,
        content: c.content,
        authorId: c.author_id,
        userName: c.users?.name ?? 'Unknown',
        createdAt: c.created_at,
      })
    ),
    attachments: (dbTask.attachments ?? []).map(
      (a: any): Attachment => ({
        id: a.id,
        taskId: dbTask.id,
        name: a.name,
        url: a.url,
        type: a.type,
        fileSize: a.file_size ?? 0,
        uploadedBy: a.uploaded_by,
        createdAt: a.created_at,
      })
    ),
    labels: dbTask.labels ?? [],
    storyPoints: dbTask.story_points,
    timeEstimate: dbTask.time_estimate,
    timeSpent: dbTask.time_spent,
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at,
    deletedAt: dbTask.deleted_at,
  };
}
