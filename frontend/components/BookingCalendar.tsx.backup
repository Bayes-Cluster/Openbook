'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';
import { TimeUtils } from '@/lib/timeUtils';
import { Calendar, Clock, Cpu, Plus, Check, X, AlertCircle } from 'lucide-react';

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

interface DragSelection {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
}

interface BookingCalendarProps {
  onBookingCreated?: () => void;
}

export default function BookingCalendar({ onBookingCreated }: BookingCalendarProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
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

  // Drag and drop state
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [newBooking, setNewBooking] = useState({
    resource_id: '',
    task_name: '',
    start_time: '',
    end_time: '',
    start_hour: 0,
    start_minute: 0,
    end_hour: 0,
    end_minute: 0,
    estimated_memory_gb: 12
  });

  const calendarRef = useRef<HTMLDivElement>(null);
  const currentUser = useRef<string>('');

  useEffect(() => {
    loadData();
  }, [currentWeek, selectedResourceId]); // 添加 selectedResourceId 依赖

  // Real-time clock and countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 自动更新状态和数据
  useEffect(() => {
    const statusUpdateTimer = setInterval(async () => {
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
    }, 60000); // 每分钟更新一次

    return () => clearInterval(statusUpdateTimer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      // Load user info to determine ownership
      const userData = await apiClient.getCurrentUser();
      currentUser.current = userData.id;

      // Load resources and calendar data for all bookings
      // Get the week range for calendar data
      const weekStart = new Date(currentWeek);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7); // End of week
      
      const [resourcesData, calendarData] = await Promise.all([
        apiClient.getResources(),
        apiClient.getCalendarData(weekStart, weekEnd),
      ]);

      const activeResources = resourcesData.filter((r: Resource) => r.is_active);
      setResources(activeResources);
      
      // Set default selected resource if not already set
      if (!selectedResourceId && activeResources.length > 0) {
        setSelectedResourceId(activeResources[0].id);
      }
      
      // Convert bookings from calendar data to calendar format with proper time handling
      const calendarBookings: CalendarBooking[] = calendarData.bookings.map((booking: any) => ({
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

  // Generate time slots (24 hours, 1-hour intervals)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);
  
  // Generate week days starting from Monday using TimeUtils
  const getWeekDays = (date: Date) => {
    return TimeUtils.getWeekDays(date);
  };

  const weekDays = getWeekDays(currentWeek);

  // Navigation functions
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  // Check if a time slot is occupied with precise time comparison
  const isSlotOccupied = (resourceId: string, day: Date, hour: number) => {
    const slotStart = TimeUtils.setTime(day, hour, 0, 0);
    const slotEnd = TimeUtils.setTime(day, hour + 1, 0, 0);

    return bookings.some(booking => 
      booking.resourceId === resourceId &&
      TimeUtils.hasTimeConflict(booking.startTime, booking.endTime, slotStart, slotEnd)
    );
  };

  // Get all bookings for a specific slot (支持多个重叠预约)
  const getSlotBookings = (resourceId: string, day: Date, hour: number) => {
    const slotStart = TimeUtils.setTime(day, hour, 0, 0);
    const slotEnd = TimeUtils.setTime(day, hour + 1, 0, 0);

    return bookings.filter(booking => 
      booking.resourceId === resourceId &&
      TimeUtils.hasTimeConflict(booking.startTime, booking.endTime, slotStart, slotEnd)
    );
  };

  // Get booking for a specific slot with precise time matching (保持向后兼容)
  const getSlotBooking = (resourceId: string, day: Date, hour: number) => {
    const slotStart = TimeUtils.setTime(day, hour, 0, 0);
    const slotEnd = TimeUtils.setTime(day, hour + 1, 0, 0);

    return bookings.find(booking => 
      booking.resourceId === resourceId &&
      TimeUtils.hasTimeConflict(booking.startTime, booking.endTime, slotStart, slotEnd)
    );
  };

  // Mouse event handlers for drag selection with proper time handling
  const handleMouseDown = (resourceId: string, day: Date, hour: number, e: React.MouseEvent) => {
    e.preventDefault();
    
    // 移除时间冲突检查 - 允许多个用户在同一时间段预约（基于内存管理）
    // 后端会在提交时检查内存冲突，前端允许用户选择任何时间段
    
    const startTime = TimeUtils.setTime(day, hour, 0, 0);
    const endTime = TimeUtils.setTime(day, hour + 1, 0, 0);

    setDragSelection({
      resourceId,
      startTime,
      endTime,
      isActive: true
    });
    setIsDragging(true);
  };

  const handleMouseEnter = (resourceId: string, day: Date, hour: number) => {
    if (!isDragging || !dragSelection || dragSelection.resourceId !== resourceId) {
      return;
    }

    // 移除时间冲突检查 - 允许拖拽到已有预约的时间段
    // 内存冲突会在后端提交时检查
    
    const currentTime = TimeUtils.setTime(day, hour, 0, 0);

    // Update end time if extending selection
    if (currentTime >= dragSelection.startTime) {
      const endTime = TimeUtils.setTime(day, hour + 1, 0, 0);
      
      setDragSelection({
        ...dragSelection,
        endTime
      });
    }
  };

  const handleMouseUp = () => {
    if (dragSelection && isDragging) {
      // Clear any previous API errors when starting a new booking
      setApiError(null);
      
      // Show booking dialog with pre-filled data using proper time formatting
      const startTime = dragSelection.startTime;
      const endTime = dragSelection.endTime;
      
      // Get default memory based on selected resource
      const selectedResource = resources.find(r => r.id === dragSelection.resourceId);
      const defaultMemory = selectedResource ? Math.floor(selectedResource.total_memory_gb / 2) : 12;
      
      setNewBooking({
        resource_id: dragSelection.resourceId,
        task_name: '',
        start_time: TimeUtils.toDateTimeLocalString(startTime),
        end_time: TimeUtils.toDateTimeLocalString(endTime),
        start_hour: startTime.getHours(),
        start_minute: startTime.getMinutes(),
        end_hour: endTime.getHours(),
        end_minute: endTime.getMinutes(),
        estimated_memory_gb: defaultMemory
      });
      setShowBookingDialog(true);
    }
    
    setIsDragging(false);
  };

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragSelection]);

  // Check if slot is in current drag selection with proper time comparison
  const isInDragSelection = (resourceId: string, day: Date, hour: number) => {
    if (!dragSelection || resourceId !== dragSelection.resourceId) {
      return false;
    }

    const slotStart = TimeUtils.setTime(day, hour, 0, 0);
    
    return slotStart >= dragSelection.startTime && slotStart < dragSelection.endTime;
  };

    // Create booking with proper time conversion to UTC and error handling
  const handleCreateBooking = async () => {
    try {
      setApiError(null); // 清除之前的错误
      
      // 使用用户调整的时间
      const startTime = new Date(TimeUtils.fromDateTimeLocalString(newBooking.start_time));
      startTime.setHours(newBooking.start_hour, newBooking.start_minute, 0, 0);
      
      const endTime = new Date(TimeUtils.fromDateTimeLocalString(newBooking.end_time));
      endTime.setHours(newBooking.end_hour, newBooking.end_minute, 0, 0);
      
      // 验证时间
      if (endTime <= startTime) {
        const errorMsg = '结束时间必须晚于开始时间';
        setApiError(errorMsg);
        return;
      }
      
      const bookingData = {
        resource_id: newBooking.resource_id,
        task_name: newBooking.task_name,
        start_time: TimeUtils.toUTCISOString(startTime),
        end_time: TimeUtils.toUTCISOString(endTime),
        estimated_memory_gb: newBooking.estimated_memory_gb
      };
      
      await apiClient.createBooking(bookingData);
      
      // 成功通知
      setSuccessMessage(`已成功创建预约：${newBooking.task_name}`);
      setTimeout(() => setSuccessMessage(null), 3000); // 3秒后清除成功消息
      
      setShowBookingDialog(false);
      setDragSelection(null);
      setNewBooking({ 
        resource_id: '', 
        task_name: '', 
        start_time: '', 
        end_time: '',
        start_hour: 0,
        start_minute: 0,
        end_hour: 0,
        end_minute: 0,
        estimated_memory_gb: 12
      });
      loadData();
      onBookingCreated?.();
    } catch (err) {
      // 显示API错误
      const errorMessage = err instanceof Error ? err.message : '创建预约失败';
      setApiError(errorMessage);
    }
  };

  const resetNewBooking = () => {
    setNewBooking({ 
      resource_id: '', 
      task_name: '', 
      start_time: '', 
      end_time: '',
      start_hour: 0,
      start_minute: 0,
      end_hour: 0,
      end_minute: 0,
      estimated_memory_gb: 12
    });
  };

  const handleResourceChange = (resourceId: string) => {
    const selectedResource = resources.find(r => r.id === resourceId);
    const defaultMemory = selectedResource ? Math.floor(selectedResource.total_memory_gb / 2) : 12;
    
    setNewBooking({
      ...newBooking, 
      resource_id: resourceId,
      estimated_memory_gb: defaultMemory
    });
  };

  const handleCancelBooking = () => {
    setShowBookingDialog(false);
    setDragSelection(null);
    resetNewBooking();
    setApiError(null);
  };

  const handleBookingClick = (booking: CalendarBooking) => {
    // Show booking details in a simple alert or status message
    setSuccessMessage(`预约详情: ${booking.taskName} - ${booking.isOwn ? '我的预约' : '他人预约'}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Get status color with transparency for overlapping bookings
  const getStatusColor = (status: string, isOwn: boolean) => {
    if (isOwn) {
      switch (status) {
        case 'upcoming': return 'bg-blue-500 bg-opacity-60';
        case 'active': return 'bg-green-500 bg-opacity-60';
        case 'completed': return 'bg-gray-400 bg-opacity-60';
        default: return 'bg-gray-400 bg-opacity-60';
      }
    } else {
      return 'bg-red-300 bg-opacity-60'; // Other user's booking
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calendar className="h-8 w-8 animate-pulse mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">加载日历中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Countdown Banner for Next Task */}
      {(() => {
        const nextTask = TimeUtils.findNextUpcomingTask(bookings, currentTime);
        return nextTask ? (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-full">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">下一个任务即将开始</h3>
                  <p className="text-blue-100">{nextTask.taskName}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{TimeUtils.formatCountdown(nextTask.startTime, currentTime)}</div>
                <div className="text-blue-100 text-sm">
                  开始时间: {TimeUtils.formatDisplayTimeWithTimezone(nextTask.startTime)}
                </div>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>资源预约日历</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                ← 上周
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                今天
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                下周 →
              </Button>
            </div>
          </div>
          
          {/* Current Time and Timezone */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  当前时间: {TimeUtils.formatDisplayTimeWithTimezone(currentTime)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Success and Error Messages */}
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="flex items-center justify-between">
                  <span>{successMessage}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSuccessMessage(null)}
                    className="ml-2 h-6 w-6 p-0 hover:bg-green-100 text-green-600"
                  >
                    ×
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError(null)}
                    className="ml-2 h-6 w-6 p-0 hover:bg-red-100"
                  >
                    ×
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Resource Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">选择资源:</label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择资源</option>
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {TimeUtils.formatDate(weekDays[0])} - {TimeUtils.formatDate(weekDays[6])}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Summary */}
          {statusSummary && (
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span>未开始: {statusSummary.upcoming}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span>进行中: {statusSummary.active}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span>已完成: {statusSummary.completed}</span>
              </div>
              <span className="text-xs text-gray-400 ml-auto">
                最后更新: {TimeUtils.formatDisplayTime(new Date(statusSummary.last_updated))}
              </span>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>使用说明:</strong> 在空白区域点击并拖拽选择时间段，松开鼠标后确认预约信息。
              <span className="inline-block ml-2">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-1"></span>我的预约
                <span className="inline-block w-3 h-3 bg-red-300 rounded mr-1 ml-3"></span>他人预约
                <span className="inline-block w-3 h-3 bg-green-500 rounded mr-1 ml-3"></span>进行中
              </span>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              ⏰ 页面显示实时时间和时区信息，有预约时会显示下一个任务的倒计时
            </p>
          </div>

          {/* Calendar Grid */}
          {selectedResourceId ? (
            <div 
              ref={calendarRef}
              className="calendar-grid border border-gray-200 rounded-lg overflow-hidden select-none"
              style={{ userSelect: 'none' }}
            >
              {/* Header Row */}
              <div className="grid grid-cols-8 bg-gray-50">
                <div className="p-2 border-r border-gray-200 font-medium text-sm">时间</div>
                {weekDays.map((day, index) => (
                  <div key={index} className="p-2 text-center border-r border-gray-200 font-medium text-sm">
                    <div>{['周一', '周二', '周三', '周四', '周五', '周六', '周日'][index]}</div>
                    <div className="text-xs text-gray-500">{day.getMonth() + 1}/{day.getDate()}</div>
                  </div>
                ))}
              </div>

              {/* Current Resource Display */}
              <div className="grid grid-cols-8 border-t border-gray-200 bg-gray-50">
                <div className="p-2 border-r border-gray-200 text-sm font-medium">
                  <div className="flex items-center space-x-1">
                    <Cpu className="h-3 w-3" />
                    <span>{resources.find(r => r.id === selectedResourceId)?.name}</span>
                  </div>
                </div>
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="border-r border-gray-200"></div>
                ))}
              </div>

              {/* Time slots for selected resource */}
              {timeSlots.map((hour) => (
                <div key={`${selectedResourceId}-${hour}`} className="grid grid-cols-8 border-t border-gray-200">
                  {/* Time label */}
                  <div className="p-1 border-r border-gray-200 bg-gray-50 text-xs text-center flex items-center justify-center">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  
                  {/* Day cells */}
                  {weekDays.map((day, dayIndex) => {
                    const slotBookings = getSlotBookings(selectedResourceId, day, hour);
                    const isInSelection = isInDragSelection(selectedResourceId, day, hour);
                    
                    return (
                      <div
                        key={`${selectedResourceId}-${hour}-${dayIndex}`}
                        className={`
                          relative border-r border-gray-200 h-8 cursor-pointer transition-all duration-150
                          ${slotBookings.length > 0 
                            ? 'bg-gray-50'
                            : 'bg-white hover:bg-gray-100'
                          }
                          ${isInSelection ? 'bg-blue-200 border-blue-400 shadow-inner' : ''}
                          ${isDragging && isInSelection ? 'animate-pulse' : ''}
                        `}
                        onMouseDown={(e) => handleMouseDown(selectedResourceId, day, hour, e)}
                        onMouseEnter={() => handleMouseEnter(selectedResourceId, day, hour)}
                        title={
                          slotBookings.length > 0
                            ? slotBookings.map(b => `${b.taskName} (${b.isOwn ? '我的预约' : '他人预约'})`).join('\n')
                            : `${resources.find(r => r.id === selectedResourceId)?.name} - ${hour}:00`
                        }
                      >
                        {/* Render all bookings for this slot with width distribution */}
                        {slotBookings.length > 0 && (
                          <div className="absolute inset-0 flex gap-px">
                            {slotBookings.map((booking, index) => {
                              const widthPercentage = 100 / slotBookings.length;
                              return (
                                <div
                                  key={booking.id}
                                  className={`${getStatusColor(booking.status, booking.isOwn)} text-white text-xs flex items-center justify-center`}
                                  style={{
                                    width: `${widthPercentage}%`,
                                    zIndex: 10 + index
                                  }}
                                  onClick={() => handleBookingClick && handleBookingClick(booking)}
                                >
                                  <span className="font-medium truncate px-1">
                                    {slotBookings.length === 1 ? booking.taskName : booking.taskName.substring(0, 6)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* 拖拽阴影效果 */}
                        {isInSelection && (
                          <div className="absolute inset-0 bg-blue-300 bg-opacity-30 border border-blue-400" style={{ zIndex: 20 }}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Cpu className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>请选择一个资源查看日历</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Confirmation Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认预约信息</DialogTitle>
            <DialogDescription>
              请确认预约详情并填写任务名称
            </DialogDescription>
          </DialogHeader>
          
          {/* Error Display in Dialog */}
          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{apiError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setApiError(null)}
                    className="ml-2 h-6 w-6 p-0 hover:bg-red-100"
                  >
                    ×
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">资源</label>
              <div className="p-2 bg-gray-50 rounded-md text-sm">
                {resources.find(r => r.id === newBooking.resource_id)?.name || '未选择'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">预约时间</label>
              <div className="space-y-3">
                {/* Start Time */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm w-10">开始:</span>
                  <Select
                    value={newBooking.start_hour.toString()}
                    onValueChange={(value: string) => setNewBooking({...newBooking, start_hour: parseInt(value)})}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 24}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm">:</span>
                  <Select
                    value={newBooking.start_minute.toString()}
                    onValueChange={(value: string) => setNewBooking({...newBooking, start_minute: parseInt(value)})}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 60}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* End Time */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm w-10">结束:</span>
                  <Select
                    value={newBooking.end_hour.toString()}
                    onValueChange={(value: string) => setNewBooking({...newBooking, end_hour: parseInt(value)})}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 24}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm">:</span>
                  <Select
                    value={newBooking.end_minute.toString()}
                    onValueChange={(value: string) => setNewBooking({...newBooking, end_minute: parseInt(value)})}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 60}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Display formatted times */}
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <div>预约时间段: {newBooking.start_hour.toString().padStart(2, '0')}:{newBooking.start_minute.toString().padStart(2, '0')} - {newBooking.end_hour.toString().padStart(2, '0')}:{newBooking.end_minute.toString().padStart(2, '0')}</div>
                  <div className="mt-1">时区: {TimeUtils.getTimezoneInfo().name} ({TimeUtils.getTimezoneInfo().offset})</div>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">资源 *</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newBooking.resource_id}
                onChange={(e) => handleResourceChange(e.target.value)}
              >
                <option value="">选择资源</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} ({resource.total_memory_gb}GB)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">任务名称 *</label>
              <Input
                value={newBooking.task_name}
                onChange={(e) => setNewBooking({...newBooking, task_name: e.target.value})}
                placeholder="请输入任务名称"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">显存需求 (GB)</label>
              <Input
                type="number"
                value={newBooking.estimated_memory_gb}
                onChange={(e) => setNewBooking({...newBooking, estimated_memory_gb: Number(e.target.value) || 1})}
                placeholder="输入显存需求"
                min="1"
                max="1000"
              />
              {newBooking.resource_id && (
                <p className="text-xs text-gray-500 mt-1">
                  所选资源显存: {resources.find(r => r.id === newBooking.resource_id)?.total_memory_gb}GB
                </p>
              )}
            </div>
            <div className="flex space-x-2 pt-4">
              <Button 
                onClick={handleCreateBooking} 
                className="flex-1"
                disabled={!newBooking.resource_id || !newBooking.task_name.trim() || !newBooking.estimated_memory_gb}
              >
                <Check className="h-4 w-4 mr-2" />
                确认预约
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelBooking}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
