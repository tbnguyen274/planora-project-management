// =====================================================
// USER REPOSITORY
// =====================================================

import type { BackendUser, UserRole, UserStatus } from '../types/index.js';
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get all users
 */
export async function findAllUsers(supabase: SupabaseClient): Promise<BackendUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Không thể lấy danh sách users: ${error.message}`);

  return (data ?? []).map(mapDbUserToBackendUser);
}

/**
 * Find user by ID
 */
export async function findUserById(supabase: SupabaseClient, userId: string): Promise<BackendUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(`Không thể lấy thông tin user: ${error.message}`);
  return data ? mapDbUserToBackendUser(data) : null;
}

/**
 * Find user by email
 */
export async function findUserByEmail(supabase: SupabaseClient, email: string): Promise<BackendUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) throw new Error(`Không thể tìm user theo email: ${error.message}`);
  return data ? mapDbUserToBackendUser(data) : null;
}

/**
 * Update user status
 */
export async function updateUserStatus(
  supabase: SupabaseClient, userId: string,
  status: UserStatus
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', userId);

  if (error) throw new Error(`Không thể cập nhật trạng thái user: ${error.message}`);
}

/**
 * Update user role
 */
export async function updateUserRole(
  supabase: SupabaseClient, userId: string,
  role: UserRole
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) throw new Error(`Không thể cập nhật vai trò user: ${error.message}`);
}

/**
 * Get user statistics (counts by role and status)
 */
export async function getUserStats(supabase: SupabaseClient): Promise<{
  total: number;
  active: number;
  admins: number;
}> {
  const { data, error } = await supabase
    .from('users')
    .select('id, role, status');

  if (error) throw new Error(`Không thể lấy thống kê users: ${error.message}`);

  const users = data ?? [];
  return {
    total: users.length,
    active: users.filter((u: any) => u.status === 'active').length,
    admins: users.filter((u: any) => u.role === 'admin').length,
  };
}

// --- Private Mappers ---

function mapDbUserToBackendUser(row: any): BackendUser {
  return {
    id: row.id,
    email: row.email ?? '',
    name: row.name ?? '',
    avatarUrl: row.avatar_url,
    phone: row.phone,
    role: (row.role === 'admin' ? 'admin' : 'user') as UserRole,
    status: (row.status ?? 'active') as UserStatus,
    createdAt: row.created_at ?? new Date().toISOString(),
    lastLoginAt: row.last_login_at,
  };
}
