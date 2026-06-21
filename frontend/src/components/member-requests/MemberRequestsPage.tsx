"use client"

import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Check, X, Users, Calendar } from "lucide-react"
import type { JoinRequest } from '@backend/services/joinRequestService'

interface MemberRequestsPageProps {
  joinRequests: JoinRequest[]
  onApproveJoinRequest: (requestId: string) => void
  onRejectJoinRequest: (requestId: string) => void
}

export function MemberRequestsPage({
  joinRequests,
  onApproveJoinRequest,
  onRejectJoinRequest,
}: MemberRequestsPageProps) {
  const pendingRequests = joinRequests.filter((r) => r.status === "pending")
  const handledRequests = joinRequests.filter((r) => r.status !== "pending")

  const handleApprove = (requestId: string) => {
    onApproveJoinRequest(requestId)
  }

  const handleReject = (requestId: string) => {
    onRejectJoinRequest(requestId)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h1 className="text-2xl font-bold">Yêu cầu tham gia</h1>
        </div>
        <p className="text-gray-600 text-sm">Quản lý các yêu cầu tham gia dự án từ thành viên</p>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3">Yêu cầu chưa xử lý ({pendingRequests.length})</h2>
          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{request.userName || request.email}</CardTitle>
                      <CardDescription>{request.email}</CardDescription>
                    </div>
                    <Badge>Chờ xử lý</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">Yêu cầu tham gia: {request.projectName}</p>
                      <p className="text-gray-600 text-xs mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(request.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Chấp nhận
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(request.id)}>
                        <X className="w-4 h-4 mr-1" />
                        Từ chối
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Handled Requests */}
      {handledRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Lịch sử ({handledRequests.length})</h2>
          <div className="grid gap-4">
            {handledRequests.map((request) => (
              <Card key={request.id} className="opacity-75">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{request.userName || request.email}</CardTitle>
                      <CardDescription>{request.email}</CardDescription>
                    </div>
                    <Badge variant={request.status === "accepted" ? "default" : "destructive"}>
                      {request.status === "accepted" ? "Đã chấp nhận" : "Đã từ chối"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p className="font-medium">Dự án: {request.projectName}</p>
                    <p className="text-gray-600 text-xs mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(request.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {joinRequests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">Không có yêu cầu tham gia nào</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
