'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';
import BookingCalendar from '@/components/BookingCalendar';
import { TimeUtils } from '@/lib/timeUtils';
import { 
  Cpu, 
  Calendar, 
  Clock, 
  User, 
  LogOut, 
  Plus, 
  Trash2, 
  Play, 
  Square,
  RotateCcw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Booking {
  id: string;
  task_name: string;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

interface Resource {
  id: string;
  name: string;
  description: string;
  total_memory_gb: number;
  is_active: boolean;
}

interface BookingStats {
  total_bookings: number;
  active_bookings: number;
  upcoming_bookings: number;
  completed_bookings: number;
  total_hours: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'bookings'>('overview');

  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [newBooking, setNewBooking] = useState({
    resource_id: '',
    task_name: '',
    start_time: '',
    end_time: '',
    estimated_memory_gb: 12
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && !apiClient.isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, bookingsData, resourcesData, statsData] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getBookings(),
        apiClient.getResources(),
        apiClient.getUserStats(),
      ]);
      
      setUser(userData);
      setBookings(bookingsData);
      setResources(resourcesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    window.location.href = '/login';
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

  const handleCreateBooking = async () => {
    try {
      // 清除之前的错误信息
      setError(null);
      setBookingError(null);
      
      // Convert local times to UTC for API
      const startTime = TimeUtils.fromDateTimeLocalString(newBooking.start_time);
      const endTime = TimeUtils.fromDateTimeLocalString(newBooking.end_time);
      
      const bookingData = {
        ...newBooking,
        start_time: TimeUtils.toUTCISOString(startTime),
        end_time: TimeUtils.toUTCISOString(endTime)
      };
      
      await apiClient.createBooking(bookingData);
      // 只有成功时才关闭对话框
      setShowBookingDialog(false);
      setNewBooking({ resource_id: '', task_name: '', start_time: '', end_time: '', estimated_memory_gb: 12 });
      setBookingError(null);
      loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建预约失败';
      // 在对话框内显示错误，不关闭对话框
      setBookingError(errorMessage);
      // 同时在页面顶部显示错误
      setError(errorMessage);
      
      console.log('预约创建失败：', errorMessage);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      await apiClient.deleteBooking(bookingId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除预约失败');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'active':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming':
        return '未开始';
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      default:
        return '未知';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RotateCcw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Cpu className="h-8 w-8 text-gray-800" />
            <h1 className="text-2xl font-bold text-gray-900">OpenBook</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="h-4 w-4" />
              <span className="text-sm">{user?.name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Error Alert */}
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

          {/* Tab Navigation */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'overview' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  概览
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'calendar' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  日历预约
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'bookings' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  我的预约
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>总预约数</CardDescription>
                      <CardTitle className="text-3xl">{stats.total_bookings}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>进行中</CardDescription>
                      <CardTitle className="text-3xl text-green-600">{stats.active_bookings}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>待开始</CardDescription>
                      <CardTitle className="text-3xl text-blue-600">{stats.upcoming_bookings}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>总使用时长</CardDescription>
                      <CardTitle className="text-3xl">{Math.round(stats.total_hours)}h</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>快速操作</CardTitle>
                  <CardDescription>选择您要执行的操作</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      onClick={() => setActiveTab('calendar')}
                      className="h-16 flex flex-col space-y-2"
                    >
                      <Calendar className="h-6 w-6" />
                      <span>日历预约</span>
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab('bookings')}
                      className="h-16 flex flex-col space-y-2"
                    >
                      <Clock className="h-6 w-6" />
                      <span>管理预约</span>
                    </Button>
                    <Dialog open={showBookingDialog} onOpenChange={(open) => {
                      setShowBookingDialog(open);
                      if (open) {
                        // 打开对话框时清除错误信息
                        setError(null);
                        setBookingError(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-16 flex flex-col space-y-2"
                        >
                          <Plus className="h-6 w-6" />
                          <span>快速预约</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>创建新预约</DialogTitle>
                          <DialogDescription>选择资源和时间创建新的预约</DialogDescription>
                        </DialogHeader>
                        
                        {/* 对话框内的错误提示 */}
                        {bookingError && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="flex items-center space-x-2 text-red-700">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm">{bookingError}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">资源</label>
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
                            <label className="text-sm font-medium mb-2 block">任务名称</label>
                            <Input
                              value={newBooking.task_name}
                              onChange={(e) => setNewBooking({...newBooking, task_name: e.target.value})}
                              placeholder="输入任务名称"
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
                          <div>
                            <label className="text-sm font-medium mb-2 block">开始时间</label>
                            <Input
                              type="datetime-local"
                              value={newBooking.start_time}
                              onChange={(e) => setNewBooking({...newBooking, start_time: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">结束时间</label>
                            <Input
                              type="datetime-local"
                              value={newBooking.end_time}
                              onChange={(e) => setNewBooking({...newBooking, end_time: e.target.value})}
                            />
                          </div>
                          <Button 
                            onClick={handleCreateBooking} 
                            className="w-full"
                            disabled={!newBooking.resource_id || !newBooking.task_name || !newBooking.start_time || !newBooking.end_time || !newBooking.estimated_memory_gb}
                          >
                            创建预约
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'calendar' && (
            <BookingCalendar onBookingCreated={loadData} />
          )}

          {activeTab === 'bookings' && (
            <>
              {/* Bookings Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span>我的预约</span>
                      </CardTitle>
                      <CardDescription>管理您的GPU资源预约</CardDescription>
                    </div>
                    <Dialog open={showBookingDialog} onOpenChange={(open) => {
                      setShowBookingDialog(open);
                      if (open) {
                        // 打开对话框时清除错误信息
                        setError(null);
                        setBookingError(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          新建预约
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>创建新预约</DialogTitle>
                          <DialogDescription>选择资源和时间创建新的预约</DialogDescription>
                        </DialogHeader>
                        
                        {/* 对话框内的错误提示 */}
                        {bookingError && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="flex items-center space-x-2 text-red-700">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm">{bookingError}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">资源</label>
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
                            <label className="text-sm font-medium mb-2 block">任务名称</label>
                            <Input
                              value={newBooking.task_name}
                              onChange={(e) => setNewBooking({...newBooking, task_name: e.target.value})}
                              placeholder="输入任务名称"
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
                          <div>
                            <label className="text-sm font-medium mb-2 block">开始时间</label>
                            <Input
                              type="datetime-local"
                              value={newBooking.start_time}
                              onChange={(e) => setNewBooking({...newBooking, start_time: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">结束时间</label>
                            <Input
                              type="datetime-local"
                              value={newBooking.end_time}
                              onChange={(e) => setNewBooking({...newBooking, end_time: e.target.value})}
                            />
                          </div>
                          <Button 
                            onClick={handleCreateBooking} 
                            className="w-full"
                            disabled={!newBooking.resource_id || !newBooking.task_name || !newBooking.start_time || !newBooking.end_time || !newBooking.estimated_memory_gb}
                          >
                            创建预约
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {bookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>暂无预约记录</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setActiveTab('calendar')}
                      >
                        去日历预约
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div 
                          key={booking.id} 
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-4">
                            {getStatusIcon(booking.status)}
                            <div>
                              <h4 className="font-medium text-gray-900">{booking.task_name}</h4>
                              <p className="text-sm text-gray-600">{booking.resource_name}</p>
                              <p className="text-xs text-gray-500">
                                {TimeUtils.formatDisplayTime(TimeUtils.fromUTCISOString(booking.start_time))} - {TimeUtils.formatDisplayTime(TimeUtils.fromUTCISOString(booking.end_time))}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              {getStatusText(booking.status)}
                            </span>
                            {booking.status === 'upcoming' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteBooking(booking.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Resources Section - Always visible in overview */}
          {activeTab === 'overview' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5" />
                  <span>可用资源</span>
                </CardTitle>
                <CardDescription>当前可用的GPU资源</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map((resource) => (
                    <div 
                      key={resource.id} 
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <h4 className="font-medium text-gray-900">{resource.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          resource.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {resource.is_active ? '可用' : '不可用'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
