"use client"

import { useState, useEffect } from "react"
import { LayoutDashboard, Users, Shield, FolderKanban, BarChart3, Loader2, Settings, LogOut, TrendingUp, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase-client';
import { getDetailedStats, type DetailedStats } from '@backend/services/adminService'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SettingsModal } from "../settings/SettingsModal"
import { Bar, BarChart, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Legend, CartesianGrid, Tooltip } from "recharts"

interface StatisticsProps {
    adminEmail?: string
    onNavigate: (page: 'dashboard' | 'users' | 'roles' | 'projects' | 'statistics') => void
    onLogout?: () => void
}

const STATUS_COLORS: Record<string, string> = {
    'todo': '#94a3b8',
    'in_progress': '#3b82f6',
    'in-progress': '#3b82f6',
    'review': '#f59e0b',
    'done': '#22c55e',
    'completed': '#22c55e',
    'unknown': '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
    'todo': 'Chờ làm',
    'in_progress': 'Đang làm',
    'in-progress': 'Đang làm',
    'review': 'Đang review',
    'done': 'Hoàn thành',
    'completed': 'Hoàn thành',
    'unknown': 'Khác',
}

const ROLE_COLORS: Record<string, string> = {
    'admin': '#8b5cf6',
    'user': '#06b6d4',
}

const ROLE_LABELS: Record<string, string> = {
    'admin': 'Admin',
    'user': 'Thành viên',
}

export function Statistics({ adminEmail, onNavigate, onLogout }: StatisticsProps) {
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
    const [settings, setSettings] = useState({
        theme: 'light' as 'light' | 'dark',
        language: 'vi' as 'vi' | 'en',
        notifications: {
            taskAssigned: true,
            taskCompleted: true,
            projectUpdates: true,
            emailNotifications: true,
        },
        linkedAccounts: {},
    })

    // Data states
    const [stats, setStats] = useState<DetailedStats | null>(null)
    const [loading, setLoading] = useState(true)

    // Fetch statistics
    useEffect(() => {
        async function fetchStats() {
            try {
                setLoading(true)
                const data = await getDetailedStats(supabase as any)
                setStats(data)
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
                toast.error(message)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    const adminUsername = adminEmail ? adminEmail.split('@')[0] : 'Admin'
    const adminAvatarFallback = adminUsername.substring(0, 2).toUpperCase()

    // Prepare chart data
    const taskStatusData = stats?.tasksByStatus.map(item => ({
        name: STATUS_LABELS[item.status] || item.status,
        value: item.count,
        fill: STATUS_COLORS[item.status] || '#6b7280',
    })) || []

    const userRoleData = stats?.usersByRole.map(item => ({
        name: ROLE_LABELS[item.role] || item.role,
        value: item.count,
        fill: ROLE_COLORS[item.role] || '#6b7280',
    })) || []

    const monthlyData = stats?.monthlyData || []

    // Calculate completion rate
    const completionRate = stats?.totalStats.totalTasks
        ? Math.round((stats.totalStats.completedTasks / stats.totalStats.totalTasks) * 100)
        : 0

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card flex flex-col">
                <div className="h-[52px] flex items-center px-4 border-b border-border">
                    <h1 className="text-lg font-bold text-primary">Planora Admin</h1>
                </div>

                <nav className="flex-1 py-4">
                    <ul className="space-y-1 px-3">
                        <li>
                            <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                <LayoutDashboard className="h-4 w-4" />
                                <span>Giám sát hệ thống</span>
                            </button>
                        </li>
                        <li>
                            <button onClick={() => onNavigate('users')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                <Users className="h-4 w-4" />
                                <span>Quản lý người dùng</span>
                            </button>
                        </li>
                        <li>
                            <button onClick={() => onNavigate('roles')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                <Shield className="h-4 w-4" />
                                <span>Quản lý vai trò</span>
                            </button>
                        </li>
                        <li>
                            <button onClick={() => onNavigate('projects')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                <FolderKanban className="h-4 w-4" />
                                <span>Quản lý dự án</span>
                            </button>
                        </li>
                        <li>
                            <button onClick={() => onNavigate('statistics')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-800 text-primary dark:text-white border border-gray-300 dark:border-gray-700">
                                <BarChart3 className="h-4 w-4" />
                                <span>Thống kê</span>
                            </button>
                        </li>
                    </ul>
                </nav>

                <div className="p-3 border-t border-border">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                                <Avatar className="h-7 w-7">
                                    <AvatarImage src="/placeholder.svg" alt="User" />
                                    <AvatarFallback className="text-xs">{adminAvatarFallback}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <div className="text-xs font-medium text-foreground">{adminUsername}</div>
                                    <div className="text-[11px] text-muted-foreground">{adminEmail}</div>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => setIsSettingsModalOpen(true)}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Cài đặt</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onLogout} className="text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Đăng xuất</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="container mx-auto px-4 lg:px-6 py-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2.5 rounded-xl shadow-md">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Thống kê chi tiết
                            </h1>
                            <p className="text-gray-600 text-sm">Xem báo cáo và biểu đồ về hoạt động hệ thống</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-blue-600" />
                                            <CardTitle className="text-sm text-blue-700">Người dùng</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-700">{stats?.totalStats.totalUsers || 0}</div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center gap-2">
                                            <FolderKanban className="w-4 h-4 text-orange-600" />
                                            <CardTitle className="text-sm text-orange-700">Dự án</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-orange-700">{stats?.totalStats.totalProjects || 0}</div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-purple-600" />
                                            <CardTitle className="text-sm text-purple-700">Tổng tasks</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-purple-700">{stats?.totalStats.totalTasks || 0}</div>
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

                            {/* Charts Row */}
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                {/* Tasks by Status - Bar Chart */}
                                <Card className="border shadow-md">
                                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                                        <CardTitle className="text-base font-bold">Tasks theo trạng thái</CardTitle>
                                        <CardDescription>Phân bổ công việc theo tình trạng</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={taskStatusData} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                                    <XAxis type="number" />
                                                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                        {taskStatusData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Users by Role - Pie Chart */}
                                <Card className="border shadow-md">
                                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                                        <CardTitle className="text-base font-bold">Phân bổ vai trò</CardTitle>
                                        <CardDescription>Tỷ lệ Admin và Thành viên</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={userRoleData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={90}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        label={({ name, value }) => `${name}: ${value}`}
                                                    >
                                                        {userRoleData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Monthly Trend - Line Chart */}
                            <Card className="border shadow-md">
                                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                        <div>
                                            <CardTitle className="text-base font-bold">Xu hướng 6 tháng gần nhất</CardTitle>
                                            <CardDescription>Số lượng dự án và người dùng mới theo tháng</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={monthlyData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <Tooltip />
                                                <Legend />
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
                        </>
                    )}
                </div>
            </main>

            <SettingsModal
                open={isSettingsModalOpen}
                onOpenChange={setIsSettingsModalOpen}
                settings={settings}
                onUpdateSettings={setSettings}
            />
        </div>
    )
}
