"use client"

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase-client';
import {
  getDiscoverableProjects,
  requestToJoinProject,
  type DiscoverableProject,
} from '@backend/services/joinRequestService';

export type { DiscoverableProject };

interface UseProjectDiscoveryProps {
    initialQuery?: string;
}

interface UseProjectDiscoveryReturn {
    projects: DiscoverableProject[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    requestToJoin: (projectId: string) => Promise<boolean>;
    refetch: () => Promise<void>;
}

export function useProjectDiscovery({ initialQuery = '' }: UseProjectDiscoveryProps = {}): UseProjectDiscoveryReturn {
    const [projects, setProjects] = useState<DiscoverableProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Get current user on mount
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setCurrentUserId(data.user.id);
            }
        });
    }, []);

    // Fetch all discoverable projects once when user is available
    const fetchDiscoverableProjects = useCallback(async () => {
        if (!currentUserId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getDiscoverableProjects(supabase as any, '');
            setProjects(data);
        } catch (err: any) {
            console.error('Error fetching discoverable projects:', err);
            setError(err.message || 'Không thể tải danh sách dự án');
            toast.error('Không thể tải danh sách dự án');
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    // Fetch on mount (once currentUserId is available)
    useEffect(() => {
        if (!currentUserId) return;
        fetchDiscoverableProjects();
        // Only run once when currentUserId is available
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserId]);

    // Filter projects on client side based on search query
    const filteredProjects = projects.filter((project) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            project.name.toLowerCase().includes(query) ||
            (project.description && project.description.toLowerCase().includes(query))
        );
    });

    // Request to join a project
    const requestToJoin = useCallback(async (projectId: string): Promise<boolean> => {
        if (!currentUserId) {
            toast.error('Vui lòng đăng nhập');
            return false;
        }

        // Optimistic update — immediately mark as requested
        setProjects((prev) =>
            prev.map((project) =>
                project.id === projectId ? { ...project, has_requested: true } : project
            )
        );

        try {
            const result = await requestToJoinProject(supabase as any, {
                projectId,
                userId: currentUserId,
            });

            if (!result.success) {
                // Rollback optimistic update on business error
                setProjects((prev) =>
                    prev.map((project) =>
                        project.id === projectId ? { ...project, has_requested: false } : project
                    )
                );
                // Show specific message (e.g. already requested)
                toast.info(result.error ?? 'Không thể gửi yêu cầu');
                return false;
            }

            toast.success('Đã gửi yêu cầu tham gia dự án');
            return true;
        } catch (err: any) {
            console.error('Error requesting to join project:', err);

            // Rollback optimistic update on error
            setProjects((prev) =>
                prev.map((project) =>
                    project.id === projectId ? { ...project, has_requested: false } : project
                )
            );

            toast.error('Không thể gửi yêu cầu: ' + (err.message || 'Đã xảy ra lỗi'));
            return false;
        }
    }, [currentUserId]);

    // Manual refetch function
    const refetch = useCallback(async () => {
        await fetchDiscoverableProjects();
    }, [fetchDiscoverableProjects]);

    return {
        projects: filteredProjects,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        requestToJoin,
        refetch,
    };
}
