// =====================================================
// PROJECT REPOSITORY
// =====================================================
import type { Project, ProjectMember } from '../types/index.js';
import type { SupabaseClient } from "@supabase/supabase-js";

export async function findProjectsByUserId(supabase: SupabaseClient, userId: string): Promise<Project[]> {
  // 1. Get project_id where user is a member
  const { data: memberProjects, error: memberError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (memberError) throw new Error(`Không thể lấy projects: ${memberError.message}`);

  const projectIds = (memberProjects ?? []).map((pm: any) => pm.project_id);
  if (projectIds.length === 0) return [];

  // 2. Get projects details with members
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, name, description, deadline, owner_id,
      created_at, template, deleted_at, key,
      project_members (
        user_id, role, joined_at,
        users ( id, name, email, avatar_url )
      )
    `)
    .in('id', projectIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Không thể lấy chi tiết projects: ${error.message}`);

  return (data ?? []).map(mapDbProjectToProject);
}

/**
 * Get project by id with members
 */
export async function findProjectById(supabase: SupabaseClient, projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, name, description, deadline, owner_id,
      created_at, template, deleted_at, key,
      project_members (
        user_id, role, joined_at,
        users ( id, name, email, avatar_url )
      )
    `)
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw new Error(`Không thể lấy project: ${error.message}`);
  return data ? mapDbProjectToProject(data) : null;
}

/**
 * Create project and add owner to project_members
 */
export async function createProject(supabase: SupabaseClient, params: {
  name: string;
  description: string;
  deadline: string;
  template: 'kanban' | 'scrum';
  ownerId: string;
  key: string;
}): Promise<Project> {
  const { data: newProject, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: params.name,
      description: params.description,
      deadline: params.deadline,
      template: params.template,
      owner_id: params.ownerId,
      key: params.key,
    })
    .select()
    .single();

  if (projectError) throw new Error(`Không thể tạo project: ${projectError.message}`);

  // Add owner to project_members with role manager
  const { error: memberError } = await supabase
    .from('project_members')
    .insert({
      project_id: newProject.id,
      user_id: params.ownerId,
      role: 'manager',
    });

  if (memberError) {
    // Rollback project if member not added
    await supabase.from('projects').delete().eq('id', newProject.id);
    throw new Error(`Không thể thêm owner vào project: ${memberError.message}`);
  }

  return findProjectById(supabase, newProject.id) as Promise<Project>;
}

/**
 * Update project
 */
export async function updateProject(
  supabase: SupabaseClient, projectId: string,
  updates: Partial<{
    name: string;
    description: string;
    deadline: string;
    template: 'kanban' | 'scrum';
    key: string;
  }>
): Promise<void> {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
  if (updates.template !== undefined) dbUpdates.template = updates.template;
  if (updates.key !== undefined) dbUpdates.key = updates.key;

  const { error } = await supabase
    .from('projects')
    .update(dbUpdates)
    .eq('id', projectId);

  if (error) throw new Error(`Không thể cập nhật project: ${error.message}`);
}

/**
 * Soft delete project (set deleted_at)
 */
export async function softDeleteProject(supabase: SupabaseClient, projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', projectId);

  if (error) throw new Error(`Không thể xóa project: ${error.message}`);
}

/**
 * Restore project
 */
export async function restoreProject(supabase: SupabaseClient, projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: null })
    .eq('id', projectId);

  if (error) throw new Error(`Không thể khôi phục project: ${error.message}`);
}

/**
 * Hard delete project
 */
export async function hardDeleteProject(supabase: SupabaseClient, projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw new Error(`Không thể xóa vĩnh viễn project: ${error.message}`);
}

/**
 * Add member to project
 */
export async function addProjectMember(
  supabase: SupabaseClient, projectId: string,
  userId: string,
  role: 'manager' | 'member' = 'member'
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role });

  if (error) {
    if (error.code === '23505') {
      throw new Error('User đã là thành viên của project này');
    }
    throw new Error(`Không thể thêm member: ${error.message}`);
  }
}

/**
 * Remove member from project
 */
export async function removeProjectMember(
  supabase: SupabaseClient, projectId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw new Error(`Không thể xóa member: ${error.message}`);
}

/**
 * Update member role in project
 */
export async function updateProjectMemberRole(
  supabase: SupabaseClient, projectId: string,
  userId: string,
  newRole: 'manager' | 'member'
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ role: newRole })
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw new Error(`Không thể cập nhật role: ${error.message}`);
}

// --- Private Mappers ---

function mapDbProjectToProject(p: any): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    deadline: p.deadline,
    ownerId: p.owner_id,
    createdAt: p.created_at,
    template: p.template,
    deletedAt: p.deleted_at,
    key: p.key,
    members: (p.project_members ?? []).map((m: any): ProjectMember => ({
      userId: m.user_id,
      role: m.role,
      name: m.users?.name ?? '',
      email: m.users?.email ?? '',
      avatarUrl: m.users?.avatar_url,
      joinedAt: m.joined_at,
    })),
  };
}
