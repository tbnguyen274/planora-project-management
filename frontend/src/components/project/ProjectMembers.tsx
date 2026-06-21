"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { UserPlus, Trash2, Crown, Loader2, AlertCircle } from 'lucide-react'
import { toast } from "sonner"
import type { User, Project } from "../../types"
import { getSupabaseClient } from "../../lib/supabase-client"

const supabase = getSupabaseClient()

interface ProjectMembersProps {
  user: User
  project: Project
  isManager: boolean
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void
  onSendInvitation: (projectId: string, email: string) => Promise<boolean>
}

export function ProjectMembers({ user, project, isManager, onUpdateProject, onSendInvitation }: ProjectMembersProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [emailToAdd, setEmailToAdd] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAddMember = async () => {
    if (!emailToAdd.trim()) {
      toast.error("Vui lòng nhập email")
      return
    }

    // Không thể mời chính mình
    if (emailToAdd.trim().toLowerCase() === user.email.toLowerCase()) {
      toast.error("Bạn đã là thành viên của dự án")
      return
    }

    setIsLoading(true)

    try {
      // 1. Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailToAdd.trim())) {
        toast.error("Email không hợp lệ")
        setIsLoading(false)
        return
      }

      // 2. Send invitation using useProjects hook (will check if user exists)
      const result = await onSendInvitation(project.id, emailToAdd.trim())

      if (!result) {
        toast.error("Không thể gửi lời mời", { description: "Lỗi nội bộ." })
        setIsLoading(false)
        return
      }

      // 3. Success toast is shown by handleSendInvitation
      // Members will be updated when invitation is accepted
      setEmailToAdd("")
      setIsAddDialogOpen(false)
    } catch (err: any) {
      console.error("Error adding member:", err)
      toast.error("Có lỗi xảy ra: " + (err.message || "Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (userId === project.ownerId) {
      toast.error("Không thể xóa chủ sở hữu dự án!")
      return
    }

    if (!confirm("Bạn có chắc muốn xóa thành viên này?")) {
      return
    }

    try {
      // Xóa khỏi database
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', project.id)
        .eq('user_id', userId)

      if (error) throw error

      // Update UI
      const updatedMembers = project.members.filter((m) => m.userId !== userId)
      onUpdateProject(project.id, { members: updatedMembers })
      toast.success("Đã xóa thành viên!")
    } catch (err: any) {
      console.error("Error removing member:", err)
      toast.error("Không thể xóa thành viên: " + err.message)
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="shadow-md border-2 border-blue-100 hover:shadow-xl transition-shadow">
        <CardHeader className="border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Thành viên dự án</CardTitle>
                <CardDescription className="text-sm mt-0.5 text-gray-600">Quản lý người tham gia vào dự án</CardDescription>
              </div>
            </div>
            {isManager && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                    <UserPlus className="w-4 h-4" />
                    Thêm thành viên
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm thành viên mới</DialogTitle>
                    <DialogDescription>Nhập email để mời người dùng vào dự án</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={emailToAdd}
                        onChange={(e) => setEmailToAdd(e.target.value)}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500">
                        Nhập email của người dùng đã đăng ký trong hệ thống
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isLoading}
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={handleAddMember}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        "Thêm"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2.5">
            {project.members.map((member) => {
              const isOwner = member.userId === project.ownerId
              const isCurrentUser = member.userId === user.id

              return (
                <div key={member.userId} className="flex items-center justify-between p-3 bg-gradient-to-r from-white to-blue-50 rounded-lg border-2 border-blue-100 hover:shadow-md transition-all hover:border-blue-200">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-blue-200">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">{member.name}</span>
                        {isOwner && (
                          <span title="Project Manager">
                            <Crown className="w-4 h-4 text-yellow-500" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-600">{member.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={isOwner ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-0.5" : "bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5"}>
                      {isOwner ? "Project Manager" : "Team Member"}
                    </Badge>
                    {isManager && !isOwner && !isCurrentUser && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.userId)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {project.members.length === 1 && (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3">
                <UserPlus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Chỉ có bạn trong dự án này</p>
              <p className="text-xs mt-1 text-gray-500">Thêm thành viên để cộng tác hiệu quả hơn</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md border-2 border-purple-100">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b border-purple-100 py-3">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-purple-600" />
            Hướng dẫn quyền hạn
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 p-4">
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 p-2.5 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="p-1.5 bg-yellow-100 rounded-lg">
                <Crown className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold text-xs text-gray-900">Project Manager</p>
                <p className="text-xs text-gray-600 mt-0.5">Có thể tạo/sửa/xóa nhiệm vụ, quản lý thành viên, xóa dự án</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <UserPlus className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-xs text-gray-900">Team Member</p>
                <p className="text-xs text-gray-600 mt-0.5">Có thể tạo/sửa nhiệm vụ, xem dự án</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}