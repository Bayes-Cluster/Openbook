'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';
import { 
  Users, 
  Cpu, 
  Calendar, 
  Activity,
  Settings,
  LogOut,
  Search,
  Plus,
  Edit2,
  Power,
  Shield,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface AdminStats {
  total_users: number;
  active_users: number;
  total_resources: number;
  active_resources: number;
  total_bookings: number;
  active_bookings: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  group: string;
  is_active: boolean;
  created_at: string;
}

interface Resource {
  id: string;
  name: string;
  description?: string;
  total_memory_gb: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'resources'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 新建资源状态
  const [showCreateResource, setShowCreateResource] = useState(false);
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceDesc, setNewResourceDesc] = useState('');
  const [newResourceMemory, setNewResourceMemory] = useState(24);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载统计信息
      const statsData = await apiClient.getAdminStats();
      setStats(statsData);

      // 根据活跃标签加载相应数据
      if (activeTab === 'users') {
        const usersData = await apiClient.getAdminUsers(1, 50, searchTerm);
        setUsers(usersData.users);
      } else if (activeTab === 'resources') {
        const resourcesData = await apiClient.getAdminResources(1, 50, searchTerm);
        setResources(resourcesData.resources);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await apiClient.updateAdminUser(userId, updates);
      await loadData(); // 重新加载数据
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新用户失败');
    }
  };

  const handleDisableUser = async (userId: string) => {
    if (confirm('确定要禁用这个用户吗？')) {
      try {
        await apiClient.disableUser(userId);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : '禁用用户失败');
      }
    }
  };

  const handleCreateResource = async () => {
    if (!newResourceName.trim()) return;
    
    try {
      await apiClient.createResource(newResourceName, newResourceDesc, newResourceMemory);
      setNewResourceName('');
      setNewResourceDesc('');
      setNewResourceMemory(24);
      setShowCreateResource(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建资源失败');
    }
  };

  const handleUpdateResource = async (resourceId: string, updates: Partial<Resource>) => {
    try {
      await apiClient.updateAdminResource(resourceId, updates);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新资源失败');
    }
  };

  const handleDisableResource = async (resourceId: string) => {
    if (confirm('确定要禁用这个资源吗？')) {
      try {
        await apiClient.disableResource(resourceId);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : '禁用资源失败');
      }
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    window.location.href = '/admin/login';
  };

  const handleSearch = async () => {
    await loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">OpenBook 管理面板</h1>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
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

        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-8">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
          >
            <Activity className="h-4 w-4 mr-2" />
            概览
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'outline'}
            onClick={() => setActiveTab('users')}
          >
            <Users className="h-4 w-4 mr-2" />
            用户管理
          </Button>
          <Button
            variant={activeTab === 'resources' ? 'default' : 'outline'}
            onClick={() => setActiveTab('resources')}
          >
            <Cpu className="h-4 w-4 mr-2" />
            资源管理
          </Button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总用户数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_users}</div>
                <p className="text-xs text-muted-foreground">
                  活跃: {stats.active_users}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总资源数</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_resources}</div>
                <p className="text-xs text-muted-foreground">
                  可用: {stats.active_resources}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总预约数</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_bookings}</div>
                <p className="text-xs text-muted-foreground">
                  活跃: {stats.active_bookings}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索用户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={handleSearch}>搜索</Button>
            </div>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>用户列表</CardTitle>
                <CardDescription>管理所有用户账号</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">
                          用户组: {user.group} | 状态: {user.is_active ? '活跃' : '禁用'}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Select 
                          value={user.group} 
                          onValueChange={(value) => handleUpdateUser(user.id, { group: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant={user.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleUpdateUser(user.id, { is_active: !user.is_active })}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {/* Search and Create */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索资源..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={handleSearch}>搜索</Button>
              <Button onClick={() => setShowCreateResource(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新建资源
              </Button>
            </div>

            {/* Create Resource Form */}
            {showCreateResource && (
              <Card>
                <CardHeader>
                  <CardTitle>创建新资源</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="资源名称"
                    value={newResourceName}
                    onChange={(e) => setNewResourceName(e.target.value)}
                  />
                  <Input
                    placeholder="资源描述（可选）"
                    value={newResourceDesc}
                    onChange={(e) => setNewResourceDesc(e.target.value)}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">显存容量 (GB)</label>
                    <Input
                      type="number"
                      placeholder="24"
                      value={newResourceMemory}
                      onChange={(e) => setNewResourceMemory(Number(e.target.value) || 24)}
                      min="1"
                      max="1000"
                    />
                    <p className="text-xs text-gray-500">默认为 24GB，可根据实际GPU配置调整</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleCreateResource}>创建</Button>
                    <Button variant="outline" onClick={() => setShowCreateResource(false)}>
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resources List */}
            <Card>
              <CardHeader>
                <CardTitle>资源列表</CardTitle>
                <CardDescription>管理所有系统资源</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{resource.name}</div>
                        <div className="text-sm text-gray-500">{resource.description}</div>
                        <div className="text-sm text-blue-600 font-medium">
                          显存: {resource.total_memory_gb}GB
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {resource.id} | 状态: {resource.is_active ? '可用' : '禁用'}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant={resource.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleUpdateResource(resource.id, { is_active: !resource.is_active })}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
