// =====================================================
// ADMIN SERVICE
// =====================================================

import type { SupabaseClient } from '@supabase/supabase-js';

type UserRow = any;
type ActivityLogRow = any;

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    phone: string | null;
    role: 'user' | 'admin';
    status: 'active' | 'pending' | 'suspended';
    created_at: string;
    last_login_at: string | null;
}

export interface ActivityLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    user_id: string | null;
    user_name?: string;
    user_email?: string;
    project_id: string | null;
    old_value: unknown;
    new_value: unknown;
    created_at: string;
}

export interface SystemStats {
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    totalProjects: number;
    totalTasks: number;
}

/**
 * Fetch all users for admin management
 */
export async function getAllUsers(supabase: SupabaseClient): Promise<AdminUser[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        throw new Error('Không thể tải danh sách người dùng');
    }

    return (data || []).map((user: UserRow) => ({
        id: user.id,
        email: user.email || '',
        name: user.name || '',
        avatar_url: user.avatar_url,
        phone: user.phone,
        role: (user.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
        status: (user.status || 'active') as 'active' | 'pending' | 'suspended',
        created_at: user.created_at || new Date().toISOString(),
        last_login_at: user.last_login_at,
    }));
}

/**
 * Update user status (activate/suspend)
 */
export async function updateUserStatus(
    supabase: SupabaseClient,
    userId: string,
    status: 'active' | 'suspended'
): Promise<void> {
    const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId);

    if (error) {
        console.error('Error updating user status:', error);
        throw new Error('Không thể cập nhật trạng thái người dùng');
    }
}

/**
 * Update user role
 */
export async function updateUserRole(
    supabase: SupabaseClient,
    userId: string,
    role: 'user' | 'admin'
): Promise<void> {
    const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);

    if (error) {
        console.error('Error updating user role:', error);
        throw new Error('Không thể cập nhật vai trò người dùng');
    }
}

/**
 * Trigger password reset email for a user
 */
export async function resetUserPassword(supabase: SupabaseClient, email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://planora-app.vercel.app/reset-password`,
    });

    if (error) {
        console.error('Error resetting password:', error);
        throw new Error('Không thể gửi email đặt lại mật khẩu');
    }
}

/**
 * Fetch activity logs for system monitoring
 */
export async function getActivityLogs(supabase: SupabaseClient, limit: number = 50): Promise<ActivityLog[]> {
    const { data, error } = await supabase
        .from('activity_logs')
        .select(`
      *,
      users:user_id (name, email)
    `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching activity logs:', error);
        throw new Error('Không thể tải nhật ký hoạt động');
    }

    return (data || []).map((log: ActivityLogRow & { users?: { name: string; email: string } | null }) => ({
        id: log.id,
        action: log.action || 'unknown',
        entity_type: log.entity_type || 'unknown',
        entity_id: log.entity_id,
        user_id: log.user_id,
        user_name: log.users?.name,
        user_email: log.users?.email,
        project_id: log.project_id,
        old_value: log.old_value,
        new_value: log.new_value,
        created_at: log.created_at || new Date().toISOString(),
    }));
}

/**
 * Fetch system statistics for dashboard
 */
export async function getSystemStats(supabase: SupabaseClient): Promise<SystemStats> {
    // Fetch counts in parallel
    const [usersResult, projectsResult, tasksResult] = await Promise.all([
        supabase.from('users').select('id, role, status', { count: 'exact', head: false }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    ]);

    const users = usersResult.data || [];
    const totalUsers = users.length;
    const activeUsers = users.filter((u: { status?: string }) => u.status === 'active').length;
    const adminUsers = users.filter((u: { role?: string }) => u.role === 'admin').length;

    return {
        totalUsers,
        activeUsers,
        adminUsers,
        totalProjects: projectsResult.count || 0,
        totalTasks: tasksResult.count || 0,
    };
}

/**
 * Delete a user (soft delete - sets status to suspended)
 */
export async function deleteUser(supabase: SupabaseClient, userId: string): Promise<void> {
    // For safety, we soft-delete by suspending the user
    return updateUserStatus(supabase, userId, 'suspended');
}

// --- PROJECT MANAGEMENT ---

export interface AdminProject {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    owner_name: string | null;
    owner_email: string | null;
    member_count: number;
    task_count: number;
    created_at: string;
    updated_at: string;
}

/**
 * Fetch all projects for admin management
 */
export async function getAllProjects(supabase: SupabaseClient): Promise<AdminProject[]> {
    // Fetch projects with owner info
    const { data: projects, error } = await supabase
        .from('projects')
        .select(`
            *,
            owner:owner_id (name, email)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error);
        throw new Error('Không thể tải danh sách dự án');
    }

    // Get member counts and task counts
    const projectIds = (projects || []).map((p: any) => p.id);

    const [membersResult, tasksResult] = await Promise.all([
        supabase
            .from('project_members')
            .select('project_id')
            .in('project_id', projectIds),
        supabase
            .from('tasks')
            .select('project_id')
            .in('project_id', projectIds)
            .is('deleted_at', null),
    ]);

    // Count members and tasks per project
    const memberCounts = new Map<string, number>();
    const taskCounts = new Map<string, number>();

    (membersResult.data || []).forEach((m: { project_id: string | null }) => {
        if (m.project_id) {
            memberCounts.set(m.project_id, (memberCounts.get(m.project_id) || 0) + 1);
        }
    });

    (tasksResult.data || []).forEach((t: { project_id: string | null }) => {
        if (t.project_id) {
            taskCounts.set(t.project_id, (taskCounts.get(t.project_id) || 0) + 1);
        }
    });

    return (projects || []).map((p: {
        id: string;
        name: string;
        description: string | null;
        owner_id: string | null;
        owner?: { name: string; email: string } | null;
        created_at: string | null;
        updated_at: string | null;
    }) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        owner_id: p.owner_id || '',
        owner_name: p.owner?.name || null,
        owner_email: p.owner?.email || null,
        member_count: memberCounts.get(p.id) || 0,
        task_count: taskCounts.get(p.id) || 0,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
    }));
}

/**
 * Delete a project (soft delete)
 */
export async function deleteProject(supabase: SupabaseClient, projectId: string): Promise<void> {
    const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId);

    if (error) {
        console.error('Error deleting project:', error);
        throw new Error('Không thể xóa dự án');
    }
}

// --- DETAILED STATISTICS ---

export interface TaskStatusStats {
    status: string;
    count: number;
}

export interface MonthlyStats {
    month: string;
    projects: number;
    users: number;
}

export interface DetailedStats {
    tasksByStatus: TaskStatusStats[];
    monthlyData: MonthlyStats[];
    usersByRole: { role: string; count: number }[];
    totalStats: {
        totalUsers: number;
        totalProjects: number;
        totalTasks: number;
        completedTasks: number;
    };
}

/**
 * Fetch detailed statistics for charts
 */
export async function getDetailedStats(supabase: SupabaseClient): Promise<DetailedStats> {
    // Fetch all data in parallel
    const [usersResult, projectsResult, tasksResult] = await Promise.all([
        supabase.from('users').select('id, role, created_at'),
        supabase.from('projects').select('id, created_at').is('deleted_at', null),
        supabase.from('tasks').select('id, status, created_at').is('deleted_at', null),
    ]);

    // Debug logging - check for errors
    if (tasksResult.error) {
        console.error('Error fetching tasks:', tasksResult.error);
    }
    console.log('Tasks fetched:', tasksResult.data?.length || 0, 'tasks');

    const users = usersResult.data || [];
    const projects = projectsResult.data || [];
    const tasks = tasksResult.data || [];

    // Tasks by status
    const statusCounts = new Map<string, number>();
    tasks.forEach((t: { status: string }) => {
        const status = t.status || 'unknown';
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });
    const tasksByStatus: TaskStatusStats[] = Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
    }));

    // Users by role
    const roleCounts = new Map<string, number>();
    users.forEach((u: { role?: string }) => {
        const role = u.role || 'user';
        roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    });
    const usersByRole = Array.from(roleCounts.entries()).map(([role, count]) => ({
        role,
        count,
    }));

    // Monthly data (last 6 months)
    const monthlyData: MonthlyStats[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const monthStr = `${month}/${year}`;
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const projectCount = projects.filter((p: { created_at: string | null }) => {
            if (!p.created_at) return false;
            const d = new Date(p.created_at);
            return d >= startOfMonth && d <= endOfMonth;
        }).length;

        const userCount = users.filter((u: { created_at: string | null }) => {
            if (!u.created_at) return false;
            const d = new Date(u.created_at);
            return d >= startOfMonth && d <= endOfMonth;
        }).length;

        monthlyData.push({
            month: monthStr,
            projects: projectCount,
            users: userCount,
        });
    }

    // Total stats
    const completedTasks = tasks.filter((t: { status: string }) =>
        t.status === 'done' || t.status === 'completed'
    ).length;

    return {
        tasksByStatus,
        monthlyData,
        usersByRole,
        totalStats: {
            totalUsers: users.length,
            totalProjects: projects.length,
            totalTasks: tasks.length,
            completedTasks,
        },
    };
}
