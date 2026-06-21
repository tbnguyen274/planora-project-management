import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { User } from './useAuth';
import { supabase } from '../lib/supabase-client';
import {
  getSprintsByUser,
  getSprintsByProject,
  createSprint,
  endSprint
} from '@backend/services/sprintService';
import type { Sprint } from '@backend/types/index';

import type { CreateSprintInput } from '@backend/services/sprintService';
export type { Sprint, CreateSprintInput };

interface UseSprintsProps {
  user: User | null;
  projectId?: string;
}

export function useSprints({ user, projectId }: UseSprintsProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  const channelRef = useRef<any>(null);

  // ========================================
  // 1. FETCH DATA
  // ========================================
  const fetchSprints = useCallback(async () => {
    if (!user) {
      setSprints([]);
      setLoading(false);
      return;
    }

    try {
      let data;
      if (projectId) {
        data = await getSprintsByProject(supabase as any, projectId);
      } else {
        data = await getSprintsByUser(supabase as any, user.id);
      }
      setSprints(data);
    } catch (error) {
      console.error('Error fetching sprints:', error);
      toast.error('Lỗi khi tải danh sách sprint');
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  // ========================================
  // 2. INITIAL LOAD & REALTIME
  // ========================================
  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  useEffect(() => {
    if (!user) return;

    const channelId = `${user.id}_${Date.now()}`;

    const sprintsChannel = supabase
      .channel(`sprints_changes_${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sprints' }, () => {
        fetchSprints();
      })
      .subscribe();

    channelRef.current = sprintsChannel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchSprints]);

  // ========================================
  // 3. HANDLERS
  // ========================================
  const handleCreateSprint = async (
    targetProjectId: string,
    name: string,
    goal: string,
    taskIds: string[]
  ) => {
    if (!user) return { success: false };
    const projectSprints = sprints.filter(s => s.projectId === targetProjectId);
    const existingCount = projectSprints.length;
    
    const res = await createSprint(supabase as any, {
      projectId: targetProjectId,
      name,
      goal,
      taskIds,
      requestingUserId: user.id
    }, existingCount);
    
    if (res.success) {
      toast.success('Đã tạo sprint mới');
      fetchSprints();
      return { success: true, sprint: res.data };
    }
    toast.error(res.error);
    return { success: false, error: res.error };
  };

  const handleEndSprint = async (sprintId: string) => {
    const res = await endSprint(supabase as any, sprintId);
    if (res.success) {
      toast.success('Đã kết thúc sprint');
      fetchSprints();
      return { success: true };
    }
    toast.error(res.error);
    return { success: false, error: res.error };
  };

  // ========================================
  // 4. HELPERS
  // ========================================
  const getSprintsByProjectHelper = (pid: string) => sprints.filter(s => s.projectId === pid);
  const getCurrentSprint = (pid: string) => sprints.find(s => s.projectId === pid && s.status === 'active');
  const getCompletedSprints = (pid: string) => sprints.filter(s => s.projectId === pid && s.status === 'completed');

  return {
    sprints,
    setSprints,
    loading,
    handleCreateSprint,
    handleEndSprint,
    getSprintsByProject: getSprintsByProjectHelper,
    getCurrentSprint,
    getCompletedSprints,
    fetchSprints,
  };
}
