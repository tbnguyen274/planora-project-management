"use client"

import { useState, useEffect } from "react"
import { FolderKanban, Trash2, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase-client';
import { getAllProjects, deleteProject, type AdminProject } from '@backend/services/adminService'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AdminLayout } from "../layout/AdminLayout"

interface ProjectManagementProps {
    adminEmail?: string
    onNavigate: (page: 'dashboard' | 'users' | 'roles' | 'projects') => void
    onLogout?: () => void
}

export function ProjectManagement({ adminEmail, onNavigate, onLogout }: ProjectManagementProps) {
    // Data states
    const [projects, setProjects] = useState<AdminProject[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [projectToDelete, setProjectToDelete] = useState<AdminProject | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Fetch projects
    useEffect(() => {
        async function fetchProjects() {
            try {
                setLoading(true)
                const data = await getAllProjects(supabase as any)
                setProjects(data)
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
                toast.error(message)
            } finally {
                setLoading(false)
            }
        }
        fetchProjects()
    }, [])

    // Filter projects by search
    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Handle delete project
    const handleDeleteProject = async () => {
        if (!projectToDelete) return

        setIsDeleting(true)
        try {
            await deleteProject(supabase as any, projectToDelete.id)
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id))
            toast.success(`Đã xóa dự án "${projectToDelete.name}"`)
            setDeleteDialogOpen(false)
            setProjectToDelete(null)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể xóa dự án'
            toast.error(message)
        } finally {
            setIsDeleting(false)
        }
    }

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN')
    }

    return (
        <AdminLayout
            adminEmail={adminEmail}
            onNavigate={onNavigate}
            onLogout={onLogout}
            pageTitle="Quản lý dự án"
        >
            <div className="container mx-auto px-4 lg:px-6 py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-orange-700">Tổng dự án</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-700">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : projects.length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-blue-700">Tổng thành viên</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : projects.reduce((acc, p) => acc + p.member_count, 0)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-green-700">Tổng công việc</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : projects.reduce((acc, p) => acc + p.task_count, 0)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Table */}
                <Card className="border shadow-md">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-900">Danh sách dự án</CardTitle>
                                <CardDescription>Quản lý và xem thông tin chi tiết các dự án</CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Tìm kiếm dự án..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[250px]">Tên dự án</TableHead>
                                    <TableHead>Chủ sở hữu</TableHead>
                                    <TableHead className="text-center">Thành viên</TableHead>
                                    <TableHead className="text-center">Công việc</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                            <p className="text-muted-foreground mt-2">Đang tải...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredProjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? 'Không tìm thấy dự án phù hợp' : 'Chưa có dự án nào'}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredProjects.map((project) => (
                                    <TableRow key={project.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{project.name}</div>
                                                {project.description && (
                                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        {project.description}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-7 w-7">
                                                    <AvatarFallback className="text-xs">
                                                        {project.owner_name?.charAt(0) || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-medium">{project.owner_name || 'Unknown'}</div>
                                                    <div className="text-xs text-muted-foreground">{project.owner_email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{project.member_count}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">{project.task_count}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(project.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => {
                                                    setProjectToDelete(project)
                                                    setDeleteDialogOpen(true)
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa dự án</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa dự án <strong>"{projectToDelete?.name}"</strong>?
                            Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteProject}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Xóa dự án
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    )
}
