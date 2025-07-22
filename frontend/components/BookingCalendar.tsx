'use client';

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, DateSelectArg, EventClickArg, Calendar } from '@fullcalendar/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { TimeUtils } from '@/lib/timeUtils';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  RotateCcw,
  Trash2,
  Play,
  Square,
  Plus,
  Cpu
} from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  description: string;
  total_memory_gb: number;
  is_active: boolean;
}

interface Booking {
  id: string;
  task_name: string;
  resource_id: string;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'active' | 'completed';
  user_id: string;
}

interface CalendarBooking {
  id: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
  taskName: string;
  status: 'upcoming' | 'active' | 'completed';
  isOwn: boolean;
}

interface BookingCalendarProps {
  onBookingCreated?: () => void;
}

export default function BookingCalendar({ onBookingCreated }: BookingCalendarProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [statusSummary, setStatusSummary] = useState<{
    upcoming: number;
    active: number;
    completed: number;
    last_updated: string;
  } | null>(null);

  // FullCalendar state
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventInput | null>(null);
  const [newBooking, setNewBooking] = useState({
    resource_id: '',
    task_name: '',
    start_time: '',
    end_time: '',
    estimated_memory_gb: 12
  });

  const calendarRef = useRef<FullCalendar>(null);
  const currentUser = useRef<string>('');

  useEffect(() => {
    loadData();
    // 初始化时也获取状态摘要
    const initializeStatusSummary = async () => {
      try {
        const summary = await apiClient.getStatusSummary();
        setStatusSummary(summary);
      } catch (error) {
        console.log('获取状态摘要失败:', error);
      }
    };
    initializeStatusSummary();
  }, [selectedResourceId]);

  // Real-time clock and countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 自动更新状态和数据
  useEffect(() => {
    // 立即执行一次状态更新和数据加载
    const updateStatusAndData = async () => {
      try {
        // 更新预约状态
        await apiClient.updateBookingStatuses();
        
        // 获取状态摘要
        const summary = await apiClient.getStatusSummary();
        setStatusSummary(summary);
        
        // 重新加载数据以反映状态变化
        await loadData();
        
      } catch (error) {
        console.log('自动状态更新失败:', error);
      }
    };

    // 立即执行一次
    updateStatusAndData();

    // 设置定时器每30秒更新一次状态（更频繁的更新）
    const statusUpdateTimer = setInterval(updateStatusAndData, 30000);

    return () => clearInterval(statusUpdateTimer);
  }, [selectedResourceId]); // 当选中的资源改变时重新执行

  const loadData = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      // Load user info to determine ownership
      const userData = await apiClient.getCurrentUser();
      currentUser.current = userData.id;

      // Load resources
      const resourcesData = await apiClient.getResources();
      const activeResources = resourcesData.filter((r: Resource) => r.is_active);
      setResources(activeResources);
      
      // Set default selected resource if not already set
      if (!selectedResourceId && activeResources.length > 0) {
        setSelectedResourceId(activeResources[0].id);
      }
      
      // Load bookings for all resources or selected resource
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7); // End of week
      
      const calendarData = await apiClient.getCalendarData(weekStart, weekEnd);
      
      // Convert bookings to calendar format
      const calendarBookings: CalendarBooking[] = calendarData.bookings
        .filter((booking: any) => selectedResourceId === "all" || !selectedResourceId || booking.resource_id === selectedResourceId)
        .map((booking: any) => ({
          id: booking.id,
          resourceId: booking.resource_id,
          startTime: TimeUtils.fromUTCISOString(booking.start_time),
          endTime: TimeUtils.fromUTCISOString(booking.end_time),
          taskName: booking.task_name,
          status: booking.status,
          isOwn: booking.user_id === currentUser.current
        }));

      setBookings(calendarBookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // Convert bookings to FullCalendar events
  const getCalendarEvents = (): EventInput[] => {
    return bookings.map((booking) => ({
      id: booking.id,
      title: booking.taskName,
      start: booking.startTime,
      end: booking.endTime,
      backgroundColor: getEventColor(booking.status, booking.isOwn),
      borderColor: getEventBorderColor(booking.status, booking.isOwn),
      textColor: '#ffffff',
      extendedProps: {
        resourceId: booking.resourceId,
        status: booking.status,
        isOwn: booking.isOwn,
        booking: booking
      }
    }));
  };

  // Get event colors based on status and ownership
  const getEventColor = (status: string, isOwn: boolean) => {
    if (isOwn) {
      switch (status) {
        case 'upcoming': return '#3b82f6'; // blue
        case 'active': return '#10b981'; // green
        case 'completed': return '#6b7280'; // gray
        default: return '#6b7280';
      }
    } else {
      switch (status) {
        case 'upcoming': return '#64748b'; // slate
        case 'active': return '#059669'; // emerald
        case 'completed': return '#374151'; // gray
        default: return '#374151';
      }
    }
  };

  const getEventBorderColor = (status: string, isOwn: boolean) => {
    if (isOwn) {
      switch (status) {
        case 'upcoming': return '#1d4ed8'; // blue-700
        case 'active': return '#047857'; // green-700
        case 'completed': return '#374151'; // gray-700
        default: return '#374151';
      }
    } else {
      return getEventColor(status, isOwn);
    }
  };

  // Handle date selection for creating new booking
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (!selectedResourceId || selectedResourceId === "all") {
      setApiError('请先选择一个具体的资源');
      return;
    }

    // Clear any previous errors
    setApiError(null);

    // Format dates for datetime-local input
    const formatDateTimeLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setNewBooking({
      resource_id: selectedResourceId,
      task_name: '',
      start_time: formatDateTimeLocal(selectInfo.start),
      end_time: formatDateTimeLocal(selectInfo.end),
      estimated_memory_gb: 12
    });
    setShowBookingDialog(true);
  };

  // Handle event click for viewing/editing booking
  const handleEventClick = (clickInfo: EventClickArg) => {
    const booking = clickInfo.event.extendedProps.booking as CalendarBooking;
    setSelectedEvent({
      id: booking.id,
      title: booking.taskName,
      start: booking.startTime,
      end: booking.endTime,
      extendedProps: {
        resourceId: booking.resourceId,
        status: booking.status,
        isOwn: booking.isOwn,
        booking: booking
      }
    });
  };

  // Create booking with proper time conversion
  const handleCreateBooking = async () => {
    try {
      setApiError(null);
      
      if (!newBooking.task_name.trim()) {
        setApiError('请输入任务名称');
        return;
      }

      const startTime = new Date(newBooking.start_time);
      const endTime = new Date(newBooking.end_time);

      if (startTime >= endTime) {
        setApiError('结束时间必须晚于开始时间');
        return;
      }

      if (startTime < new Date()) {
        setApiError('不能预约过去的时间');
        return;
      }

      const bookingData = {
        resource_id: newBooking.resource_id,
        task_name: newBooking.task_name.trim(),
        start_time: TimeUtils.toUTCISOString(startTime),
        end_time: TimeUtils.toUTCISOString(endTime),
        estimated_memory_gb: newBooking.estimated_memory_gb
      };

      await apiClient.createBooking(bookingData);
      
      setSuccessMessage('预约创建成功！');
      setShowBookingDialog(false);
      
      // Reset form
      setNewBooking({
        resource_id: '',
        task_name: '',
        start_time: '',
        end_time: '',
        estimated_memory_gb: 12
      });
      
      // Reload data
      await loadData();
      
      if (onBookingCreated) {
        onBookingCreated();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error: any) {
      setApiError(error.message || '创建预约失败');
    }
  };

  // Delete booking function
  const handleDeleteBooking = async (bookingId: string) => {
    try {
      setApiError(null);
      await apiClient.deleteBooking(bookingId);
      setSuccessMessage('预约删除成功！');
      setSelectedEvent(null);
      await loadData();
      
      if (onBookingCreated) {
        onBookingCreated();
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setApiError(error.message || '删除预约失败');
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            资源预约日历
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">加载中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            资源预约日历
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                资源预约日历
              </CardTitle>
              <CardDescription>
                选择资源和时间段进行预约管理
              </CardDescription>
            </div>
            
            {/* Current time display */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              当前时间: {TimeUtils.formatDisplayTime(currentTime)}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Resource selector */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">选择资源:</label>
                <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择要查看的资源" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有资源</SelectItem>
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id}>
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          {resource.name} ({resource.total_memory_gb}GB)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status summary */}
              {statusSummary && (
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>即将开始: {statusSummary.upcoming}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>进行中: {statusSummary.active}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-500 rounded"></div>
                    <span>已完成: {statusSummary.completed}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {apiError && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {apiError}
              </AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* FullCalendar Component */}
      <Card>
        <CardContent className="p-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={getCalendarEvents()}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            height="auto"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            slotDuration="01:00:00"
            slotLabelInterval="01:00:00"
            allDaySlot={false}
            nowIndicator={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            locale="zh-cn"
            buttonText={{
              today: '今天',
              month: '月',
              week: '周',
              day: '日'
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
          />
        </CardContent>
      </Card>

      {/* New Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={(open) => {
        setShowBookingDialog(open);
        if (!open) {
          // Clear error when dialog closes
          setApiError(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建新预约</DialogTitle>
            <DialogDescription>
              请填写预约详情
            </DialogDescription>
          </DialogHeader>
          
          {/* Error display within dialog */}
          {apiError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {apiError}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">任务名称</label>
              <Input
                value={newBooking.task_name}
                onChange={(e) => setNewBooking({ ...newBooking, task_name: e.target.value })}
                placeholder="请输入任务名称"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">资源</label>
              <Select 
                value={newBooking.resource_id} 
                onValueChange={(value) => setNewBooking({ ...newBooking, resource_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择资源" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.name} ({resource.total_memory_gb}GB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">开始时间</label>
                <Input
                  type="datetime-local"
                  value={newBooking.start_time}
                  onChange={(e) => setNewBooking({ ...newBooking, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">结束时间</label>
                <Input
                  type="datetime-local"
                  value={newBooking.end_time}
                  onChange={(e) => setNewBooking({ ...newBooking, end_time: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">预计内存使用 (GB)</label>
              <Input
                type="number"
                min="1"
                value={newBooking.estimated_memory_gb}
                onChange={(e) => setNewBooking({ 
                  ...newBooking, 
                  estimated_memory_gb: parseInt(e.target.value) || 1 
                })}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <Button onClick={handleCreateBooking} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              创建预约
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBookingDialog(false);
                setApiError(null);
              }}
              className="flex-1"
            >
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>预约详情</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <strong>任务名称:</strong> {selectedEvent.title}
              </div>
              <div>
                <strong>开始时间:</strong> {TimeUtils.formatDisplayTime(selectedEvent.start as Date)}
              </div>
              <div>
                <strong>结束时间:</strong> {TimeUtils.formatDisplayTime(selectedEvent.end as Date)}
              </div>
              <div>
                <strong>状态:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  selectedEvent.extendedProps?.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedEvent.extendedProps?.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedEvent.extendedProps?.status === 'active' ? '进行中' :
                   selectedEvent.extendedProps?.status === 'upcoming' ? '即将开始' : '已完成'}
                </span>
              </div>
              
              {selectedEvent.extendedProps?.isOwn && selectedEvent.extendedProps?.status === 'upcoming' && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteBooking(selectedEvent.id as string)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除预约
                </Button>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setSelectedEvent(null)}
                className="flex-1"
              >
                关闭
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
