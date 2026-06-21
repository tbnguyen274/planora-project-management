// =====================================================
// AUTH SERVICE
// =====================================================

import type { UserRole, UserStatus, ServiceResult } from '../types/index.js';
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Role & Status Check ---

/**
 * Get user role and status from public.users table
 */
export async function getUserRoleAndStatus(
  supabase: SupabaseClient, userId: string
): Promise<{ role: UserRole; status: UserStatus }> {
  const { data, error } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Failed to fetch user role from public.users:', error);
    return { role: 'user', status: 'active' };
  }

  const dbRole = typeof data?.role === 'string' ? data.role.toLowerCase() : 'user';
  const dbStatus = typeof data?.status === 'string' ? data.status : 'active';

  return {
    role: dbRole === 'admin' ? 'admin' : 'user',
    status: dbStatus as UserStatus,
  };
}

/**
 * Check if user is suspended
 */
export async function isUserSuspended(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { status } = await getUserRoleAndStatus(supabase, userId);
  return status === 'suspended';
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { role } = await getUserRoleAndStatus(supabase, userId);
  return role === 'admin';
}

// --- Password Reset ---

/**
 * Admin reset password for user by email
 */
export async function adminResetPasswordByEmail(
  supabase: SupabaseClient, email: string,
  redirectTo: string
): Promise<ServiceResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// --- Session Validation ---

/**
 * Validate JWT token and return user ID
 */
export async function validateToken(
  supabase: SupabaseClient, jwtToken: string
): Promise<ServiceResult<{ userId: string; email: string }>> {
  const { data, error } = await supabase.auth.getUser(jwtToken);

  if (error || !data.user) {
    return { success: false, error: 'Token không hợp lệ hoặc đã hết hạn' };
  }

  return {
    success: true,
    data: {
      userId: data.user.id,
      email: data.user.email ?? '',
    },
  };
}
