"use client"

import { useState, useEffect } from "react"
import { Users, Shield, Loader2, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase-client';
import { getAllUsers, updateUserRole, type AdminUser } from '@backend/services/adminService'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminLayout } from "../layout/AdminLayout"

interface RoleManagementProps {
  adminEmail?: string
  onNavigate: (page: 'dashboard' | 'users' | 'roles' | 'projects') => void
  onLogout?: () => void
}

export function RoleManagement({ adminEmail, onNavigate, onLogout }: RoleManagementProps) {
  // Real data states
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  // Fetch users from Supabase
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        const data = await getAllUsers(supabase as any)
        setUsers(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    setUpdatingUserId(userId)
    try {
      await updateUserRole(supabase as any, userId, newRole)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success(`Đã cập nhật vai trò thành ${newRole === 'admin' ? 'Quản trị viên' : 'Người dùng'}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật vai trò'
      toast.error(message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <AdminLayout
      adminEmail={adminEmail}
      onNavigate={onNavigate}
      onLogout={onLogout}
      pageTitle="Quản lý vai trò"
    >
      <div className="container mx-auto px-4 lg:px-6 py-6">
        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-700 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Quản trị viên
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : users.filter(u => u.role === 'admin').length}
              </div>
              <p className="text-xs text-gray-600 mt-1">Có toàn quyền quản lý hệ thống</p>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Người dùng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : users.filter(u => u.role === 'user').length}
              </div>
              <p className="text-xs text-gray-600 mt-1">Sử dụng các tính năng cơ bản</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table with Role Management */}
        <Card className="border shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-600" />
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">Phân quyền người dùng</CardTitle>
                <CardDescription className="text-sm">Chọn vai trò cho từng người dùng</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Người dùng</TableHead>
                  <TableHead className="w-[150px]">Trạng thái</TableHead>
                  <TableHead className="w-[200px]">Vai trò</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      <p className="text-muted-foreground mt-2">Đang tải...</p>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Chưa có người dùng nào
                    </TableCell>
                  </TableRow>
                ) : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === 'active' ? 'default' : 'destructive'}
                        className={user.status === 'active' ? 'bg-green-500' : ''}
                      >
                        {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value: 'user' | 'admin') => handleRoleChange(user.id, value)}
                        disabled={updatingUserId === user.id}
                      >
                        <SelectTrigger className="w-[160px]">
                          {updatingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-purple-600" />
                              Quản trị viên
                            </div>
                          </SelectItem>
                          <SelectItem value="user">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-600" />
                              Người dùng
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}