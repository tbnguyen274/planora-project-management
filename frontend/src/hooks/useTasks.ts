import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import type { User } from './useAuth';
import { supabase } from '../lib/supabase-client';
import {
  getTasksByUser,
  getTasksByProject,
  createTask as createTaskService,
  updateTask as updateTaskService,
  deleteTask as deleteTaskService,
  restoreTask as restoreTaskService,
  permanentlyDeleteTask as hardDeleteTaskService,
  addComment as addCommentService,
  addAttachment as addAttachmentService,
  deleteAttachment as deleteAttachmentService
} from '@backend/services/taskService';
import type { Task, Comment, Attachment, TaskProposal } from '@backend/types/index';

// Re-export for backward compatibility
export type { Task, Comment, Attachment, TaskProposal };

interface UseTasksProps {
  user: User | null;
  projectId?: string;
}

export const useTasks = ({ user, projectId }: UseTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskProposals, setTaskProposals] = useState<TaskProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const channelsRef = useRef<any[]>([]);

  // ========================================
  // 1. FETCH DATA
  // ========================================
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      let data;
      if (projectId) {
        data = await getTasksByProject(supabase as any, projectId);
      } else {
        data = await getTasksByUser(supabase as any, user.id);
      }
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Lỗi khi tải danh sách nhiệm vụ');
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  // ========================================
  // 2. INITIAL LOAD & REALTIME
  // ========================================
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!user) return;

    const channelId = `${user.id}_${Date.now()}`;

    const tasksChannel = supabase
      .channel(`tasks_changes_${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    const commentsChannel = supabase
      .channel(`comments_changes_${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchTasks();
      })
      .subscribe();

    const attachmentsChannel = supabase
      .channel(`attachments_changes_${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attachments' }, () => {
        fetchTasks();
      })
      .subscribe();

    channelsRef.current = [tasksChannel, commentsChannel, attachmentsChannel];

    return () => {
      channelsRef.current.forEach(c => supabase.removeChannel(c));
      channelsRef.current = [];
    };
  }, [user, fetchTasks]);

  // ========================================
  // 3. HANDLERS
  // ========================================
  const createTask = async (taskData: Omit<Task, 'id' | 'comments' | 'attachments' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để tạo nhiệm vụ');
      return { success: false, error: 'Not logged in' };
    }
    const res = await createTaskService(supabase as any, {
      ...taskData,
      reporterId: user.id,
      assignees: taskData.assignees || [],
    });
    
    if (res.success) {
      toast.success('Đã tạo nhiệm vụ');
      fetchTasks();
      return { success: true, taskId: res.data?.taskId };
    }
    toast.error(res.error || 'Lỗi khi tạo nhiệm vụ');
    return { success: false, error: res.error };
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để cập nhật nhiệm vụ');
      return { success: false, error: 'Not logged in' };
    }
    const res = await updateTaskService(supabase as any, taskId, updates, user.id);
    if (res.success) {
      fetchTasks();
      return { success: true };
    }
    toast.error(res.error || 'Lỗi khi cập nhật nhiệm vụ');
    return { success: false, error: res.error };
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return { success: false };
    const res = await deleteTaskService(supabase as any, taskId, user.id);
    if (res.success) {
      toast.success('Đã chuyển nhiệm vụ vào thùng rác');
      fetchTasks();
      return { success: true };
    }
    toast.error(res.error);
    return { success: false, error: res.error };
  };

  const restoreTask = async (taskId: string) => {
    const res = await restoreTaskService(supabase as any, taskId);
    if (res.success) {
      toast.success('Đã khôi phục nhiệm vụ');
      fetchTasks();
      return { success: true };
    }
    toast.error(res.error);
    return { success: false, error: res.error };
  };

  const permanentlyDeleteTask = async (taskId: string) => {
    const res = await hardDeleteTaskService(supabase as any, taskId);
    if (res.success) {
      toast.success('Đã xóa vĩnh viễn nhiệm vụ');
      fetchTasks();
      return { success: true };
    }
    toast.error(res.error);
    return { success: false, error: res.error };
  };

  const addComment = async (taskId: string, content: string) => {
    if (!user) return { success: false };
    const res = await addCommentService(supabase as any, taskId, content, user.id);
    if (res.success) {
      fetchTasks();
      return { success: true, commentId: res.data?.commentId };
    }
    toast.error(res.error);
    return { success: false, error: res.error };
  };

  const addAttachmentByUrl = async (taskId: string, attachment: { name: string; url: string; type: string }) => {
    if (!user) return { success: false };
    const res = await addAttachmentService(supabase as any, taskId, attachment, user.id);
    if (res.success) {
      fetchTasks();
      return { success: true, attachmentId: res.data?.attachmentId };
    }
    toast.error(res.error);
    return { success: false, error: res.error };
  };

  const addAttachment = async (taskId: string, file: File) => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để tải tệp lên');
      return { success: false, error: 'Not logged in' };
    }
    try {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Kích thước file vượt quá 10MB');
        return { success: false, error: 'File too large' };
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${uuidv4()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      return await addAttachmentByUrl(taskId, {
        name: file.name,
        url: publicUrl,
        type: file.type || 'application/octet-stream',
      });
    } catch (error: any) {
      toast.error('Lỗi khi tải tệp lên');
      return { success: false, error: error.message };
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    const res = await deleteAttachmentService(supabase as any, attachmentId);
    if (res.success && res.data) {
      const { url } = res.data;
      const urlParts = url.split('/storage/v1/object/public/task-attachments/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('task-attachments').remove([filePath]);
      }
      fetchTasks();
      return { success: true };
    }
    toast.error(res.error);
    return { success: false, error: res.error };
  };

  // Proposals (mocked as state for now, similar to original)
  const proposeTaskChange = async (taskId: string, changes: Partial<Task>, reason?: string) => {
    if (!user) return { success: false };
    const newProposal: TaskProposal = {
      id: uuidv4(),
      taskId,
      changes,
      reason,
      proposedBy: user.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setTaskProposals(prev => [...prev, newProposal]);
    toast.success('Đã gửi đề xuất thay đổi');
    return { success: true };
  };

  const approveProposal = async (proposalId: string) => {
    const proposal = taskProposals.find(p => p.id === proposalId);
    if (!proposal) return { success: false };
    const res = await updateTask(proposal.taskId, proposal.changes);
    if (res.success) {
      setTaskProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: 'approved' as const } : p));
      toast.success('Đã phê duyệt đề xuất');
    }
    return res;
  };

  const rejectProposal = (proposalId: string) => {
    setTaskProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: 'rejected' as const } : p));
    toast.success('Đã từ chối đề xuất');
    return { success: true };
  };

  return {
    tasks,
    taskProposals,
    loading,
    createTask,
    updateTask,
    deleteTask,
    restoreTask,
    permanentlyDeleteTask,
    addComment,
    addAttachment,
    addAttachmentByUrl,
    deleteAttachment,
    proposeTaskChange,
    approveProposal,
    rejectProposal,
  };
};
