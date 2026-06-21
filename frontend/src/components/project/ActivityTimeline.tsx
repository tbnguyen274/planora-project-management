"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { ScrollArea } from "../ui/scroll-area"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Loader2, History, CheckCircle2, Edit, Trash2, UserPlus, MessageSquare, ArrowRight, RefreshCw } from "lucide-react"
import { getProjectActivityLogs, type ProjectActivityLog } from "@backend/services/projectActivityService"
import { supabase } from "../../lib/supabase-client"
import type { Project } from "../../types"

interface ActivityTimelineProps {
    project: Project
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    'created': <CheckCircle2 className="w-4 h-4 text-green-500" />,
    'updated': <Edit className="w-4 h-4 text-blue-500" />,
    'deleted': <Trash2 className="w-4 h-4 text-red-500" />,
    'status_changed': <ArrowRight className="w-4 h-4 text-amber-500" />,
    'assigned': <UserPlus className="w-4 h-4 text-purple-500" />,
    'comment_added': <MessageSquare className="w-4 h-4 text-cyan-500" />,
    'added': <UserPlus className="w-4 h-4 text-green-500" />,
    'removed': <Trash2 className="w-4 h-4 text-red-500" />,
}

const STATUS_LABELS: Record<string, string> = {
    'backlog': 'Backlog',
    'todo': 'Chờ làm',
    'in-progress': 'Đang làm',
    'in_progress': 'Đang làm',
    'done': 'Hoàn thành',
}

export function ActivityTimeline({ project }: ActivityTimelineProps) {
    const [logs, setLogs] = useState<ProjectActivityLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLogs = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getProjectActivityLogs(supabase as any, project.id, 100)
            setLogs(data)
        } catch (err) {
            setError('Không thể tải lịch sử hoạt động')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [project.id])

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return 'Vừa xong'
        if (minutes < 60) return `${minutes} phút trước`
        if (hours < 24) return `${hours} giờ trước`
        if (days < 7) return `${days} ngày trước`
        return date.toLocaleDateString('vi-VN')
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }

    const getActionLabel = (action: string, entityType?: string) => {
        const labels: Record<string, string> = {
            'created': 'Tạo mới',
            'updated': 'Cập nhật',
            'deleted': 'Xóa',
            'status_changed': 'Đổi trạng thái',
            'assigned': 'Giao nhiệm vụ',
            'comment_added': 'Thêm bình luận',
            'added': 'Thêm',
            'removed': 'Xóa',
        }
        return labels[action.toLowerCase()] || action
    }

    const getActivityDescription = (log: ProjectActivityLog): React.ReactNode => {
        const actionLabel = getActionLabel(log.action, log.entity_type)
        const targetName = log.task_title || log.new_value?.title || log.entity_id

        // Handle status changes
        if (log.action === 'status_changed' && log.old_value && log.new_value) {
            const oldStatus = STATUS_LABELS[log.old_value as string] || log.old_value
            const newStatus = STATUS_LABELS[log.new_value as string] || log.new_value
            return (
                <span>
                    {actionLabel}
                    {targetName && <span className="font-medium"> "{targetName}"</span>}
                    {' từ '}
                    <Badge variant="secondary" className="text-xs">{oldStatus}</Badge>
                    {' sang '}
                    <Badge variant="secondary" className="text-xs">{newStatus}</Badge>
                </span>
            )
        }

        return (
            <span>
                {actionLabel}
                {targetName && <span className="font-medium"> "{targetName}"</span>}
            </span>
        )
    }

    return (
        <div className="p-6">
            <Card className="border shadow-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <History className="w-5 h-5 text-gray-600" />
                                Lịch sử hoạt động
                            </CardTitle>
                            <CardDescription>
                                Các thay đổi và hoạt động trong dự án
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchLogs}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Làm mới
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            <span className="ml-2 text-gray-500">Đang tải...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-500">
                            {error}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>Chưa có hoạt động nào được ghi nhận</p>
                            <p className="text-sm mt-1">Các thay đổi sẽ được hiển thị ở đây</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px]">
                            <div className="divide-y">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Avatar */}
                                        <Avatar className="w-9 h-9 flex-shrink-0">
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                                                {getInitials(log.user_name || 'U')}
                                            </AvatarFallback>
                                        </Avatar>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {ACTION_ICONS[log.action] || <Edit className="w-4 h-4 text-gray-400" />}
                                                <span className="font-medium text-gray-900">
                                                    {log.user_name || 'Unknown'}
                                                </span>
                                                <span className="text-gray-600 text-sm">
                                                    {getActivityDescription(log)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {formatTime(log.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
