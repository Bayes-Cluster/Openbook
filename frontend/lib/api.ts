const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.loadToken();
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('openbook_token');
    }
  }

  private saveToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('openbook_token', token);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      // FastAPI 返回的错误信息在 detail 字段中
      throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async getOAuthUrl(): Promise<{ oauth_url: string; provider: string; state: string }> {
    return this.request('/auth/oauth/url');
  }

  async handleOAuthCallback(code: string, state: string): Promise<{ access_token: string; user: any }> {
    const result = await this.request<{ access_token: string; user: any }>('/auth/oauth/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
    this.saveToken(result.access_token);
    return result;
  }

  async getCurrentUser(): Promise<any> {
    return this.request('/users/me');
  }

  async getUserStats(): Promise<any> {
    return this.request('/users/me/stats');
  }

  async getUserPermissions(): Promise<any> {
    return this.request('/users/me/permissions');
  }

  // Resources methods
  async getResources(): Promise<any[]> {
    return this.request('/resources/');
  }

  async getResource(resourceId: string): Promise<any> {
    return this.request(`/resources/${resourceId}`);
  }

  // Bookings methods
  async getBookings(): Promise<any[]> {
    return this.request('/bookings/');
  }

  async getBooking(bookingId: string): Promise<any> {
    return this.request(`/bookings/${bookingId}`);
  }

  async createBooking(booking: {
    resource_id: string;
    task_name: string;
    start_time: string;
    end_time: string;
    estimated_memory_gb: number;
  }): Promise<any> {
    return this.request('/bookings/', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  async updateBooking(bookingId: string, updates: any): Promise<any> {
    return this.request(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteBooking(bookingId: string): Promise<any> {
    return this.request(`/bookings/${bookingId}`, {
      method: 'DELETE',
    });
  }

  async extendBooking(bookingId: string, hours: number): Promise<any> {
    return this.request(`/bookings/${bookingId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ hours }),
    });
  }

  async releaseBooking(bookingId: string): Promise<any> {
    return this.request(`/bookings/${bookingId}/release`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getCalendarData(startDate: Date, endDate: Date): Promise<any> {
    const params = new URLSearchParams({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    });
    return this.request(`/bookings/calendar/data?${params}`);
  }

  // 预约状态更新
  async updateBookingStatuses(): Promise<{message: string, updated_count: number}> {
    return this.request('/bookings/update-statuses', {
      method: 'POST',
    });
  }

  async getStatusSummary(): Promise<{upcoming: number, active: number, completed: number, last_updated: string}> {
    return this.request('/bookings/status-summary');
  }

  // 管理员功能
  async adminLogin(email: string, password: string): Promise<{ access_token: string; user: any }> {
    const result = await this.request<{ access_token: string; user: any }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.saveToken(result.access_token);
    return result;
  }

  async getAdminStats(): Promise<{
    total_users: number;
    active_users: number;
    total_resources: number;
    active_resources: number;
    total_bookings: number;
    active_bookings: number;
  }> {
    return this.request('/admin/stats');
  }

  async getAdminUsers(page: number = 1, pageSize: number = 20, search?: string): Promise<{
    users: any[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    return this.request(`/admin/users?${params}`);
  }

  async updateAdminUser(userId: string, data: {
    name?: string;
    email?: string;
    group?: string;
    is_active?: boolean;
  }): Promise<any> {
    return this.request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async disableUser(userId: string): Promise<{message: string}> {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getAdminResources(page: number = 1, pageSize: number = 20, search?: string): Promise<{
    resources: any[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    return this.request(`/admin/resources?${params}`);
  }

  async createResource(name: string, description?: string, totalMemoryGb?: number): Promise<any> {
    const params = new URLSearchParams({ name });
    if (description) {
      params.append('description', description);
    }
    if (totalMemoryGb !== undefined) {
      params.append('total_memory_gb', totalMemoryGb.toString());
    }
    return this.request(`/admin/resources?${params}`, {
      method: 'POST',
    });
  }

  async updateAdminResource(resourceId: string, data: {
    name?: string;
    description?: string;
    is_active?: boolean;
  }): Promise<any> {
    return this.request(`/admin/resources/${resourceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async disableResource(resourceId: string): Promise<{message: string}> {
    return this.request(`/admin/resources/${resourceId}`, {
      method: 'DELETE',
    });
  }

  async createAdminAccount(data: {
    name: string;
    email: string;
    password: string;
    group: string;
  }): Promise<{message: string; data: any}> {
    return this.request('/admin/create-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('openbook_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiClient = new ApiClient();
