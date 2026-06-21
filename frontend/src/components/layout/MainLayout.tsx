"use client"

import { type ReactNode, useState, useRef, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { LayoutDashboard, FolderKanban, User, LogOut, Plus, ChevronDown, Menu, X, Settings, Bell, Trash2, Globe, Users, ShieldCheck, Sparkles } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Alert, AlertDescription } from "../ui/alert"
import type { User as UserType, Project, Notification, ProjectInvitation, JoinRequest } from "../../types"
import { SettingsModal } from "../settings/SettingsModal"
import { NotificationList } from "../notifications/NotificationList"
import { NotificationListContainer } from "../notifications/NotificationListContainer"
import { supabase } from "@/lib/supabase-client"
import { useNotifications } from "@/hooks/useNotifications"
import { useNotificationContext } from "../notifications/NotificationContext"

interface MainLayoutProps {
  user: UserType
  projects: Project[]
  selectedProjectId: string | null
  settings: any
  notifications: Notification[]
  invitations: ProjectInvitation[]
  joinRequests?: JoinRequest[]
  onAddNotification: (type: any, title: string, content: string, entityType?: string, entityId?: string) => Promise<boolean>
  onSendInvitation: (projectId: string, email: string) => Promise<boolean>
  onAcceptInvitation: (invitationId: string) => void
  onRejectInvitation?: (invitationId: string) => void
  onCreateJoinRequest?: (projectId: string) => void
  onApproveJoinRequest?: (requestId: string) => void
  onRejectJoinRequest?: (requestId: string) => void
  onSelectProject: (projectId: string) => void
  onLogout: () => void
  onUpdateSettings: (settings: any) => void
  onMarkNotificationAsRead: (notificationId: string) => void
  onMarkAllNotificationsAsRead: () => void
  onDeleteNotification: (notificationId: string) => void
  onRestoreProject: (projectId: string) => void
  onPermanentlyDeleteProject: (projectId: string) => void
  onRestoreTask: (taskId: string) => void
  onPermanentlyDeleteTask: (taskId: string) => void
  onEnterAdmin?: (email: string, password: string) => void
  children: ReactNode
}

export function MainLayout({
  user,
  projects,
  selectedProjectId,
  settings,
  notifications,
  onSelectProject,
  onLogout,
  onUpdateSettings,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onDeleteNotification,
  children,
}: MainLayoutProps) {
  const { unreadCount } = useNotificationContext();
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false)
  const [isEstimatingDeadline, setIsEstimatingDeadline] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    deadline: "",
    template: "kanban" as "kanban" | "scrum",
  })
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Listen for project created events and navigate to project page
  useEffect(() => {
    const handleProjectCreated = (e: CustomEvent<{ projectId: string }>) => {
      navigate(`/project/${e.detail.projectId}`)
    }
    window.addEventListener('projectCreated', handleProjectCreated as EventListener)
    return () => {
      window.removeEventListener('projectCreated', handleProjectCreated as EventListener)
    }
  }, [navigate])

  const templateDescriptions = {
    kanban: "Quản lý công việc trực quan với bảng Kanban. Tốt để theo dõi tiến độ một cách linh hoạt.",
    scrum: "Tiếp cận Agile với Sprint. Lý tưởng cho các dự án lặp lại với những khúc nước ngắn.",
  }


  const handleCreateProject = () => {
    if (newProject.name && newProject.deadline) {
      window.dispatchEvent(new CustomEvent("createProject", { detail: newProject }))
      setIsCreateDialogOpen(false)
      setNewProject({
        name: "",
        description: "",
        deadline: "",
        template: "kanban",
      })
    }
  }

  const handleEnhanceProjectDescription = async () => {
    if (!newProject.description.trim()) return
    setIsEnhancingDescription(true)
    try {
      const { enhanceDescription } = await import('../../lib/aiService')
      const enhanced = await enhanceDescription(newProject.description)
      setNewProject({ ...newProject, description: enhanced })
    } catch (error) {
      console.error('AI enhance error:', error)
    } finally {
      setIsEnhancingDescription(false)
    }
  }

  const handleEstimateProjectDeadline = async () => {
    if (!newProject.name.trim() && !newProject.description.trim()) return
    setIsEstimatingDeadline(true)
    try {
      const { estimateTime } = await import('../../lib/aiService')
      const days = await estimateTime(newProject.name, newProject.description)
      const suggestedDeadline = new Date()
      suggestedDeadline.setDate(suggestedDeadline.getDate() + days)
      setNewProject({
        ...newProject,
        deadline: suggestedDeadline.toISOString().split('T')[0],
      })
    } catch (error) {
      console.error('AI estimate error:', error)
    } finally {
      setIsEstimatingDeadline(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const activeProjects = projects.filter((p) => !p.deletedAt)
  const deletedItemsCount = projects.filter((p) => p.deletedAt).length

  return (
    <div className={`min-h-screen ${settings.theme === "dark" ? "dark bg-slate-950" : "bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50"} flex`}>
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${settings.theme === "dark" ? "bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800" : "bg-white border-gray-200 shadow-xl"} border-r transition-transform duration-300 ease-in-out overflow-hidden flex flex-col fixed left-0 top-0 bottom-0 z-40 w-64`}
      >
        {/* Sticky header */}
        <div
          className={`px-4 h-[52px] ${settings.theme === "dark" ? "border-slate-800" : "border-gray-200"} border-b sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-10 shadow-md flex items-center`}
        >
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg shadow-md overflow-hidden">
              <img src="/logo.png" alt="Planora" className="w-9 h-9 object-cover" />
            </div>
            <div>
              <span className="text-xl font-bold text-white drop-shadow-md">
                Planora
              </span>
              <p className="text-xs text-blue-100 font-medium">Project Management</p>
            </div>
          </div>
        </div>

        {/* Scrollable projects section */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="space-y-1.5">
            <Button
              variant={currentPath === "/dashboard" ? "default" : "ghost"}
              className={`w-full justify-start h-9 text-sm font-semibold ${currentPath === "/dashboard"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "hover:bg-blue-50"
                }`}
              onClick={() => navigate("/dashboard")}
            >
              <LayoutDashboard className="w-4 h-4 mr-2.5" />
              Tổng quan
            </Button>

            <Button
              variant={currentPath === "/discover" ? "default" : "ghost"}
              className={`w-full justify-start h-9 text-sm font-semibold ${currentPath === "/discover"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "hover:bg-blue-50"
                }`}
              onClick={() => navigate("/discover")}
            >
              <Globe className="w-4 h-4 mr-2.5" />
              Khám phá dự án
            </Button>

            <Button
              variant={currentPath === "/member-requests" ? "default" : "ghost"}
              className={`w-full justify-start h-9 text-sm font-semibold ${currentPath === "/member-requests"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "hover:bg-blue-50"
                }`}
              onClick={() => navigate("/member-requests")}
            >
              <Users className="w-4 h-4 mr-2.5" />
              Yêu cầu tham gia
            </Button>
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className={`text-xs font-semibold uppercase tracking-wide ${settings.theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Dự án của bạn</span>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-blue-100 rounded-full">
                    <Plus className="w-4 h-4 text-blue-600" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md !bg-white dark:!bg-gray-900" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                  <DialogHeader>
                    <DialogTitle className="text-black dark:text-white">Tạo dự án mới</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">Nhập thông tin để tạo dự án mới</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectName" className="text-black dark:text-gray-200">Tên dự án *</Label>
                      <Input
                        id="projectName"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                        placeholder="Nhập tên dự án"
                        className="bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="description" className="text-black dark:text-gray-200">Mô tả</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEnhanceProjectDescription}
                          disabled={isEnhancingDescription || !newProject.description}
                          className="gap-1.5 h-7 text-xs"
                        >
                          <Sparkles className="w-3 h-3" />
                          {isEnhancingDescription ? 'Đang xử lý...' : 'AI Cải thiện'}
                        </Button>
                      </div>
                      <Textarea
                        id="description"
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        placeholder="Mô tả ngắn về dự án"
                        rows={4}
                        className="bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600 max-h-40 overflow-y-auto resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="deadline" className="text-black dark:text-gray-200">Deadline *</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEstimateProjectDeadline}
                          disabled={isEstimatingDeadline || (!newProject.name && !newProject.description)}
                          className="gap-1.5 h-7 text-xs"
                        >
                          <Sparkles className="w-3 h-3" />
                          {isEstimatingDeadline ? 'Đang ước tính...' : 'AI Ước tính'}
                        </Button>
                      </div>
                      <Input
                        id="deadline"
                        type="date"
                        value={newProject.deadline}
                        onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                        className="bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template" className="text-black dark:text-gray-200">Template</Label>
                      <Select
                        value={newProject.template}
                        onValueChange={(value: string) =>
                          setNewProject({ ...newProject, template: value as "kanban" | "scrum" })
                        }
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kanban">Kanban</SelectItem>
                          <SelectItem value="scrum">Scrum</SelectItem>
                        </SelectContent>
                      </Select>
                      <Alert className="mt-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                        <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                          {templateDescriptions[newProject.template]}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Hủy
                    </Button>
                    <Button onClick={handleCreateProject}>Tạo dự án</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-1">
              {activeProjects.length === 0 ? (
                <div
                  className={`text-xs px-3 py-6 text-center rounded-lg border-2 border-dashed ${settings.theme === "dark" ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-200"}`}
                >
                  <FolderKanban className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">Chưa có dự án nào</p>
                </div>
              ) : (
                activeProjects.map((project) => (
                  <Button
                    key={project.id}
                    variant={selectedProjectId === project.id ? "default" : "ghost"}
                    className={`w-full justify-start text-sm h-9 ${selectedProjectId === project.id
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : "hover:bg-blue-50"
                      }`}
                    onClick={() => onSelectProject(project.id)}
                  >
                    <FolderKanban className="w-4 h-4 mr-2.5 flex-shrink-0" />
                    <span className="truncate font-medium">{project.name}</span>
                  </Button>
                ))
              )}
            </div>
          </div>
        </nav>

        {/* Sticky bottom sections */}
        <div
          className={`${settings.theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"} border-t space-y-1.5 p-4 sticky bottom-14 z-10`}
        >
          <Button
            variant={currentPath === "/trash" ? "default" : "ghost"}
            className={`w-full justify-start text-sm h-9 ${currentPath === "/trash"
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md"
              : "hover:bg-red-50 text-gray-700"
              }`}
            onClick={() => navigate("/trash")}
          >
            <Trash2 className="w-4 h-4 mr-2.5" />
            <span className="flex-1 text-left font-medium">Thùng rác</span>
            {deletedItemsCount > 0 && (
              <span className="text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-sm">
                {deletedItemsCount}
              </span>
            )}
          </Button>
        </div>

        {/* Sticky account section */}
        <div
          className={`p-4 ${settings.theme === "dark" ? "border-slate-800 bg-gradient-to-r from-slate-800 to-slate-900" : "border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50"} border-t sticky bottom-0 z-10 shadow-md`}
        >
          <DropdownMenu open={isAccountOpen} onOpenChange={setIsAccountOpen}>
            <DropdownMenuTrigger asChild>
              <button className="w-full text-left hover:bg-white/70 hover:shadow-md transition-all h-12 px-2.5 cursor-pointer rounded-md flex items-center">
                <Avatar className="w-8 h-8 mr-2.5 ring-2 ring-blue-500 ring-offset-1">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="text-sm font-semibold truncate">{user.name}</div>
                  <div className={`text-xs ${settings.theme === "dark" ? "text-gray-400" : "text-gray-600"} truncate`}>
                    {user.email}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Thông tin cá nhân
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSettingsModalOpen(true)} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
        {/* Sticky Top Bar */}
        <header
          className={`${settings.theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white/80 backdrop-blur-lg border-gray-200"} border-b px-4 h-[52px] flex items-center gap-4 sticky top-0 z-30 shadow-sm`}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hover:bg-blue-50 rounded-lg p-1.5"
            title={isSidebarOpen ? "Đóng sidebar" : "Mở sidebar"}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1">
            {currentPath === "/dashboard" && (
              <h2 className="text-lg font-bold text-gray-800">Bảng điều khiển</h2>
            )}
            {currentPath === "/discover" && (
              <h2 className="text-lg font-bold text-gray-800">Khám phá dự án</h2>
            )}
            {currentPath.startsWith("/project/") && selectedProjectId && (
              <h2 className="text-lg font-bold text-gray-800">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </h2>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsModalOpen(true)}
            title="Cài đặt"
            className="hover:bg-blue-50 rounded-lg p-1.5"
          >
            <Settings className="w-4 h-4" />
          </Button>

          <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <button className="relative hover:bg-blue-50 rounded-lg p-1.5 cursor-pointer transition-colors" title="Thông báo">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
              <NotificationListContainer theme={settings.theme} />
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border-red-200 font-medium px-3 h-8 text-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </Button>
        </header>

        <main className={`flex-1 overflow-auto ${settings.theme === "dark" ? "bg-slate-950" : "bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50"}`}>
          {children}
        </main>
      </div>

      <SettingsModal
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
    </div>
  )
}
