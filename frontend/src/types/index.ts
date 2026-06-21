// Re-export all types from hooks for a centralized type module
export type { User } from '../hooks/useAuth';
export type {
    Project,
    ProjectMember,
    ProjectInvitation,
} from '../hooks/useProjects';
export type { JoinRequest } from '../hooks/useJoinRequests';
export type {
    Task,
    TaskProposal,
    Comment,
    Attachment
} from '../hooks/useTasks';
export type { Sprint } from '../hooks/useSprints';
export type { Notification } from '../hooks/useNotifications';
export type { Settings } from '../hooks/useSettings';

// Admin page type
export type AdminPage = "dashboard" | "users" | "roles";
