// =====================================================
// RBAC MIDDLEWARE
// =====================================================
// Role-Based Access Control
// =====================================================

import type { Project, MemberRole } from '../types/index.js';

// --- Permission Definitions ---

export type Permission =
  | 'create_task'
  | 'edit_task'
  | 'delete_task'
  | 'edit_project'
  | 'delete_project'
  | 'manage_members'
  | 'change_project_settings'
  | 'view_activity_log'
  | 'export_data';

export type AdminPermission =
  | 'view_all_users'
  | 'update_user_status'
  | 'update_user_role'
  | 'reset_user_password'
  | 'view_all_projects'
  | 'delete_any_project'
  | 'view_system_stats'
  | 'view_activity_logs';

export interface RolePermissions {
  [key: string]: Permission[];
}

/**
 * Mapping project role
 */
export const PROJECT_ROLE_PERMISSIONS: RolePermissions = {
  manager: [
    'create_task',
    'edit_task',
    'delete_task',
    'edit_project',
    'delete_project',
    'manage_members',
    'change_project_settings',
    'view_activity_log',
    'export_data',
  ],
  member: [
    'create_task',
    'edit_task',
  ],
};

/**
 * Admin permission
 */
export const ADMIN_PERMISSIONS: AdminPermission[] = [
  'view_all_users',
  'update_user_status',
  'update_user_role',
  'reset_user_password',
  'view_all_projects',
  'delete_any_project',
  'view_system_stats',
  'view_activity_logs',
];

// --- Functions ---

export function getUserProjectRole(
  userId: string,
  project: Project
): MemberRole | null {
  const member = project.members.find((m) => m.userId === userId);
  return member?.role ?? null;
}


export function hasProjectPermission(
  userId: string,
  project: Project,
  permission: Permission
): boolean {
  // Project owner has full permissions
  if (project.ownerId === userId) return true;

  const role = getUserProjectRole(userId, project);
  if (!role) return false;

  return PROJECT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}


export function canEditTask(
  userId: string,
  task: { assignees: string[] },
  project: Project
): boolean {
  if (project.ownerId === userId) return true;

  const role = getUserProjectRole(userId, project);
  if (!role) return false;

  // Manager can edit any task
  if (role === 'manager') return true;

  // Member only edit their task
  if (role === 'member') {
    return task.assignees.includes(userId);
  }

  return false;
}


export function canDeleteTask(userId: string, project: Project): boolean {
  return hasProjectPermission(userId, project, 'delete_task');
}


export function canManageMembers(userId: string, project: Project): boolean {
  return hasProjectPermission(userId, project, 'manage_members');
}


export function canEditProject(userId: string, project: Project): boolean {
  return hasProjectPermission(userId, project, 'edit_project');
}


export function canDeleteProject(userId: string, project: Project): boolean {
  return hasProjectPermission(userId, project, 'delete_project');
}


export function canViewActivityLog(userId: string, project: Project): boolean {
  return hasProjectPermission(userId, project, 'view_activity_log');
}


export function canExportData(userId: string, project: Project): boolean {
  return hasProjectPermission(userId, project, 'export_data');
}


export function assertProjectPermission(
  userId: string,
  project: Project,
  permission: Permission
): void {
  if (!hasProjectPermission(userId, project, permission)) {
    throw new Error(
      `You do not have permission to perform this action (required: ${permission})`
    );
  }
}


export function assertAdminRole(userRole: string): void {
  if (userRole !== 'admin') {
    throw new Error('Only admin can perform this action');
  }
}
