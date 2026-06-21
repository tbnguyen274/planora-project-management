"use client"

import { Badge } from "../ui/badge"
import { Clock, MessageSquare, Paperclip, CheckSquare, ChevronRight, FileText, Layers } from "lucide-react"
import { Button } from "../ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import type { Project, Task, User } from "../../types"
import { canEditTask } from "../../utils/permissions"

interface TaskCardProps {
  task: Task
  project: Project
  allTasks: Task[]
  user?: User
  onClick: () => void
  showStoryPoints?: boolean
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void
}

export function TaskCard({ task, project, allTasks, user, onClick, showStoryPoints, onUpdateTask }: TaskCardProps) {
  const canEdit = user ? canEditTask(user.id, task, project) : true
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "Khẩn cấp"
      case "high":
        return "Cao"
      case "medium":
        return "Trung bình"
      case "low":
        return "Thấp"
      default:
        return priority
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "backlog":
        return "Backlog"
      case "todo":
        return "Cần làm"
      case "in-progress":
        return "Đang làm"
      case "done":
        return "Hoàn thành"
      default:
        return status
    }
  }

  const subtasks = allTasks.filter((t) => t.parentTaskId === task.id)
  const completedSubtasks = subtasks.filter((t) => t.status === "done").length

  const assigneeNames = task.assignees.map((userId) => {
    const member = project.members.find((m) => m.userId === userId)
    return member?.name || "Unknown"
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    })
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done"

  const handleStatusChange = (newStatus: Task["status"]) => {
    if (onUpdateTask) {
      onUpdateTask(task.id, { status: newStatus })
    }
  }

  const isUserStory = task.type === 'user-story' || (!task.type && !task.parentTaskId);
  const isStandaloneTask = task.type === 'task' && !task.parentTaskId;

  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer group hover:border-blue-300 ${isStandaloneTask ? 'border-l-4 border-l-orange-400' : ''}`} onClick={onClick}>
      {/* Type indicator */}
      <div className="flex items-center gap-2 mb-2">
        {isUserStory && (
          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border-purple-200">
            <FileText className="w-3 h-3 mr-1" />
            User Story
          </Badge>
        )}
        {isStandaloneTask && (
          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-200">
            <Layers className="w-3 h-3 mr-1" />
            Task
          </Badge>
        )}
      </div>

      {/* Header với priority và title */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getPriorityColor(task.priority)}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium mb-1.5 break-words leading-relaxed group-hover:text-blue-600 transition-colors">
            {task.title}
          </h4>
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {task.labels.map((label, idx) => (
                <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5">
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed px-1">
          {task.description}
        </p>
      )}

      {/* Badges và metadata */}
      <div className="flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs px-2.5 py-0.5">
            {getPriorityLabel(task.priority)}
          </Badge>
          {showStoryPoints && task.storyPoints && (
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
              {task.storyPoints} pts
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-gray-500">
          {subtasks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="font-medium">
                {completedSubtasks}/{subtasks.length}
              </span>
            </div>
          )}
          {task.comments.length > 0 && (
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-medium">{task.comments.length}</span>
            </div>
          )}
          {task.attachments.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="font-medium">{task.attachments.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer với assignees và deadline */}
      <div className="flex items-center justify-between pt-3 border-t gap-3">
        <span className="text-gray-600 truncate text-xs flex-1 min-w-0 font-medium">
          {assigneeNames.length > 0 ? assigneeNames.join(", ") : "Chưa phân công"}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.dueDate && (
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${isOverdue ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"}`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">{formatDate(task.dueDate)}</span>
            </div>
          )}
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 hover:bg-gray-100" title="Cập nhật trạng thái">
                  <span className="text-xs font-medium">{getStatusLabel(task.status)}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => handleStatusChange("backlog")}>Backlog</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("todo")}>Cần làm</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("in-progress")}>Đang làm</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("done")}>Hoàn thành</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-xs font-medium text-gray-500 px-2">{getStatusLabel(task.status)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
