"use client"

import { useState, useEffect } from "react"
import { Users, Activity, Loader2, TrendingUp, CheckCircle2, Clock, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase-client';
import { getActivityLogs, getSystemStats, getDetailedStats, type ActivityLog, type SystemStats, type DetailedStats } from '@backend/services/adminService'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, Tooltip } from "recharts"
import { AdminLayout } from "../layout/AdminLayout"

interface DashboardProps {
    adminEmail?: string
    onNavigate: (page: 'dashboard' | 'users' | 'roles' | 'projects') => void
    onLogout?: () => void
}

const STATUS_COLORS: Record<string, string> = {
    'backlog': '#6366f1',
    'todo': '#94a3b8',
    'in_progress': '#3b82f6',
    'in-progress': '#3b82f6',
    'review': '#f59e0b',
    'done': '#22c55e',
    'completed': '#22c55e',
    'unknown': '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
    'backlog': 'Backlog',
    'todo': 'Chờ làm',
    'in_progress': 'Đang làm',
    'in-progress': 'Đang làm',
    'review': 'Review',
    'done': 'Hoàn thành',
    'completed': 'Hoàn thành',
    'unknown': 'Khác',
}

const ROLE_COLORS: Record<string, string> = {
    'admin': '#8b5cf6',
    'user': '#06b6d4',
}

export function Dashboard({ adminEmail, onNavigate, onLogout }: DashboardProps) {
    // Data states
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
    const [stats, setStats] = useState<SystemStats | null>(null)
    const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
    const [loading, setLoading] = useState(true)

    // Fetch all data
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true)
                const [logsData, statsData, detailedData] = await Promise.all([
                    getActivityLogs(supabase as any, 10),
                    getSystemStats(supabase as any),
                    getDetailedStats(supabase as any)
                ])
                setActivityLogs(logsData)
                setStats(statsData)
                setDetailedStats(detailedData)
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
                toast.error(message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Helper functions
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            'created': 'Tạo mới',
            'updated': 'Cập nhật',
            'deleted': 'Xóa',
            'moved': 'Di chuyển',
            'assigned': 'Giao nhiệm vụ',
            'login': 'Đăng nhập',
            'logout': 'Đăng xuất',
        }
        return labels[action.toLowerCase()] || action
    }

    // Define status order for proper sorting
    const STATUS_ORDER: Record<string, number> = {
        'backlog': 1,
        'todo': 2,
        'in_progress': 3,
        'in-progress': 3,
        'review': 4,
        'done': 5,
        'completed': 5,
    }

    // Prepare chart data - sorted by workflow order
    const taskStatusData = (detailedStats?.tasksByStatus.map(item => ({
        name: STATUS_LABELS[item.status] || item.status,
        value: item.count,
        fill: STATUS_COLORS[item.status] || '#6b7280',
        order: STATUS_ORDER[item.status] || 99,
    })) || []).sort((a, b) => a.order - b.order)

    const userRoleData = detailedStats?.usersByRole.map(item => ({
        name: item.role === 'admin' ? 'Quản trị viên' : 'Người dùng',
        value: item.count,
        fill: ROLE_COLORS[item.role] || '#6b7280',
    })) || []

    const monthlyData = detailedStats?.monthlyData || []

    const completionRate = detailedStats?.totalStats.totalTasks
        ? Math.round((detailedStats.totalStats.completedTasks / detailedStats.totalStats.totalTasks) * 100)
        : 0

    return (
        <AdminLayout
            adminEmail={adminEmail}
            onNavigate={onNavigate}
            onLogout={onLogout}
            pageTitle="Tổng quan hệ thống"
        >
            <div className="container mx-auto px-4 lg:px-6 py-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-600" />
                                        <CardTitle className="text-sm text-blue-700">Người dùng</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-700">{stats?.totalUsers || 0}</div>
                                    <p className="text-xs text-blue-600">{stats?.activeUsers || 0} đang hoạt động</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="w-4 h-4 text-orange-600" />
                                        <CardTitle className="text-sm text-orange-700">Dự án</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-orange-700">{stats?.totalProjects || 0}</div>
                                </CardContent>
                            </Card>

                            <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-purple-600" />
                                        <CardTitle className="text-sm text-purple-700">Tổng công việc</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-purple-700">{stats?.totalTasks || 0}</div>
                                </CardContent>
                            </Card>

                            <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-white">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <CardTitle className="text-sm text-green-700">Tỷ lệ hoàn thành</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-700">{completionRate}%</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Row 1 - Two charts side by side */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            {/* Tasks by Status - Bar Chart */}
                            <Card className="border shadow-sm">
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                                    <CardTitle className="text-base font-bold">Công việc theo trạng thái</CardTitle>
                                    <CardDescription>Phân bổ các công việc theo tình trạng hiện tại</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="h-[220px] flex items-center justify-center">
                                        {taskStatusData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={taskStatusData.length * 45 + 20}>
                                                <BarChart data={taskStatusData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                                    <XAxis type="number" />
                                                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" name="Số lượng" radius={[0, 4, 4, 0]} barSize={30}>
                                                        {taskStatusData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-gray-500">
                                                <div className="text-center">
                                                    <p className="text-sm">Chưa có dữ liệu công việc</p>
                                                    <p className="text-xs mt-1">Tổng số: {detailedStats?.totalStats.totalTasks || 0} tasks</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* User Roles - Pie Chart */}
                            <Card className="border shadow-sm">
                                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                                    <CardTitle className="text-base font-bold">Phân bổ vai trò người dùng</CardTitle>
                                    <CardDescription>Tỷ lệ Quản trị viên và Người dùng trong hệ thống</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="h-[220px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={userRoleData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                >
                                                    {userRoleData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Row 2 - Full width trend chart */}
                        <Card className="border shadow-sm mb-6">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    <div>
                                        <CardTitle className="text-base font-bold">Xu hướng tăng trưởng 6 tháng gần nhất</CardTitle>
                                        <CardDescription>Số lượng dự án và người dùng mới được tạo theo từng tháng</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={monthlyData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                            <Line
                                                type="monotone"
                                                dataKey="projects"
                                                name="Dự án mới"
                                                stroke="#f97316"
                                                strokeWidth={2}
                                                dot={{ fill: '#f97316', r: 4 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="users"
                                                name="Người dùng mới"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                dot={{ fill: '#3b82f6', r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Activity Logs */}
                        <Card className="border shadow-sm">
                            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-gray-600" />
                                    <CardTitle className="text-sm font-bold">Hoạt động gần đây</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-3 px-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Thời gian</TableHead>
                                            <TableHead>Người dùng</TableHead>
                                            <TableHead>Hành động</TableHead>
                                            <TableHead>Đối tượng</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activityLogs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                                                    Chưa có hoạt động nào
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            activityLogs.slice(0, 8).map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-muted-foreground text-xs">
                                                        {formatTime(log.created_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarFallback className="text-[10px]">
                                                                    {log.user_name?.charAt(0) || 'U'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm">{log.user_name || 'System'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {getActionLabel(log.action)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {log.entity_type}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AdminLayout>
    )
}
