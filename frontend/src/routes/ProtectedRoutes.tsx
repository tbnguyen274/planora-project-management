import { Route, Routes, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ProtectedRoute } from '../components/routes/ProtectedRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { DashboardPage } from '../components/dashboard/DashboardPage';
import { ProfilePage } from '../components/profile/ProfilePage';
import { SettingsPage } from '../components/settings/SettingsPage';
import { TrashPage } from '../components/trash/TrashPage';
import { AllProjectsPage } from '../components/projects/AllProjectsPage';
import { ProjectDiscovery } from '../components/project/ProjectDiscovery';
import { MemberRequestsPage } from '../components/member-requests/MemberRequestsPage';
import { ProjectPage } from '../components/project/ProjectPage';
import { ChatAssistant } from '../components/chat/ChatAssistant';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useJoinRequests } from '../hooks/useJoinRequests';

// Wrapper component to use URL params for ProjectPage
function ProjectPageWrapper() {
    const { projectId } = useParams<{ projectId: string }>();
    const {
        user,
        projects,
        tasks,
        sprints,
        handleUpdateProject,
        handlePermanentlyDeleteProject,
        handleDeleteProject,
        handleSendInvitation,
        handleCreateTask,
        handleUpdateTask,
        handleDeleteTask,
        handleAddComment,
        handleAddAttachment,
        handleDeleteAttachment,
        handleUploadFile,
        handleCreateSprint,
        handleEndSprint,
    } = useApp();

    const project = projects.find((p) => p.id === projectId);

    if (!projectId || !project) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <ProjectPage
            user={user!}
            project={project}
            tasks={tasks.filter((t) => t.projectId === projectId)}
            sprints={sprints.filter((s) => s.projectId === projectId)}
            currentSprint={sprints.find((s) => s.projectId === projectId && s.status === 'active')}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handlePermanentlyDeleteProject}
            onMoveToTrash={handleDeleteProject}
            onSendInvitation={handleSendInvitation}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddComment={handleAddComment}
            onAddAttachment={handleAddAttachment}
            onDeleteAttachment={handleDeleteAttachment}
            onUploadFile={handleUploadFile}
            onCreateSprint={handleCreateSprint}
            onEndSprint={handleEndSprint}
        />
    );
}

interface ProtectedRoutesProps {
    onEnterAdmin?: (email: string, password: string) => void;
}

export function ProtectedRoutes({ onEnterAdmin }: ProtectedRoutesProps) {
    const navigate = useNavigate();
    const {
        user,
        projects,
        tasks,
        selectedProjectId,
        settings,
        notifications,
        invitations,
        handleSelectProject,
        handleLogout,
        handleUpdateSettings,
        handleMarkNotificationAsRead,
        handleMarkAllNotificationsAsRead,
        handleDeleteNotification,
        handleAddNotification,
        handleSendInvitation,
        handleAcceptInvitation,
        handleRejectInvitation,
        handleRestoreProject,
        handlePermanentlyDeleteProject,
        handleRestoreTask,
        handlePermanentlyDeleteTask,
        handleUpdateUser,
    } = useApp();

    const { handleChangePassword } = useAuth();

    // Filter notifications and invitations for current user
    const userNotifications = notifications.filter((n) => n.userId === user?.id);
    const userInvitations = invitations.filter((i) => i.email === user?.email);

    // Get projects where user is owner or manager
    const managedProjectIds = projects
        .filter((p) => {
            const isOwner = p.ownerId === user?.id;
            const isManager = p.members.some((m) => m.userId === user?.id && m.role === 'manager');
            return isOwner || isManager;
        })
        .map((p) => p.id);

    // Use join requests hook
    const {
        joinRequests,
        loading: joinRequestsLoading,
        handleApproveJoinRequest,
        handleRejectJoinRequest,
    } = useJoinRequests({
        userId: user?.id || null,
        managedProjectIds,
    });

    return (
        <ProtectedRoute user={user}>
            <MainLayout
                user={user!}
                projects={projects}
                selectedProjectId={selectedProjectId}
                settings={settings}
                notifications={userNotifications}
                invitations={userInvitations}
                onSelectProject={handleSelectProject}
                onLogout={handleLogout}
                onUpdateSettings={handleUpdateSettings}
                onMarkNotificationAsRead={handleMarkNotificationAsRead}
                onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
                onDeleteNotification={handleDeleteNotification}
                onAddNotification={handleAddNotification}
                onSendInvitation={handleSendInvitation}
                onAcceptInvitation={handleAcceptInvitation}
                onRejectInvitation={handleRejectInvitation}
                onRestoreProject={handleRestoreProject}
                onPermanentlyDeleteProject={handlePermanentlyDeleteProject}
                onRestoreTask={handleRestoreTask}
                onPermanentlyDeleteTask={handlePermanentlyDeleteTask}
                onEnterAdmin={onEnterAdmin}
            >
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route
                        path="/dashboard"
                        element={
                            <DashboardPage
                                user={user!}
                                projects={projects.filter((p) => !p.deletedAt)}
                                tasks={tasks}
                                onSelectProject={handleSelectProject}
                            />
                        }
                    />
                    <Route path="/profile" element={<ProfilePage user={user!} onUpdateUser={handleUpdateUser} onChangePassword={handleChangePassword} />} />
                    <Route
                        path="/settings"
                        element={
                            <SettingsPage
                                settings={settings}
                                onUpdateSettings={handleUpdateSettings}
                                onNavigate={(page) => navigate(`/${page}`)}
                            />
                        }
                    />
                    <Route
                        path="/trash"
                        element={
                            <TrashPage
                                projects={projects}
                                tasks={tasks}
                                onRestoreProject={handleRestoreProject}
                                onPermanentlyDeleteProject={handlePermanentlyDeleteProject}
                                onRestoreTask={handleRestoreTask}
                                onPermanentlyDeleteTask={handlePermanentlyDeleteTask}
                            />
                        }
                    />
                    <Route
                        path="/projects"
                        element={
                            <AllProjectsPage
                                user={user!}
                                projects={projects}
                                onSelectProject={handleSelectProject}
                            />
                        }
                    />
                    <Route
                        path="/discover"
                        element={<ProjectDiscovery />}
                    />
                    <Route
                        path="/member-requests"
                        element={
                            <MemberRequestsPage
                                joinRequests={joinRequests}
                                onApproveJoinRequest={handleApproveJoinRequest}
                                onRejectJoinRequest={handleRejectJoinRequest}
                            />
                        }
                    />
                    <Route path="/project/:projectId" element={<ProjectPageWrapper />} />
                </Routes>
            </MainLayout>
            <ChatAssistant project={projects.find((p) => p.id === selectedProjectId)} />
        </ProtectedRoute>
    );
}
