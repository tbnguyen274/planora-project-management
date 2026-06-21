// =====================================================
// PROJECT ACTIVITY SERVICE
// =====================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProjectActivityLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    user_id: string | null;
    user_name?: string;
    project_id: string | null;
    task_id: string | null;
    task_title?: string;
    old_value: any;
    new_value: any;
    created_at: string;
}

/**
 * Fetch activity logs for a specific project
 */
export async function getProjectActivityLogs(supabase: SupabaseClient, projectId: string, limit: number = 50): Promise<ProjectActivityLog[]> {
    const { data, error } = await supabase
        .from('activity_logs')
        .select(`
            *,
            users:user_id (name),
            tasks:task_id (title)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching project activity logs:', error);
        return [];
    }

    return (data || []).map((log: any) => ({
        id: log.id,
        action: log.action || 'unknown',
        entity_type: log.entity_type || 'unknown',
        entity_id: log.entity_id,
        user_id: log.user_id,
        user_name: log.users?.name,
        project_id: log.project_id,
        task_id: log.task_id,
        task_title: log.tasks?.title,
        old_value: log.old_value,
        new_value: log.new_value,
        created_at: log.created_at || new Date().toISOString(),
    }));
}
