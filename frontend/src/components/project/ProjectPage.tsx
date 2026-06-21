"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Badge } from "../ui/badge"
import { Settings, Users, AlertCircle, Clock, CheckSquare, BarChart2, History } from 'lucide-react'
import { KanbanView } from "./KanbanView"
import { ScrumView } from "./ScrumView"
import { ProjectSettings } from "./ProjectSettings"
import { ProjectMembers } from "./ProjectMembers"
import { Alert, AlertDescription } from "../ui/alert"
import { ProjectCharts } from "./ProjectCharts"
import { ActivityTimeline } from "./ActivityTimeline"
import type { User, Project, Task, Sprint } from "../../types"

interface ProjectPageProps {
  user: User
  project: Project
  tasks: Task[]
  sprints?: Sprint[]
  currentSprint?: Sprint
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void
  onDeleteProject: (projectId: string) => void
  onMoveToTrash?: (projectId: string) => void
  onSendInvitation: (projectId: string, email: string) => Promise<boolean>
  onCreateTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments" | "attachments">) => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void
  onDeleteTask: (taskId: string) => void
  onAddComment: (taskId: string, content: string) => void
  onAddAttachment: (taskId: string, file: { name: string; url: string; type: string }) => void
  onDeleteAttachment: (attachmentId: string) => void
  onUploadFile?: (taskId: string, file: File) => Promise<{ success: boolean }>
  onCreateSprint?: (projectId: string, name: string, goal: string, taskIds: string[]) => void
  onEndSprint?: (sprintId: string) => void
}

export function ProjectPage({
  user,
  project,
  tasks,
  sprints,
  currentSprint,
  onUpdateProject,
  onDeleteProject,
  onMoveToTrash,
  onSendInvitation,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onAddComment,
  onAddAttachment,
  onDeleteAttachment,
  onUploadFile,
  onCreateSprint,
  onEndSprint,
}: ProjectPageProps) {
  const [activeTab, setActiveTab] = useState("board")

  const userMember = project.members.find((m) => m.userId === user.id)
  const isManager = userMember?.role === "manager"
  const isMember = userMember?.role === "member"

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Project Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white border-b shadow-md px-6 py-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white drop-shadow-md">
                {project.name}
              </h1>
            </div>
            {project.description && (
              <p className="text-sm text-blue-50 max-w-4xl ml-9">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                <Clock className="w-4 h-4 text-white" />
                <div className="text-right">
                  <div className="text-xs text-blue-100">Deadline</div>
                  <div className="text-sm font-semibold text-white">
                    {new Date(project.deadline).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white text-blue-600 px-4 py-1.5 rounded-full font-semibold shadow-md text-sm">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {isManager ? "Quản lý dự án" : "Thành viên"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Warning for Members */}
      {isMember && (
        <Alert className="mx-6 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 shadow-sm">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 text-sm ml-2">
            Bạn có quyền hạn chế như thành viên. Liên hệ quản lý dự án để nhận quyền cao hơn.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="bg-white border-b shadow-sm px-6 py-1">
          <TabsList className="border-0 bg-transparent h-10">
            <TabsTrigger value="board" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm px-4 text-sm font-semibold">
              Bảng
            </TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm px-4 text-sm font-semibold">
              <Users className="w-4 h-4 mr-1.5" />
              Thành viên
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5">
                {project.members.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="charts" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm px-4 text-sm font-semibold">
              <BarChart2 className="w-4 h-4 mr-1.5" />
              Biểu đồ
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm px-4 text-sm font-semibold">
              <History className="w-4 h-4 mr-1.5" />
              Lịch sử
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="settings" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm px-4 text-sm font-semibold">
                <Settings className="w-4 h-4 mr-1.5" />
                Cài đặt
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="board" className="m-0 h-full">
            {project.template === "kanban" ? (
              <KanbanView
                user={user}
                project={project}
                tasks={tasks}
                isManager={isManager}
                onCreateTask={onCreateTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onAddComment={onAddComment}
                onAddAttachment={onAddAttachment}
                onDeleteAttachment={onDeleteAttachment}
                onUploadFile={onUploadFile}
              />
            ) : (
              <ScrumView
                user={user}
                project={project}
                tasks={tasks}
                isManager={isManager}
                sprints={sprints}
                currentSprint={currentSprint}
                onCreateTask={onCreateTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onAddComment={onAddComment}
                onAddAttachment={onAddAttachment}
                onDeleteAttachment={onDeleteAttachment}
                onUploadFile={onUploadFile}
                onCreateSprint={onCreateSprint}
                onEndSprint={onEndSprint}
              />
            )}
          </TabsContent>

          <TabsContent value="members" className="m-0 p-0 flex-1 overflow-auto">
            <div className="p-6 lg:p-8 bg-gray-50 min-h-full">
              <ProjectMembers
                user={user}
                project={project}
                isManager={isManager}
                onUpdateProject={onUpdateProject}
                onSendInvitation={onSendInvitation}
              />
            </div>
          </TabsContent>

          <TabsContent value="charts" className="m-0 p-0 flex-1 overflow-auto">
            <div className="bg-gray-50 min-h-full">
              <ProjectCharts project={project} tasks={tasks} />
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0 p-0 flex-1 overflow-auto">
            <div className="bg-gray-50 min-h-full">
              <ActivityTimeline project={project} />
            </div>
          </TabsContent>

          {isManager && (
            <TabsContent value="settings" className="m-0 p-0 flex-1 overflow-auto">
              <div className="p-6 lg:p-8 bg-gray-50 min-h-full">
                <ProjectSettings project={project} onUpdateProject={onUpdateProject} onDeleteProject={onDeleteProject} onMoveToTrash={onMoveToTrash} />
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
