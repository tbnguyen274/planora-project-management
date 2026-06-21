// =====================================================
// INVITATION SERVICE
// =====================================================
// Business logic for invitation/join-request flow.
// =====================================================

import type { ProjectInvitation, ServiceResult } from '../types/index.js';
import type { SupabaseClient } from "@supabase/supabase-js";
import { addProjectMember, removeProjectMember } from '../repositories/projectRepository.js';

// --- Send ProjectInvitation ---

export interface SendProjectInvitationInput {
  projectId: string;
  projectName: string;
  inviteeEmail: string;
  currentUserId: string;
  currentUserName: string;
}

/**
 * Send invitation to user by email
 */
export async function sendProjectInvitation(
  supabase: SupabaseClient, input: SendProjectInvitationInput
): Promise<ServiceResult<{ invitationId: string; message: string }>> {
  try {
    // 1. Find user by email
    const { data: inviteeUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', input.inviteeEmail)
      .maybeSingle();

    if (userError) throw new Error('Không thể tìm thấy người dùng');
    if (!inviteeUser) {
      throw new Error(
        'Email không tồn tại trong hệ thống. Vui lòng yêu cầu người dùng đăng ký trước.'
      );
    }

    // 2. Check if already member
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', input.projectId)
      .eq('user_id', inviteeUser.id)
      .maybeSingle();

    if (existingMember) throw new Error('Người dùng đã là thành viên của dự án này');

    // 3. Check if invitation already sent
    const { data: existingProjectInvitation } = await supabase
      .from('join_requests')
      .select('id, status')
      .eq('project_id', input.projectId)
      .eq('user_id', inviteeUser.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingProjectInvitation) throw new Error('Lời mời đã được gửi trước đó');

    // 4. Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('join_requests')
      .insert({
        project_id: input.projectId,
        user_id: inviteeUser.id,
        email: inviteeUser.email,
        invited_by: input.currentUserId,
        status: 'pending',
        request_type: 'invitation',
      })
      .select('id')
      .single();

    if (inviteError) throw new Error('Không thể tạo lời mời');

    // 5. Create notification for invitee
    await supabase.from('notifications').insert({
      user_id: inviteeUser.id,
      type: 'project_invite',
      title: 'Lời mời tham gia dự án',
      content: `${input.currentUserName} đã mời bạn tham gia dự án "${input.projectName}"`,
      entity_type: 'invitation',
      entity_id: invitation.id,
      is_read: false,
    });

    return {
      success: true,
      data: {
        invitationId: invitation.id,
        message: `Đã gửi lời mời đến ${inviteeUser.name}`,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Accept ProjectInvitation ---

export interface AcceptProjectInvitationInput {
  invitationId: string;
  currentUserId: string;
  currentUserName: string;
}

/**
 * Accept project invitation
 */
export async function acceptProjectInvitation(
  supabase: SupabaseClient, input: AcceptProjectInvitationInput
): Promise<ServiceResult<{ projectId: string; projectName?: string }>> {
  try {
    // 1. Get invitation info
    const { data: invitation, error: fetchError } = await supabase
      .from('join_requests')
      .select('id, project_id, user_id, status, invited_by, projects(id, name)')
      .eq('id', input.invitationId)
      .eq('user_id', input.currentUserId)
      .single();

    if (fetchError || !invitation) throw new Error('Không tìm thấy lời mời');
    if (invitation.status !== 'pending') throw new Error('Lời mời đã được xử lý');
    if (!invitation.project_id) throw new Error('Project ID không hợp lệ');

    // 2. Add to project_members
    try {
      await addProjectMember(supabase, invitation.project_id, input.currentUserId, 'member');
    } catch (addError: any) {
      if (addError.message.includes('đã là thành viên')) {
        throw new Error('Bạn đã là thành viên của dự án này');
      }
      throw new Error(`Không thể tham gia dự án: ${addError.message}`);
    }

    // 3. Update invitation status
    const { error: updateError } = await supabase
      .from('join_requests')
      .update({ status: 'accepted' })
      .eq('id', input.invitationId)
      .eq('user_id', input.currentUserId);

    if (updateError) {
      // Rollback member addition
      await removeProjectMember(supabase, invitation.project_id, input.currentUserId);
      throw new Error('Không thể cập nhật trạng thái lời mời');
    }

    // 4. Notify inviter
    const projectName = (invitation.projects as any)?.name;
    await supabase.from('notifications').insert({
      user_id: invitation.invited_by,
      type: 'member_added',
      title: 'Thành viên mới',
      content: `${input.currentUserName} đã chấp nhận lời mời vào "${projectName}"`,
      entity_type: 'project',
      entity_id: invitation.project_id,
      is_read: false,
    });

    return {
      success: true,
      data: {
        projectId: invitation.project_id,
        projectName,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Reject ProjectInvitation ---

export interface RejectProjectInvitationInput {
  invitationId: string;
  currentUserId: string;
  currentUserName: string;
}

/**
 * Reject project invitation
 */
export async function rejectProjectInvitation(
  supabase: SupabaseClient, input: RejectProjectInvitationInput
): Promise<ServiceResult> {
  try {
    const { data: invitation, error: fetchError } = await supabase
      .from('join_requests')
      .select('id, project_id, user_id, status, invited_by, projects(id, name)')
      .eq('id', input.invitationId)
      .eq('user_id', input.currentUserId)
      .single();

    if (fetchError || !invitation) throw new Error('Không tìm thấy lời mời');
    if (invitation.status !== 'pending') throw new Error('Lời mời đã được xử lý');

    const { error: updateError } = await supabase
      .from('join_requests')
      .update({ status: 'rejected' })
      .eq('id', input.invitationId)
      .eq('user_id', input.currentUserId);

    if (updateError) throw new Error('Không thể cập nhật trạng thái');

    const projectName = (invitation.projects as any)?.name;
    await supabase.from('notifications').insert({
      user_id: invitation.invited_by,
      type: 'invitation_rejected',
      title: 'Lời mời bị từ chối',
      content: `${input.currentUserName} đã từ chối lời mời vào "${projectName}"`,
      entity_type: 'invitation',
      entity_id: input.invitationId,
      is_read: false,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Fetch Pending ProjectInvitations ---

/**
 * Get pending project invitations
 */
export async function fetchPendingProjectInvitations(supabase: SupabaseClient, userId: string): Promise<ProjectInvitation[]> {
  const { data, error } = await supabase
    .from('join_requests')
    .select(`
      id, project_id, created_at, invited_by,
      projects (id, name),
      inviter:users!join_requests_invited_by_fkey (id, name, email)
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return (data ?? []).map((inv: any): ProjectInvitation => ({
    id: inv.id,
    projectId: inv.project_id,
    projectName: inv.projects?.name ?? 'Unknown Project',
    userId,
    email: '',
    invitedBy: inv.invited_by,
    inviterName: inv.inviter?.name ?? 'Unknown',
    inviterEmail: inv.inviter?.email ?? '',
    requestType: 'invitation',
    status: 'pending',
    createdAt: inv.created_at,
  }));
}
