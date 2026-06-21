// Export all hooks
export { useSupabaseAuth } from './useAuth';
export type { User } from './useAuth';

export { useProjects } from './useProjects';
export type { Project, ProjectMember, ProjectInvitation } from './useProjects';

export { useTasks } from './useTasks';
export type { Task, TaskProposal, Comment, Attachment } from './useTasks';

export { useSprints } from './useSprints';
export type { Sprint } from './useSprints';

export { useNotifications } from './useNotifications';
export type { Notification } from './useNotifications';

export { useSettings } from './useSettings';
export type { Settings } from './useSettings';

export { useProjectDiscovery } from './useProjectDiscovery';
export type { DiscoverableProject } from './useProjectDiscovery';

export { useJoinRequests } from './useJoinRequests';
export type { JoinRequest } from './useJoinRequests';
