"use client"

import { useState, useEffect } from "react"
import { Users, KeyRound, Loader2, UserPlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase-client';
import { getAllUsers, resetUserPassword, updateUserStatus, type AdminUser } from '@backend/services/adminService'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AdminLayout } from "../layout/AdminLayout"

interface AdminDashboardProps {
  adminEmail?: string
  onNavigate: (page: 'dashboard' | 'users' | 'roles' | 'projects') => void
  onLogout?: () => void
}

export function AdminDashboard({ adminEmail, onNavigate, onLogout }: AdminDashboardProps) {
  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  // Real data states
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch users from Supabase
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        setError(null)
        const data = await getAllUsers(supabase as any)
        setUsers(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return

    setIsResetting(true)
    try {
      await resetUserPassword(supabase as any, resetPasswordUser.email)
      toast.success(`Đã gửi email đặt lại mật khẩu đến ${resetPasswordUser.email}`)
      setResetPasswordUser(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể gửi email'
      toast.error(message)
    } finally {
      setIsResetting(false)
    }
  }

  const handleToggleUserStatus = async (user: AdminUser) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    try {
      await updateUserStatus(supabase as any, user.id, newStatus)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
      toast.success(`Đã ${newStatus === 'active' ? 'kích hoạt' : 'khóa'} tài khoản ${user.name}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái'
      toast.error(message)
    }
  }

  // Helper to format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN')
  }

  // Helper to get role display info
  const getRoleDisplay = (role: string) => {
    return role === 'admin'
      ? { label: 'Quản trị viên', variant: 'default' as const }
      : { label: 'Người dùng', variant: 'secondary' as const }
  }

  return (
    <AdminLayout
      adminEmail={adminEmail}
      onNavigate={onNavigate}
      onLogout={onLogout}
      pageTitle="Quản lý người dùng"
    >
      <div className="container mx-auto px-4 lg:px-6 py-6">
        {/* Users Table */}
        <Card className="border shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">Danh sách người dùng</CardTitle>
                <CardDescription className="text-sm mt-0.5">Quản lý thông tin và quyền truy cập</CardDescription>
              </div>
              <Button className="gap-2 h-9 text-sm shadow-md">
                <UserPlus className="h-4 w-4" />
                Thêm người dùng mới
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px] min-w-[200px]">Họ và tên</TableHead>
                    <TableHead className="min-w-[120px]">Vai trò</TableHead>
                    <TableHead className="min-w-[110px]">Ngày tham gia</TableHead>
                    <TableHead className="min-w-[110px]">Trạng thái</TableHead>
                    <TableHead className="text-right min-w-[130px]">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        <p className="text-muted-foreground mt-2">Đang tải...</p>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-destructive">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Chưa có người dùng nào
                      </TableCell>
                    </TableRow>
                  ) : users.map((user) => {
                    const roleDisplay = getRoleDisplay(user.role)
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name} />
                              <AvatarFallback className="text-[11px]">{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground text-xs">{user.name}</div>
                              <div className="text-[11px] text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleDisplay.variant}>
                            {roleDisplay.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.status === "active" ? "default" : "destructive"}
                            className={user.status === "active" ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            {user.status === "active" ? "Hoạt động" : "Bị khóa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Đặt lại mật khẩu"
                              onClick={() => setResetPasswordUser({ id: user.id, name: user.name, email: user.email })}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title={user.status === 'active' ? 'Khóa tài khoản' : 'Kích hoạt tài khoản'}
                              onClick={() => handleToggleUserStatus(user)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Confirmation Modal */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent className="bg-white dark:bg-gray-800 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Bạn có chắc muốn đặt lại mật khẩu?
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Một mật khẩu mới sẽ được tạo và gửi đến email của người dùng này.
            </DialogDescription>
          </DialogHeader>
          {resetPasswordUser && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{resetPasswordUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{resetPasswordUser.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{resetPasswordUser.email}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setResetPasswordUser(null)}
            >
              Hủy
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting}>
              {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}