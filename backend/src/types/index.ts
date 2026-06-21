// =====================================================
// BACKEND SHARED TYPES
// =====================================================
// Common types used throughout the backend.
// Frontend has its own types; if sharing is needed,
// extract to a shared package (@planora/types).
// =====================================================

// --- User ---

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

// --- Project ---

export type ProjectTemplate = 'kanban' | 'scrum';
export type MemberRole = 'manager' | 'member';

export interface ProjectMember {
  userId: string;
  role: MemberRole;
  name: string;
  email: string;
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  deadline: string;
  ownerId: string;
  createdAt: string;
  template: ProjectTemplate;
  members: ProjectMember[];
  deletedAt?: string | null;
  key?: string | null;
}

// --- Task ---

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'user-story' | 'bug' | 'epic';

export interface Comment {
  id: string;
  taskId: string;
  content: string;
  authorId: string;
  userName?: string;
  userAvatar?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  url: string;
  type: string;
  fileSize?: number;
  uploadedBy: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type?: TaskType;
  dueDate?: string | null;
  parentTaskId?: string | null;
  sprintId?: string | null;
  projectId: string;
  createdBy: string;
  assignees: string[];
  comments: Comment[];
  attachments: Attachment[];
  labels?: string[];
  timeEstimate?: number | null;
  timeSpent?: number | null;
  storyPoints?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// --- Sprint ---

export type SprintStatus = 'active' | 'completed';

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  projectId: string;
  startDate: string;
  endDate?: string | null;
  status: SprintStatus;
  createdAt: string;
  updatedAt: string;
}

// --- Notification ---

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'member_added'
  | 'project_update'
  | 'task_mentioned'
  | 'project_invite'
  | 'invitation_rejected'
  | 'join_request_sent';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

// --- Invitation ---

export type InvitationStatus = 'pending' | 'accepted' | 'rejected';
export type RequestType = 'invitation' | 'request';

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  email: string;
  invitedBy?: string | null;
  inviterName?: string;
  inviterEmail?: string;
  requestType: RequestType;
  status: InvitationStatus;
  createdAt: string;
}

// --- Activity Log ---

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  userName?: string;
  userEmail?: string;
  projectId: string | null;
  taskId?: string | null;
  taskTitle?: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

// --- Admin / Stats ---

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalProjects: number;
  totalTasks: number;
}

export interface TaskStatusStats {
  status: string;
  count: number;
}

export interface MonthlyStats {
  month: string;
  projects: number;
  users: number;
}

export interface DetailedStats {
  tasksByStatus: TaskStatusStats[];
  monthlyData: MonthlyStats[];
  usersByRole: { role: string; count: number }[];
  totalStats: {
    totalUsers: number;
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
  };
}

// --- Generic Result ---

export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface TaskProposal { id: string; taskId: string; changes: Partial<Task>; reason?: string; proposedBy: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string; }

export interface TaskProposal { id: string; taskId: string; changes: Partial<Task>; reason?: string; proposedBy: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string; }
