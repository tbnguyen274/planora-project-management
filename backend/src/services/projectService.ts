// =====================================================
// PROJECT SERVICE
// =====================================================

import {
  findProjectsByUserId,
  findProjectById,
  createProject as createProjectRepo,
  updateProject as updateProjectRepo,
  softDeleteProject,
  restoreProject as restoreProjectRepo,
  hardDeleteProject,
  removeProjectMember,
  updateProjectMemberRole,
} from '../repositories/projectRepository.js';
import type { Project, ServiceResult } from '../types/index.js';
import { canManageMembers, canEditProject, canDeleteProject } from '../middleware/rbacMiddleware.js';
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Read ---

export async function getProjectsByUser(supabase: SupabaseClient, userId: string): Promise<Project[]> {
  return findProjectsByUserId(supabase, userId);
}

export async function getProjectById(supabase: SupabaseClient, projectId: string): Promise<Project | null> {
  return findProjectById(supabase, projectId);
}

// --- Create ---

export interface CreateProjectInput {
  name: string;
  description?: string;
  deadline: string;
  template?: 'kanban' | 'scrum';
  ownerId: string;
  key?: string;
}

export async function createProject(
  supabase: SupabaseClient, input: CreateProjectInput
): Promise<ServiceResult<Project>> {
  try {
    const project = await createProjectRepo(supabase, {
      name: input.name,
      description: input.description ?? '',
      deadline: input.deadline,
      template: input.template ?? 'kanban',
      ownerId: input.ownerId,
      key: input.key ?? input.name.substring(0, 3).toUpperCase(),
    });

    return { success: true, data: project };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Update ---

export async function updateProject(
  supabase: SupabaseClient, userId: string,
  projectId: string,
  updates: Partial<Pick<Project, 'name' | 'description' | 'deadline' | 'template' | 'key'>>
): Promise<ServiceResult> {
  try {
    const project = await findProjectById(supabase, projectId);
    if (!project) return { success: false, error: 'Không tìm thấy dự án' };

    if (!canEditProject(userId, project)) {
      return { success: false, error: 'Bạn không có quyền chỉnh sửa dự án này' };
    }

    await updateProjectRepo(supabase, projectId, {
    ...updates,
    key: updates.key ?? undefined,
  });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Delete / Restore ---

export async function deleteProject(
  supabase: SupabaseClient, userId: string,
  projectId: string
): Promise<ServiceResult> {
  try {
    const project = await findProjectById(supabase, projectId);
    if (!project) return { success: false, error: 'Không tìm thấy dự án' };

    if (!canDeleteProject(userId, project)) {
      return { success: false, error: 'Chỉ chủ dự án mới có thể xóa' };
    }

    await softDeleteProject(supabase, projectId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function restoreProject(
  supabase: SupabaseClient, userId: string,
  projectId: string
): Promise<ServiceResult> {
  try {
    const project = await findProjectById(supabase, projectId);
    if (!project) return { success: false, error: 'Không tìm thấy dự án' };

    if (project.ownerId !== userId) {
      return { success: false, error: 'Chỉ chủ dự án mới có thể khôi phục' };
    }

    await restoreProjectRepo(supabase, projectId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function permanentlyDeleteProject(
  supabase: SupabaseClient, userId: string,
  projectId: string
): Promise<ServiceResult> {
  try {
    const project = await findProjectById(supabase, projectId);
    if (!project) return { success: false, error: 'Không tìm thấy dự án' };

    if (project.ownerId !== userId) {
      return { success: false, error: 'Chỉ chủ dự án mới có thể xóa vĩnh viễn' };
    }

    await hardDeleteProject(supabase, projectId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Member Management ---

export async function removeMember(
  supabase: SupabaseClient, requestingUserId: string,
  projectId: string,
  targetUserId: string
): Promise<ServiceResult> {
  try {
    const project = await findProjectById(supabase, projectId);
    if (!project) return { success: false, error: 'Không tìm thấy dự án' };

    if (!canManageMembers(requestingUserId, project)) {
      return { success: false, error: 'Chỉ chủ dự án hoặc quản lý mới có thể xóa thành viên' };
    }

    if (targetUserId === project.ownerId) {
      return { success: false, error: 'Không thể xóa chủ dự án' };
    }

    if (targetUserId === requestingUserId) {
      return { success: false, error: 'Không thể tự xóa mình. Dùng chức năng "Rời khỏi dự án"' };
    }

    await removeProjectMember(supabase, projectId, targetUserId);

    const requester = project.members.find((m) => m.userId === requestingUserId);
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'member_added',
      title: 'Bị xóa khỏi dự án',
      content: `Bạn đã bị ${requester?.name ?? 'quản lý'} xóa khỏi dự án "${project.name}"`,
      entity_type: 'project',
      entity_id: projectId,
      is_read: false,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function leaveProject(
  supabase: SupabaseClient, userId: string,
  projectId: string
): Promise<ServiceResult> {
  try {
    const project = await findProjectById(supabase, projectId);
    if (!project) return { success: false, error: 'Không tìm thấy dự án' };

    if (project.ownerId === userId) {
      return {
        success: false,
        error: 'Chủ dự án không thể rời khỏi dự án. Hãy xóa dự án hoặc chuyển quyền sở hữu trước.',
      };
    }

    await removeProjectMember(supabase, projectId, userId);

    // Notify managers and owner
    const leavingMember = project.members.find((m) => m.userId === userId);
    const managersAndOwner = project.members.filter(
      (m) => (m.role === 'manager' || m.userId === project.ownerId) && m.userId !== userId
    );

    for (const manager of managersAndOwner) {
      await supabase.from('notifications').insert({
        user_id: manager.userId,
        type: 'member_added',
        title: 'Thành viên rời khỏi dự án',
        content: `${leavingMember?.name ?? 'Thành viên'} đã rời khỏi dự án "${project.name}"`,
        entity_type: 'project',
        entity_id: projectId,
        is_read: false,
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function changeMemberRole(
  supabase: SupabaseClient, requestingUserId: string,
  projectId: string,
  targetUserId: string,
  newRole: 'manager' | 'member'
): Promise<ServiceResult> {
  try {
    const project = await findProjectById(supabase, projectId);
    if (!project) return { success: false, error: 'Không tìm thấy dự án' };

    if (project.ownerId !== requestingUserId) {
      return { success: false, error: 'Chỉ chủ dự án mới có thể thay đổi vai trò thành viên' };
    }

    if (targetUserId === project.ownerId) {
      return { success: false, error: 'Không thể thay đổi vai trò của chủ dự án' };
    }

    await updateProjectMemberRole(supabase, projectId, targetUserId, newRole);

    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'member_added',
      title: 'Vai trò đã thay đổi',
      content: `Vai trò của bạn đã thay đổi thành "${newRole === 'manager' ? 'Quản lý' : 'Thành viên'}" trong dự án "${project.name}"`,
      entity_type: 'project',
      entity_id: projectId,
      is_read: false,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
