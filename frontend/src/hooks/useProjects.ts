import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { User } from './useAuth';
import { supabase } from '../lib/supabase-client';
import {
  getProjectsByUser,
  createProject,
  updateProject,
  deleteProject,
  restoreProject,
  permanentlyDeleteProject,
  removeMember,
  leaveProject,
  changeMemberRole
} from '@backend/services/projectService';
import {
  fetchPendingProjectInvitations,
  sendProjectInvitation,
  acceptProjectInvitation,
  rejectProjectInvitation
} from '@backend/services/invitationService';
import type { Project, ProjectInvitation, ProjectMember } from '@backend/types/index';

// Export these for backward compatibility
export type { Project, ProjectMember, ProjectInvitation };

interface UseProjectsProps {
  user: User | null;
}

export function useProjects({ user }: UseProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventListenerAttached = useRef(false);
  const channelsRef = useRef<any[]>([]);

  // ========================================
  // 1. FETCH DATA
  // ========================================
  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getProjectsByUser(supabase as any, user.id);
      setProjects(data);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchInvitations = useCallback(async () => {
    if (!user?.email) return;

    try {
      const pending = await fetchPendingProjectInvitations(supabase as any, user.id);
      setInvitations(pending);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  }, [user]);

  // ========================================
  // 2. INITIAL LOAD & EVENT LISTENER
  // ========================================
  useEffect(() => {
    fetchProjects();
    fetchInvitations();
  }, [fetchProjects, fetchInvitations]);

  // ========================================
  // 3. REALTIME SUBSCRIPTIONS
  // ========================================
  useEffect(() => {
    if (!user) return;

    const channelId = `${user.id}_${Date.now()}`;

    const projectsChannel = supabase
      .channel(`projects_changes_${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, () => {
        fetchProjects();
      })
      .subscribe();

    const invitationsChannel = supabase
      .channel(`invitations_changes_${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'join_requests', filter: `user_id=eq.${user.id}` }, (payload) => {
        const newRecord = payload.new as any;
        if (newRecord.request_type === 'invitation') {
          toast.info('Bạn có lời mời tham gia dự án mới!');
        }
        fetchInvitations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'join_requests', filter: `user_id=eq.${user.id}` }, () => {
        fetchInvitations();
      })
      .subscribe();

    channelsRef.current = [projectsChannel, invitationsChannel];

    return () => {
      channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [user, fetchProjects, fetchInvitations]);

  // ========================================
  // 4. CREATE PROJECT EVENT LISTENER
  // ========================================
  const handleCreateProjectEvent = useCallback(
    async (e: CustomEvent) => {
      if (!user) return;
      const projectData = (e as any).detail;

      try {
        const result = await createProject(supabase as any, {
          name: projectData.name,
          description: projectData.description,
          deadline: projectData.deadline,
          template: projectData.template,
          ownerId: user.id,
          key: projectData.key
        });

        if (!result.success) throw new Error(result.error);
        
        toast.success('Đã tạo dự án thành công');
        fetchProjects();
        if (projectData.onSuccess) projectData.onSuccess();
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi tạo dự án');
      }
    },
    [user, fetchProjects]
  );

  useEffect(() => {
    if (!eventListenerAttached.current) {
      window.addEventListener('create-project', handleCreateProjectEvent as unknown as EventListener);
      eventListenerAttached.current = true;
    }
    return () => {
      window.removeEventListener('create-project', handleCreateProjectEvent as unknown as EventListener);
      eventListenerAttached.current = false;
    };
  }, [handleCreateProjectEvent]);

  // ========================================
  // 5. HANDLERS
  // ========================================
  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    if (!user) return false;
    const res = await updateProject(supabase as any, user.id, projectId, updates);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã cập nhật dự án');
    fetchProjects();
    return true;
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return false;
    const res = await deleteProject(supabase as any, user.id, projectId);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã chuyển dự án vào thùng rác');
    if (selectedProjectId === projectId) setSelectedProjectId(null);
    fetchProjects();
    return true;
  };

  const handleRestoreProject = async (projectId: string) => {
    if (!user) return false;
    const res = await restoreProject(supabase as any, user.id, projectId);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã khôi phục dự án');
    fetchProjects();
    return true;
  };

  const handlePermanentlyDeleteProject = async (projectId: string) => {
    if (!user) return false;
    const res = await permanentlyDeleteProject(supabase as any, user.id, projectId);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã xóa vĩnh viễn dự án');
    if (selectedProjectId === projectId) setSelectedProjectId(null);
    fetchProjects();
    return true;
  };

  const handleSendInvitation = async (projectId: string, email: string) => {
    if (!user) return false;
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      toast.error('Không tìm thấy dự án');
      return false;
    }
    const res = await sendProjectInvitation(supabase as any, { 
      projectId, 
      inviteeEmail: email.toLowerCase().trim(), 
      currentUserId: user.id, 
      currentUserName: user.name || "", 
      projectName: project.name 
    });
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã gửi lời mời');
    return true;
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    const res = await acceptProjectInvitation(supabase as any, { invitationId, currentUserId: user?.id || "", currentUserName: user?.name || "" });
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã tham gia dự án');
    fetchProjects();
    fetchInvitations();
    return true;
  };

  const handleRejectInvitation = async (invitationId: string) => {
    const res = await rejectProjectInvitation(supabase as any, { invitationId, currentUserId: user?.id || "", currentUserName: user?.name || "" });
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã từ chối lời mời');
    fetchInvitations();
    return true;
  };

  const handleRemoveMember = async (projectId: string, userId: string) => {
    if (!user) return false;
    const res = await removeMember(supabase as any, user.id, projectId, userId);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã xóa thành viên');
    fetchProjects();
    return true;
  };

  const handleLeaveProject = async (projectId: string) => {
    if (!user) return false;
    const res = await leaveProject(supabase as any, user.id, projectId);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã rời khỏi dự án');
    if (selectedProjectId === projectId) setSelectedProjectId(null);
    fetchProjects();
    return true;
  };

  const handleUpdateMemberRole = async (projectId: string, targetUserId: string, newRole: 'manager' | 'member') => {
    if (!user) return false;
    const res = await changeMemberRole(supabase as any, user.id, projectId, targetUserId, newRole);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success('Đã cập nhật vai trò');
    fetchProjects();
    return true;
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const getActiveProjects = () => projects.filter((p) => !p.deletedAt);
  const getDeletedProjects = () => projects.filter((p) => p.deletedAt);

  return {
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    invitations,
    loading,
    error,
    refetch: fetchProjects,
    handleUpdateProject,
    handleDeleteProject,
    handleRestoreProject,
    handlePermanentlyDeleteProject,
    handleSelectProject,
    handleSendInvitation,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleRemoveMember,
    handleLeaveProject,
    handleUpdateMemberRole,
    getActiveProjects,
    getDeletedProjects,
  };
}
