// =====================================================
// SPRINT SERVICE
// =====================================================
// Business logic for Sprint management.
// =====================================================
import { v4 as uuidv4 } from 'uuid';
import type { Sprint, ServiceResult } from '../types/index.js';
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Read ---

export async function getSprintsByUser(supabase: SupabaseClient, userId: string): Promise<Sprint[]> {
  const { data: projectMembers, error: pmError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (pmError) throw new Error(`Không thể lấy projects: ${pmError.message}`);

  const projectIds = (projectMembers ?? []).map((pm: any) => pm.project_id);
  if (projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Không thể lấy sprints: ${error.message}`);

  return (data ?? []).map(mapDbSprintToSprint);
}

export async function getSprintsByProject(supabase: SupabaseClient, projectId: string): Promise<Sprint[]> {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Không thể lấy sprints: ${error.message}`);
  return (data ?? []).map(mapDbSprintToSprint);
}

// --- Create ---

export interface CreateSprintInput {
  projectId: string;
  name: string;
  goal: string;
  taskIds: string[];
  requestingUserId: string;
}

export async function createSprint(
  supabase: SupabaseClient, input: CreateSprintInput,
  existingSprintCount: number
): Promise<ServiceResult<Sprint>> {
  try {
    const sprintNumber = existingSprintCount + 1;
    const newSprintId = uuidv4();
    const now = new Date().toISOString();

    const { data: newSprint, error: sprintError } = await supabase
      .from('sprints')
      .insert({
        id: newSprintId,
        name: input.name || `Sprint ${sprintNumber}`,
        goal: input.goal,
        project_id: input.projectId,
        start_date: now,
        status: 'active',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (sprintError) throw new Error(`Không thể tạo sprint: ${sprintError.message}`);

    if (input.taskIds.length > 0) {
      const { error: tasksError } = await supabase
        .from('tasks')
        .update({ sprint_id: newSprintId, status: 'todo', updated_at: now })
        .in('id', input.taskIds);

      if (tasksError) throw new Error(`Không thể gán tasks vào sprint: ${tasksError.message}`);
    }

    return { success: true, data: mapDbSprintToSprint(newSprint) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- End Sprint ---

export async function endSprint(
  supabase: SupabaseClient, sprintId: string
): Promise<ServiceResult> {
  try {
    const now = new Date().toISOString();

    // Update sprint status
    const { error: sprintError } = await supabase
      .from('sprints')
      .update({ status: 'completed', end_date: now, updated_at: now })
      .eq('id', sprintId);

    if (sprintError) throw new Error(`Không thể kết thúc sprint: ${sprintError.message}`);

    // Get all tasks in sprint
    const { data: sprintTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, type, parent_task_id')
      .eq('sprint_id', sprintId);

    if (tasksError) throw new Error(`Không thể lấy tasks của sprint: ${tasksError.message}`);

    const tasks = sprintTasks ?? [];

    // Get user story IDs to find subtasks
    const userStoryIds = tasks
      .filter((t: any) => t.type === 'user-story' || (!t.type && !t.parent_task_id))
      .map((t: any) => t.id);

    // Move incomplete tasks to backlog
    const incompleteTasks = tasks.filter((t: any) => t.status !== 'done').map((t: any) => t.id);
    if (incompleteTasks.length > 0) {
      await supabase
        .from('tasks')
        .update({ sprint_id: null, status: 'backlog', updated_at: now })
        .in('id', incompleteTasks);
    }

    // Clear sprint_id for completed tasks
    const completedTasks = tasks.filter((t: any) => t.status === 'done').map((t: any) => t.id);
    if (completedTasks.length > 0) {
      await supabase
        .from('tasks')
        .update({ sprint_id: null, updated_at: now })
        .in('id', completedTasks);
    }

    // Process subtasks of user stories
    if (userStoryIds.length > 0) {
      const { data: subTasks } = await supabase
        .from('tasks')
        .select('id, status')
        .in('parent_task_id', userStoryIds)
        .eq('type', 'task');

      const incompleteSubTasks = (subTasks ?? [])
        .filter((t: any) => t.status !== 'done')
        .map((t: any) => t.id);

      if (incompleteSubTasks.length > 0) {
        await supabase
          .from('tasks')
          .update({ status: 'todo', updated_at: now })
          .in('id', incompleteSubTasks);
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Private Mappers ---

function mapDbSprintToSprint(db: any): Sprint {
  return {
    id: db.id,
    name: db.name,
    goal: db.goal ?? '',
    projectId: db.project_id,
    startDate: db.start_date,
    endDate: db.end_date,
    status: db.status,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}
