import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Plus, FolderKanban, CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar, CheckSquare, Users, LayoutDashboard } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import type { User, Project, Task } from '../../types';

interface DashboardPageProps {
  user: User;
  projects: Project[];
  tasks: Task[];
  onSelectProject: (projectId: string) => void;
}

export function DashboardPage({
  user,
  projects,
  tasks,
  onSelectProject,
}: DashboardPageProps) {
  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date() && t.status !== 'done';
  }).length;

  const myTasks = tasks.filter(t => t.assignees.includes(user.id));
  const myInProgressTasks = myTasks.filter(t => t.status === 'in-progress');

  const getProjectProgress = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    const completed = projectTasks.filter(t => t.status === 'done').length;
    return Math.round((completed / projectTasks.length) * 100);
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return priority;
    }
  };

  return (
    <div className="container mx-auto px-4 lg:px-6 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-md">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Xin chào, {user.name}!
            </h1>
            <p className="text-gray-600 text-sm">Đây là tổng quan về các dự án và nhiệm vụ của bạn</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border border-blue-200 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Tổng dự án</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {projects.length}
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-md">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-green-200 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs text-green-700 font-semibold uppercase tracking-wide">Hoàn thành</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {completedTasks}
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 rounded-xl shadow-md">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-green-700 font-medium">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% tổng nhiệm vụ
            </p>
          </CardContent>
        </Card>

        <Card className="border border-yellow-200 hover:shadow-lg transition-shadow bg-gradient-to-br from-yellow-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Đang thực hiện</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                {inProgressTasks}
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-2.5 rounded-xl shadow-md">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-red-200 hover:shadow-lg transition-shadow bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs text-red-700 font-semibold uppercase tracking-wide">Trễ hạn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                {overdueTasks}
              </div>
              <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2.5 rounded-xl shadow-md">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">Dự án của tôi</CardTitle>
                  <CardDescription className="text-sm mt-0.5">Danh sách các dự án bạn đang tham gia</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {projects.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300">
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                    <FolderKanban className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-gray-700 font-semibold text-base mb-1">Chưa có dự án nào</p>
                  <p className="text-xs text-gray-600">
                    Tạo dự án mới để bắt đầu quản lý công việc
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => {
                    const progress = getProjectProgress(project.id);
                    const daysLeft = getDaysUntilDeadline(project.deadline);
                    const projectTaskCount = tasks.filter(t => t.projectId === project.id).length;

                    return (
                      <div
                        key={project.id}
                        className="border rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-white to-blue-50/30"
                        onClick={() => onSelectProject(project.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <h3 className="text-base font-bold text-gray-900">{project.name}</h3>
                              <Badge variant="outline" className="text-xs px-2 py-0.5 font-medium">
                                {project.template === 'kanban' ? 'Kanban' : 'Scrum'}
                              </Badge>
                            </div>
                            {project.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-gray-700">Tiến độ</span>
                            <span className="text-blue-600 text-sm">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2 bg-gray-200" />
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                              <CheckSquare className="w-4 h-4" />
                              <span>{projectTaskCount} nhiệm vụ</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                              <Users className="w-4 h-4" />
                              <span>{project.members.length} thành viên</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-700 font-medium px-2 py-1 bg-blue-50 rounded-md">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>
                              {daysLeft > 0
                                ? `Còn ${daysLeft} ngày`
                                : daysLeft === 0
                                  ? 'Hết hạn hôm nay'
                                  : `Trễ ${Math.abs(daysLeft)} ngày`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Tasks */}
        <div className="space-y-4">
          <Card className="border shadow-md">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="text-lg font-bold text-gray-900">Nhiệm vụ của tôi</CardTitle>
              <CardDescription className="text-sm">Nhiệm vụ đang thực hiện</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {myInProgressTasks.length === 0 ? (
                <div className="text-center py-10 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-dashed border-green-300">
                  <div className="bg-white w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Không có nhiệm vụ nào</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myInProgressTasks.slice(0, 5).map((task) => {
                    const project = projects.find(p => p.id === task.projectId);

                    return (
                      <div key={task.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1.5">{task.title}</p>
                            {project && (
                              <p className="text-xs text-gray-500">{project.name}</p>
                            )}
                          </div>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs px-2 py-0.5">
                            {getPriorityLabel(task.priority)}
                          </Badge>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border shadow-md">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-1.5 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                Thống kê nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-blue-50 to-white rounded-lg">
                <span className="text-sm font-medium text-gray-700">Nhiệm vụ của tôi</span>
                <span className="text-base font-bold text-blue-600">{myTasks.length}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-green-50 to-white rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã hoàn thành</span>
                <span className="text-base font-bold text-green-600">
                  {myTasks.filter(t => t.status === 'done').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-yellow-50 to-white rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang làm</span>
                <span className="text-base font-bold text-yellow-600">
                  {myInProgressTasks.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-purple-50 to-white rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tỷ lệ hoàn thành</span>
                <span className="text-base font-bold text-purple-600">
                  {myTasks.length > 0
                    ? Math.round((myTasks.filter(t => t.status === 'done').length / myTasks.length) * 100)
                    : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
