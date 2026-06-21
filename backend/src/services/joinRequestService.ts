// =====================================================
// JOIN REQUEST SERVICE - Planora Backend
// =====================================================
// Business logic for Join Requests and Project Discovery
// =====================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceResult } from '../types/index.js';

// --- Types ---

export interface JoinRequest {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  email: string;
  requestType: 'request' | 'invitation';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface DiscoverableProject {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  deadline?: string | null;
  member_count: number;
  has_requested: boolean;
}

// --- Fetch Join Requests (for managers) ---

/**
 * Get join requests for projects managed by the user
 */
export async function fetchJoinRequestsForManager(
  supabase: SupabaseClient,
  managedProjectIds: string[]
): Promise<JoinRequest[]> {
  if (managedProjectIds.length === 0) return [];

  const { data, error } = await supabase
    .from('join_requests')
    .select(`
      id,
      project_id,
      user_id,
      request_type,
      status,
      created_at,
      projects!inner (
        id,
        name
      ),
      users!join_requests_user_id_fkey (
        id,
        name,
        email
      )
    `)
    .eq('request_type', 'request')
    .in('project_id', managedProjectIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Không thể lấy join requests: ${error.message}`);

  return (data ?? []).map((r: any): JoinRequest => ({
    id: r.id,
    projectId: r.project_id,
    projectName: r.projects?.name ?? 'Unknown Project',
    userId: r.user_id,
    userName: r.users?.name ?? 'Unknown User',
    email: r.users?.email ?? '',
    requestType: r.request_type,
    status: r.status,
    createdAt: r.created_at,
  }));
}

// --- Request To Join ---

export interface RequestToJoinInput {
  projectId: string;
  userId: string;
}

/**
 * Send join request to project (from user)
 * Auto create notification for user
 */
export async function requestToJoinProject(
  supabase: SupabaseClient,
  input: RequestToJoinInput
): Promise<ServiceResult> {
  const { projectId, userId } = input;

  const { error: insertError } = await supabase.from('join_requests').insert({
    project_id: projectId,
    user_id: userId,
    request_type: 'request',
    status: 'pending',
  });

  if (insertError) {
    // Unique constraint violation — already requested
    if (insertError.code === '23505') {
      return { success: false, error: 'Bạn đã gửi yêu cầu tham gia dự án này rồi' };
    }
    return { success: false, error: insertError.message };
  }

  // Get project name for notification
  const { data: projectData } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single();

  const projectName = projectData?.name ?? 'dự án';

  // Create notification for user
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'join_request_sent',
    title: 'Đã gửi yêu cầu tham gia',
    message: `Bạn đã gửi yêu cầu tham gia dự án "${projectName}". Chủ dự án sẽ xem xét yêu cầu của bạn.`,
    entity_type: 'project',
    entity_id: projectId,
    project_id: projectId,
    is_read: false,
  });

  return { success: true };
}

// --- Approve / Decline Join Request ---

/**
 * Accept join request
 */
export async function approveJoinRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<ServiceResult> {
  const { error } = await supabase.rpc('approve_join_request', {
    request_id: requestId,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Decline join request
 */
export async function declineJoinRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<ServiceResult> {
  const { error } = await supabase.rpc('decline_join_request', {
    request_id: requestId,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// --- Discoverable Projects ---

/**
 * Get list of public projects that users can request to join.
 * Calls Supabase RPC `get_discoverable_projects`.
 */
export async function getDiscoverableProjects(
  supabase: SupabaseClient,
  searchText: string = ''
): Promise<DiscoverableProject[]> {
  const { data, error } = await supabase.rpc('get_discoverable_projects', {
    search_text: searchText,
  });

  if (error) throw new Error(`Không thể tải danh sách dự án: ${error.message}`);
  return (data ?? []) as DiscoverableProject[];
}
