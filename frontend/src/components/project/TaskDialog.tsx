import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Clock, MessageSquare, Paperclip, Plus, X, Trash2, Edit,
  Check, CheckSquare, Link as LinkIcon, FileText, Image as ImageIcon,
  AlertCircle, Sparkles, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import type { User, Project, Task } from '../../types';

interface TaskDialogProps {
  task: Task;
  project: Project;
  user: User;
  allTasks: Task[];
  isManager: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt' | 'comments' | 'attachments'>) => void;
  onAddComment: (taskId: string, content: string) => void;
  onAddAttachment: (taskId: string, file: { name: string; url: string; type: string }) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onUploadFile?: (taskId: string, file: File) => Promise<{ success: boolean }>;
}

export function TaskDialog({
  task,
  project,
  user,
  allTasks,
  isManager,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onCreateTask,
  onAddComment,
  onAddAttachment,
  onDeleteAttachment,
  onUploadFile,
}: TaskDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);
  const [isEstimatingDeadline, setIsEstimatingDeadline] = useState(false);
  const [localAttachments, setLocalAttachments] = useState(task.attachments);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedTempIds, setUploadedTempIds] = useState<Set<string>>(new Set());

  // Sync editedTask when task prop changes (after fetchTasks)
  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  // Sync local attachments when task prop changes (e.g., after fetchTasks)
  useEffect(() => {
    setLocalAttachments(prev => {
      const tempAttachments = prev.filter(a => a.id.startsWith('temp-'));
      const realAttachments = task.attachments || [];

      // Remove temp attachments that now have real counterparts (same name)
      const realNames = new Set(realAttachments.map(a => a.name));
      const remainingTempAttachments = tempAttachments.filter(temp => !realNames.has(temp.name));

      // Combine: real attachments + temp attachments that don't have real counterparts yet
      return [...realAttachments, ...remainingTempAttachments];
    });
  }, [task.attachments]);

  const subtasks = allTasks.filter(t => t.parentTaskId === task.id);

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Helper function to get file icon based on type
  const getFileIcon = (type: string, url: string) => {
    if (type === 'image' || type.startsWith('image/')) {
      return <ImageIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />;
    } else if (type.includes('pdf')) {
      return <FileText className="w-6 h-6 text-red-600 flex-shrink-0" />;
    } else if (type.includes('word') || type.includes('document')) {
      return <FileText className="w-6 h-6 text-blue-700 flex-shrink-0" />;
    } else if (type.includes('sheet') || type.includes('excel')) {
      return <FileText className="w-6 h-6 text-green-600 flex-shrink-0" />;
    } else if (type === 'link' || url.startsWith('http')) {
      return <LinkIcon className="w-6 h-6 text-purple-600 flex-shrink-0" />;
    } else {
      return <FileText className="w-6 h-6 text-gray-600 flex-shrink-0" />;
    }
  };

  const handleEnhanceDescription = async () => {
    if (!editedTask.description?.trim()) return;
    setIsEnhancingDescription(true);
    try {
      const { enhanceDescription } = await import('../../lib/aiService');
      const enhanced = await enhanceDescription(editedTask.description);
      setEditedTask({ ...editedTask, description: enhanced });
      toast.success('Đã cải thiện mô tả bằng AI!');
    } catch (error) {
      console.error('AI enhance error:', error);
      toast.error('Lỗi khi gọi AI');
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  const handleEstimateDeadline = async () => {
    if (!editedTask.title?.trim() && !editedTask.description?.trim()) return;
    setIsEstimatingDeadline(true);
    try {
      const { estimateTime } = await import('../../lib/aiService');
      const days = await estimateTime(editedTask.title, editedTask.description || '');
      const suggestedDeadline = new Date();
      suggestedDeadline.setDate(suggestedDeadline.getDate() + days);
      setEditedTask({
        ...editedTask,
        dueDate: suggestedDeadline.toISOString().split('T')[0],
      });
      toast.success(`AI đề xuất: ${days} ngày để hoàn thành`);
    } catch (error) {
      console.error('AI estimate error:', error);
      toast.error('Lỗi khi ước tính thời gian');
    } finally {
      setIsEstimatingDeadline(false);
    }
  };

  const handleSave = () => {
    onUpdateTask(task.id, editedTask);
    setIsEditing(false);
    toast.success('Cập nhật thành công!');
  };

  const handleDelete = () => {
    if (confirm('Bạn có chắc muốn xóa nhiệm vụ này?')) {
      onDeleteTask(task.id);
      onClose();
      toast.success('Đã xóa nhiệm vụ!');
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(task.id, newComment);
      setNewComment('');
      toast.success('Đã thêm bình luận!');
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      onCreateTask({
        projectId: task.projectId,
        type: 'task',
        title: newSubtask,
        description: '',
        priority: task.priority,
        status: 'todo',
        assignees: task.assignees,
        labels: [],
        parentTaskId: task.id,
        createdBy: user.id,
        updatedAt: new Date().toISOString(),
      });
      setNewSubtask('');
      toast.success('Đã thêm nhiệm vụ con!');
    }
  };

  const handleAddAttachment = () => {
    if (attachmentUrl.trim()) {
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachmentUrl);

      // For images, use filename; for links, use domain + shortened path
      let fileName: string;
      try {
        const url = new URL(attachmentUrl);
        if (isImage) {
          // For images, get the filename
          fileName = url.pathname.split('/').pop() || attachmentUrl;
        } else {
          // For links, show domain + start of path (more meaningful)
          const pathPart = url.pathname.length > 20
            ? url.pathname.substring(0, 20) + '...'
            : url.pathname;
          fileName = url.hostname + pathPart;
        }
      } catch {
        // If URL parsing fails, use the full URL
        fileName = attachmentUrl.length > 50
          ? attachmentUrl.substring(0, 50) + '...'
          : attachmentUrl;
      }

      // Optimistic update - show immediately in UI
      const newAttachment = {
        id: `temp-${Date.now()}`,
        taskId: task.id,
        name: fileName,
        url: attachmentUrl,
        type: isImage ? 'image' : 'link',
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setLocalAttachments(prev => [...prev, newAttachment]);

      // Call API to persist
      onAddAttachment(task.id, {
        name: fileName,
        url: attachmentUrl,
        type: isImage ? 'image' : 'link',
      });
      setAttachmentUrl('');
    }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    // Optimistic update - remove from local state immediately
    setLocalAttachments(prev => prev.filter(a => a.id !== attachmentId));
    // Call API to delete from database
    onDeleteAttachment(attachmentId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast.error('Kích thước file vượt quá 10MB. Vui lòng chọn file nhỏ hơn.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    // Optimistic update - show file immediately with temp ID
    const isImage = file.type.startsWith('image/');
    const tempId = `temp-${Date.now()}`;
    const tempAttachment = {
      id: tempId,
      taskId: task.id,
      name: file.name,
      url: URL.createObjectURL(file), // Temporary URL for preview
      type: isImage ? 'image' : file.type,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setLocalAttachments(prev => [...prev, tempAttachment]);

    try {
      const result = await onUploadFile(task.id, file);
      if (result.success) {
        // Mark this temp as uploaded (no longer show loading)
        setUploadedTempIds(prev => new Set(prev).add(tempId));
        toast.success('Đã tải lên tệp tin thành công!');
        // Keep temp attachment visible until useEffect detects the real one
        // useEffect will automatically remove temp when it finds matching real attachment
      } else {
        // Remove temp attachment if upload failed
        setLocalAttachments(prev => prev.filter(a => a.id !== tempId));
        toast.error('Không thể tải lên tệp tin. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('File upload error:', error);
      setLocalAttachments(prev => prev.filter(a => a.id !== tempId));
      toast.error('Lỗi khi tải lên tệp tin: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const toggleAssignee = (userId: string) => {
    const newAssignees = editedTask.assignees.includes(userId)
      ? editedTask.assignees.filter(id => id !== userId)
      : [...editedTask.assignees, userId];

    setEditedTask({ ...editedTask, assignees: newAssignees });
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: 'Thấp',
      medium: 'Trung bình',
      high: 'Cao',
      urgent: 'Khẩn cấp',
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      backlog: 'Backlog',
      todo: 'Cần làm',
      'in-progress': 'Đang làm',
      done: 'Hoàn thành',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const isOverdue = editedTask.dueDate && new Date(editedTask.dueDate) < new Date() && editedTask.status !== 'done';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[92vh] overflow-hidden flex flex-col p-0 backdrop-blur-sm bg-white/95 border-0 shadow-2xl [&>button:last-child]:hidden">
        {/* Header cải tiến */}
        <DialogHeader className="px-5 lg:px-6 py-4 border-b bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={editedTask.title}
                  onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                  className="text-lg lg:text-xl font-semibold mb-2 border-2 focus:border-blue-500 h-11"
                  placeholder="Tên nhiệm vụ..."
                />
              ) : (
                <DialogTitle className="text-lg lg:text-xl font-bold mb-2 leading-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{task.title}</DialogTitle>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-medium">Tạo bởi {project.members.find(m => m.userId === task.createdBy)?.name || 'Unknown'}</span>
                <span className="text-gray-400">•</span>
                <span>{formatDateTime(task.createdAt)}</span>
              </div>
            </div>
            {isManager && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSave} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                      <Check className="w-4 h-4" />
                      Lưu
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      Hủy
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                      <Edit className="w-4 h-4" />
                      Sửa
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDelete} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                      Xóa
                    </Button>
                  </>
                )}
              </div>
            )}
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-red-100 hover:text-red-600 hover:scale-110 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-4">
          <div className="grid lg:grid-cols-[1fr_300px] gap-5">
            {/* Main Content */}
            <div className="space-y-4">
              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-gray-800">Mô tả</Label>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEnhanceDescription}
                      disabled={isEnhancingDescription || !editedTask.description}
                      className="gap-1.5 h-7 text-xs bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 text-purple-700"
                    >
                      <Sparkles className="w-3 h-3" />
                      {isEnhancingDescription ? 'Đang xử lý...' : 'AI Cải thiện'}
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <Textarea
                    value={editedTask.description}
                    onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                    rows={4}
                    className="resize-none border-2 focus:border-blue-500 text-sm max-h-28 overflow-y-auto"
                    placeholder="Nhập mô tả chi tiết..."
                  />
                ) : (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border leading-relaxed max-h-24 overflow-y-auto">
                    {task.description || 'Không có mô tả'}
                  </div>
                )}
              </div>

              {/* Tabs for Subtasks, Comments, Attachments */}
              <Tabs defaultValue="subtasks" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-gray-100 rounded-lg">
                  <TabsTrigger value="subtasks" className="gap-1.5 py-2.5 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <CheckSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">Nhiệm vụ con</span>
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-bold bg-blue-100 text-blue-700">
                      {subtasks.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="gap-1.5 py-2.5 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">Bình luận</span>
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-bold bg-blue-100 text-blue-700">
                      {task.comments.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="gap-1.5 py-2.5 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm font-medium">Tài liệu</span>
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-bold bg-blue-100 text-blue-700">
                      {localAttachments.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                {/* Subtasks Tab */}
                <TabsContent value="subtasks" className="space-y-4 mt-0">
                  <div className="flex gap-3">
                    <Input
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      placeholder="Nhập tên nhiệm vụ con..."
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                      className="flex-1"
                    />
                    <Button onClick={handleAddSubtask} className="gap-2 px-4">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Thêm</span>
                    </Button>
                  </div>

                  {subtasks.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                      <CheckSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-500 font-medium">
                        Chưa có nhiệm vụ con nào
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Thêm nhiệm vụ con để chia nhỏ công việc
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <input
                            type="checkbox"
                            checked={subtask.status === 'done'}
                            onChange={() => onUpdateTask(subtask.id, {
                              status: subtask.status === 'done' ? 'todo' : 'done',
                            })}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                          <span className={`flex-1 text-sm ${subtask.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
                            {subtask.title}
                          </span>
                          {isManager && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteTask(subtask.id)}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="space-y-4 mt-4">
                  <div className="flex gap-3">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Nhập bình luận của bạn..."
                      rows={3}
                      className="flex-1 resize-none"
                    />
                    <Button onClick={handleAddComment} className="self-end px-6">
                      Gửi
                    </Button>
                  </div>

                  {task.comments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                      <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-500 font-medium">
                        Chưa có bình luận nào
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Hãy là người đầu tiên bình luận
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {task.comments.map((comment) => (
                        <div key={comment.id} className="bg-white border p-4 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-sm font-semibold bg-blue-100 text-blue-700">
                                {comment.userName?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <span className="text-sm font-semibold">{comment.userName || 'Ẩn danh'}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {formatDateTime(comment.createdAt)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700 ml-11">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Attachments Tab */}
                <TabsContent value="attachments" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <Input
                        value={attachmentUrl}
                        onChange={(e) => setAttachmentUrl(e.target.value)}
                        placeholder="Nhập URL tài liệu (link hoặc hình ảnh)..."
                        className="flex-1 min-w-[200px]"
                      />
                      <Button onClick={handleAddAttachment} className="gap-2 px-4">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Thêm URL</span>
                      </Button>
                      {onUploadFile && (
                        <label className="cursor-pointer" title="Tải lên tệp tin (tối đa 10MB)">
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.ppt,.pptx"
                            disabled={isUploading}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 px-4"
                            disabled={isUploading}
                            asChild
                          >
                            <span>
                              {isUploading ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span className="hidden sm:inline">
                                {isUploading ? 'Đang tải...' : 'Upload File'}
                              </span>
                            </span>
                          </Button>
                        </label>
                      )}
                    </div>
                    {onUploadFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Hỗ trợ: Ảnh, PDF, Word, Excel, PowerPoint, ZIP (tối đa 10MB)
                      </p>
                    )}
                  </div>

                  {localAttachments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                      <Paperclip className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-500 font-medium">
                        Chưa có tài liệu đính kèm
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Thêm link hoặc hình ảnh liên quan
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {localAttachments.map((attachment) => {
                        const fileSize = attachment.fileSize || 0;
                        const isTemp = attachment.id.startsWith('temp-');
                        const isUploaded = uploadedTempIds.has(attachment.id);
                        const showLoading = isTemp && !isUploaded;

                        return (
                          <div
                            key={attachment.id}
                            className={`flex items-center gap-3 p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow ${showLoading ? 'opacity-60' : ''}`}
                          >
                            {getFileIcon(attachment.type, attachment.url)}
                            <div className="flex-1 min-w-0">
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:underline block truncate"
                                title={attachment.name}
                              >
                                {attachment.name}
                              </a>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-gray-500">
                                  {formatDateTime(attachment.createdAt || '')}
                                </p>
                                {fileSize > 0 && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(fileSize)}
                                    </p>
                                  </>
                                )}
                                {showLoading && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <p className="text-xs text-orange-500">Đang tải...</p>
                                  </>
                                )}
                              </div>
                            </div>
                            {!showLoading && (
                              <button
                                onClick={() => handleDeleteAttachment(attachment.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors flex-shrink-0"
                                title="Xóa tài liệu"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 bg-gradient-to-b from-gray-50 to-white p-4 rounded-lg border shadow-sm">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">
                  Trạng thái
                </Label>
                {isEditing ? (
                  <Select
                    value={editedTask.status}
                    onValueChange={(value) => setEditedTask({ ...editedTask, status: value as Task['status'] })}
                  >
                    <SelectTrigger className="w-full h-9 border text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      <SelectItem value="todo">Cần làm</SelectItem>
                      <SelectItem value="in-progress">Đang làm</SelectItem>
                      <SelectItem value="done">Hoàn thành</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="text-sm px-3 py-2 w-full justify-center">
                    {getStatusLabel(task.status)}
                  </Badge>
                )}
              </div>

              <Separator className="bg-gray-200" />

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Ưu tiên</Label>
                {isEditing ? (
                  <Select
                    value={editedTask.priority}
                    onValueChange={(value) => setEditedTask({ ...editedTask, priority: value as Task['priority'] })}
                  >
                    <SelectTrigger className="w-full h-9 border text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Thấp</SelectItem>
                      <SelectItem value="medium">Trung bình</SelectItem>
                      <SelectItem value="high">Cao</SelectItem>
                      <SelectItem value="urgent">Khẩn cấp</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className="text-sm px-3 py-2 w-full justify-center">
                    {getPriorityLabel(task.priority)}
                  </Badge>
                )}
              </div>

              <Separator className="bg-gray-200" />

              {/* Deadline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-gray-700">Deadline</Label>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEstimateDeadline}
                      disabled={isEstimatingDeadline || (!editedTask.title && !editedTask.description)}
                      className="gap-1 h-7 text-xs bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 text-purple-700"
                    >
                      <Sparkles className="w-3 h-3" />
                      {isEstimatingDeadline ? '...' : 'AI'}
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedTask.dueDate || ''}
                    onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                    className="w-full h-9 border text-sm"
                  />
                ) : editedTask.dueDate ? (
                  <div className={`flex items-center justify-center gap-2 text-sm px-3 py-2 rounded font-semibold ${isOverdue ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-blue-100 text-blue-700 border border-blue-300'}`}>
                    <Clock className="w-4 h-4" />
                    <span>{new Date(editedTask.dueDate).toLocaleDateString('vi-VN')}</span>
                    {isOverdue && <AlertCircle className="w-4 h-4" />}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 italic block text-center py-2">Chưa đặt deadline</span>
                )}
              </div>

              <Separator className="bg-gray-200" />

              {/* Assignees */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Người thực hiện</Label>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {project.members.map((member) => (
                      <Badge
                        key={member.userId}
                        variant={editedTask.assignees.includes(member.userId) ? 'default' : 'outline'}
                        className="cursor-pointer hover:scale-105 transition-transform px-2.5 py-1 text-sm"
                        onClick={() => toggleAssignee(member.userId)}
                      >
                        {member.name}
                      </Badge>
                    ))}
                  </div>
                ) : task.assignees.length > 0 ? (
                  <div className="space-y-2">
                    {task.assignees.map((userId) => {
                      const member = project.members.find(m => m.userId === userId);
                      return member ? (
                        <div key={userId} className="flex items-center gap-2 p-2 bg-white rounded border hover:shadow-sm transition-shadow">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                              {member.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold text-gray-800">{member.name}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic block text-center py-1.5">Chưa phân công</span>
                )}
              </div>

              {(task.type === 'user-story' || task.storyPoints) && (
                <>
                  <Separator className="bg-gray-200" />
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Story Points</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editedTask.storyPoints || ''}
                        onChange={(e) => setEditedTask({ ...editedTask, storyPoints: parseInt(e.target.value) || undefined })}
                        placeholder="Nhập story points..."
                        className="w-full h-9 border text-sm"
                      />
                    ) : (
                      <Badge variant="secondary" className="text-sm px-3 py-2 w-full justify-center font-bold">
                        {editedTask.storyPoints ? `${editedTask.storyPoints} điểm` : 'Chưa đặt'}
                      </Badge>
                    )}
                  </div>
                </>
              )}

              {task.labels && task.labels.length > 0 && (
                <>
                  <Separator className="bg-gray-300" />
                  <div className="space-y-3">
                    <Label className="text-sm lg:text-base font-bold text-gray-800">Nhãn</Label>
                    <div className="flex flex-wrap gap-2">
                      {task.labels.map((label, idx) => (
                        <Badge key={idx} variant="outline" className="px-3 py-1.5 text-sm border-2">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
