"use client"

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase-client';
import {
  fetchJoinRequestsForManager,
  approveJoinRequest,
  declineJoinRequest,
  type JoinRequest,
} from '@backend/services/joinRequestService';

// Re-export for backward compatibility with useProjects
export type { JoinRequest };

interface UseJoinRequestsProps {
    userId: string | null;
    managedProjectIds: string[]; // Projects where user is owner or manager
}

export function useJoinRequests({ userId, managedProjectIds }: UseJoinRequestsProps) {
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch join requests
    const fetchJoinRequests = useCallback(async () => {
        if (!userId || managedProjectIds.length === 0) {
            setJoinRequests([]);
            setLoading(false);
            return;
        }

        try {
            const data = await fetchJoinRequestsForManager(supabase as any, managedProjectIds);
            setJoinRequests(data);
        } catch (err: any) {
            console.error('Error fetching join requests:', err);
            toast.error('Không thể tải danh sách yêu cầu');
        } finally {
            setLoading(false);
        }
    }, [userId, managedProjectIds]);

    // Initial fetch
    useEffect(() => {
        fetchJoinRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, managedProjectIds.join(',')]);

    // Realtime subscription
    useEffect(() => {
        if (!userId || managedProjectIds.length === 0) return;

        const channel = supabase
            .channel(`join_requests_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'join_requests',
                    filter: `project_id=in.(${managedProjectIds.join(',')})`,
                },
                () => {
                    fetchJoinRequests();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, managedProjectIds.join(',')]);

    // Approve join request
    const handleApproveJoinRequest = useCallback(async (requestId: string) => {
        try {
            const result = await approveJoinRequest(supabase as any, requestId);
            if (!result.success) throw new Error(result.error);
            toast.success('Đã chấp nhận yêu cầu tham gia');
            await fetchJoinRequests();
        } catch (err: any) {
            console.error('Error approving join request:', err);
            toast.error('Không thể chấp nhận yêu cầu: ' + (err.message || 'Lỗi không xác định'));
        }
    }, [fetchJoinRequests]);

    // Decline join request
    const handleRejectJoinRequest = useCallback(async (requestId: string) => {
        try {
            const result = await declineJoinRequest(supabase as any, requestId);
            if (!result.success) throw new Error(result.error);
            toast.success('Đã từ chối yêu cầu tham gia');
            await fetchJoinRequests();
        } catch (err: any) {
            console.error('Error rejecting join request:', err);
            toast.error('Không thể từ chối yêu cầu: ' + (err.message || 'Lỗi không xác định'));
        }
    }, [fetchJoinRequests]);

    return {
        joinRequests,
        loading,
        handleApproveJoinRequest,
        handleRejectJoinRequest,
        refetch: fetchJoinRequests,
    };
}
