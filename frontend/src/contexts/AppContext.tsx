import { createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSupabaseAuth } from '../hooks/useAuth';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useSprints } from '../hooks/useSprints';
import { useNotifications } from '../hooks/useNotifications';
import { useSettings } from '../hooks/useSettings';
import type { User, Project, Task, Sprint, Settings, Notification, ProjectInvitation } from '../types';
import type { NotificationType } from "@backend/types/index";
import type { UserRole } from '../hooks/useSupabaseAuth';

interface AppContextType {
    // Auth
    user: User | null;
    isLoading: boolean;
    role: UserRole | null;
    adminEmail: string | null;
    handleLogin: (email: string, password: string) => Promise<void>;
    handleRegister: (data: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
    handleLogout: () => Promise<void>;
    handleUpdateUser: (user: User) => Promise<void>;

    // Projects
    projects: Project[];
    selectedProjectId: string | null;
    invitations: ProjectInvitation[];
    handleSelectProject: (projectId: string) => void;
    handleUpdateProject: (projectId: string, updates: Partial<Project>) => void;
    handleDeleteProject: (projectId: string) => void;
    handleRestoreProject: (projectId: string) => void;
    handlePermanentlyDeleteProject: (projectId: string) => void;
    handleSendInvitation: (projectId: string, email: string) => Promise<boolean>;
    handleAcceptInvitation: (invitationId: string) => void;
    handleRejectInvitation: (invitationId: string) => void;
    handleRemoveMember: (projectId: string, userId: string) => Promise<boolean>;
    handleLeaveProject: (projectId: string) => Promise<boolean>;
    handleUpdateMemberRole: (projectId: string, userId: string, newRole: 'manager' | 'member') => Promise<boolean>;

    // Tasks
    tasks: Task[];
    handleCreateTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'attachments'>) => void;
    handleUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    handleDeleteTask: (taskId: string) => void;
    handleRestoreTask: (taskId: string) => void;
    handlePermanentlyDeleteTask: (taskId: string) => void;
    handleAddComment: (taskId: string, content: string) => void;
    handleAddAttachment: (taskId: string, file: { name: string; url: string; type: string }) => void;
    handleDeleteAttachment: (attachmentId: string) => void;
    handleUploadFile: (taskId: string, file: File) => Promise<{ success: boolean }>;
    handleProposeTask: (projectId: string, task: { title: string; description: string; priority: 'low' | 'medium' | 'high' | 'urgent' }) => void;
    handleApproveTaskProposal: (proposalId: string) => void;
    handleRejectTaskProposal: (proposalId: string) => void;

    // Sprints
    sprints: Sprint[];
    handleCreateSprint: (projectId: string, name: string, goal: string, taskIds: string[]) => void;
    handleEndSprint: (sprintId: string) => void;

    // Notifications
    notifications: Notification[];
    handleAddNotification: (type: NotificationType, title: string, content: string, entityType?: string, entityId?: string) => Promise<boolean>;
    handleMarkNotificationAsRead: (notificationId: string) => void;
    handleMarkAllNotificationsAsRead: () => void;
    handleDeleteNotification: (notificationId: string) => void;

    // Settings
    settings: Settings;
    handleUpdateSettings: (settings: Settings) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

interface AppProviderProps {
    children: ReactNode;
    onEnterAdmin?: (email: string, password: string) => void;
}

export function AppProvider({ children, onEnterAdmin }: AppProviderProps) {
    const navigate = useNavigate();

    // Use all hooks
    const auth = useSupabaseAuth();
    const notificationsHook = useNotifications({ user: auth.user });
    const projectsHook = useProjects({
        user: auth.user,
    });
    const tasksHook = useTasks({ user: auth.user });
    const sprintsHook = useSprints({ user: auth.user });
    const settingsHook = useSettings(auth.user?.id);

    // Wrapped handlers with navigation (async for Supabase)
    const handleLogin = async (email: string, password: string) => {
        const result = await auth.handleLogin(email, password);
        if (result) {
            navigate(result.role === 'admin' ? '/admin/dashboard' : '/dashboard');
        }
    };

    const handleRegister = async (data: { email: string; password: string; name: string; phone?: string }) => {
        const result = await auth.handleRegister(data);
        if (result) {
            navigate(result.role === 'admin' ? '/admin/dashboard' : '/dashboard');
        }
    };

    const handleLogout = async () => {
        await auth.handleLogout();
        projectsHook.setSelectedProjectId(null);
        // Ensure Login page never inherits a previous user's dark mode.
        // Always use light mode for logged-out screens.
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark');
        }
        navigate('/login');
    };

    const handleSelectProject = (projectId: string) => {
        projectsHook.handleSelectProject(projectId);
        navigate(`/project/${projectId}`);
    };

    const handleDeleteProject = (projectId: string) => {
        projectsHook.handleDeleteProject(projectId);
        if (projectsHook.selectedProjectId === projectId) {
            projectsHook.setSelectedProjectId(null);
            navigate('/dashboard');
        }
    };

    const handlePermanentlyDeleteProject = (projectId: string) => {
        projectsHook.handlePermanentlyDeleteProject(projectId);
    };

    // Comment adapter
    const handleAddComment = (taskId: string, content: string) => {
        if (!auth.user) return;
        tasksHook.addComment(taskId, content);
    };

    // Attachment adapter
    const handleAddAttachment = (taskId: string, file: { name: string; url: string; type: string }) => {
        if (!auth.user) return;
        tasksHook.addAttachmentByUrl(taskId, file);
    };

    const handleDeleteAttachment = (attachmentId: string) => {
        if (!auth.user) return;
        tasksHook.deleteAttachment(attachmentId);
    };

    const handleUploadFile = async (taskId: string, file: File) => {
        if (!auth.user) return { success: false };
        return await tasksHook.addAttachment(taskId, file);
    };

    // Propose task adapter
    const handleProposeTask = (
        projectId: string,
        task: { title: string; description: string; priority: 'low' | 'medium' | 'high' | 'urgent' }
    ) => {
        if (!auth.user) return;
        const project = projectsHook.projects.find(p => p.id === projectId);
        tasksHook.proposeTaskChange('', task, `Proposed by ${auth.user.name}`);
        if (project) {
            notificationsHook.handleAddNotification(
                'project_update' as any,
                'Có đề xuất nhiệm vụ mới',
                `${auth.user.name} đã đề xuất tạo nhiệm vụ: "${task.title}" trong dự án "${project.name}"`,
                'project',
                project.id
            );
        }
    };

    const handleApproveTaskProposal = (proposalId: string) => {
        const proposal = tasksHook.taskProposals.find((p: any) => p.id === proposalId);
        if (!proposal) return;

        tasksHook.approveProposal(proposalId);
        notificationsHook.handleAddNotification(
            'project_update' as any,
            'Đề xuất được chấp thuận',
            `Đề xuất của bạn cho nhiệm vụ "${proposal.changes.title || 'Unknown'}" đã được chấp thuận`
        );
    };

    const handleRejectTaskProposal = (proposalId: string) => {
        const proposal = tasksHook.taskProposals.find((p: any) => p.id === proposalId);
        if (!proposal) return;

        tasksHook.rejectProposal(proposalId);
        notificationsHook.handleAddNotification(
            'project_update' as any,
            'Đề xuất bị từ chối',
            `Đề xuất của bạn cho nhiệm vụ "${proposal.changes.title || 'Unknown'}" đã bị từ chối`
        );
    };

    const value: AppContextType = {
        // Auth
        user: auth.user,
        isLoading: auth.isLoading,
        role: auth.role,
        adminEmail: auth.adminEmail,
        handleLogin,
        handleRegister,
        handleLogout,
        handleUpdateUser: auth.handleUpdateUser,

        // Projects
        projects: projectsHook.projects,
        selectedProjectId: projectsHook.selectedProjectId,
        invitations: projectsHook.invitations,
        handleSelectProject,
        handleUpdateProject: projectsHook.handleUpdateProject,
        handleDeleteProject,
        handleRestoreProject: projectsHook.handleRestoreProject,
        handlePermanentlyDeleteProject,
        handleSendInvitation: projectsHook.handleSendInvitation,
        handleAcceptInvitation: projectsHook.handleAcceptInvitation,
        handleRejectInvitation: projectsHook.handleRejectInvitation,
        handleRemoveMember: projectsHook.handleRemoveMember,
        handleLeaveProject: projectsHook.handleLeaveProject,
        handleUpdateMemberRole: projectsHook.handleUpdateMemberRole,

        // Tasks
        tasks: tasksHook.tasks,
        handleCreateTask: tasksHook.createTask,
        handleUpdateTask: tasksHook.updateTask,
        handleDeleteTask: tasksHook.deleteTask,
        handleRestoreTask: tasksHook.restoreTask,
        handlePermanentlyDeleteTask: tasksHook.permanentlyDeleteTask,
        handleAddComment,
        handleAddAttachment,
        handleDeleteAttachment,
        handleUploadFile,
        handleProposeTask,
        handleApproveTaskProposal,
        handleRejectTaskProposal,

        // Sprints
        sprints: sprintsHook.sprints,
        handleCreateSprint: sprintsHook.handleCreateSprint,
        handleEndSprint: sprintsHook.handleEndSprint,

        // Notifications
        notifications: notificationsHook.notifications,
        handleAddNotification: notificationsHook.handleAddNotification,
        handleMarkNotificationAsRead: notificationsHook.handleMarkNotificationAsRead,
        handleMarkAllNotificationsAsRead: notificationsHook.handleMarkAllNotificationsAsRead,
        handleDeleteNotification: notificationsHook.handleDeleteNotification,

        // Settings
        settings: settingsHook.settings,
        handleUpdateSettings: settingsHook.handleUpdateSettings,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}
