// API服务类
class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:8000/api';
        this.token = localStorage.getItem('openbook_token');
    }

    // 设置认证令牌
    setToken(token) {
        this.token = token;
        localStorage.setItem('openbook_token', token);
    }

    // 清除认证令牌
    clearToken() {
        this.token = null;
        localStorage.removeItem('openbook_token');
    }

    // 获取请求头
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.clearToken();
                    throw new Error('认证失败，请重新登录');
                }
                
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    // GET请求
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    // POST请求
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT请求
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE请求
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // 认证相关API
    async getOAuthUrl() {
        return this.get('/auth/oauth/url');
    }

    async getOAuthProvider() {
        return this.get('/auth/oauth/provider');
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } finally {
            this.clearToken();
        }
    }

    // 处理OAuth回调中的令牌
    handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const status = urlParams.get('status');
        const message = urlParams.get('message');

        if (status === 'success' && token) {
            this.setToken(token);
            // 清除URL参数
            window.history.replaceState({}, document.title, window.location.pathname);
            return { success: true, token };
        } else if (status === 'error') {
            return { success: false, error: message || 'OAuth认证失败' };
        }

        return null;
    }

    // 用户相关API
    async getCurrentUser() {
        return this.get('/users/me');
    }

    async getUserStats() {
        return this.get('/users/me/stats');
    }

    async getUserPermissions() {
        return this.get('/users/me/permissions');
    }

    async getExtendLimits() {
        return this.get('/users/me/extend-limits');
    }

    // 资源相关API
    async getResources() {
        return this.get('/resources/');
    }

    async getResource(resourceId) {
        return this.get(`/resources/${resourceId}`);
    }

    async checkResourceAvailability(resourceId, startTime, endTime) {
        const params = new URLSearchParams({
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
        });
        return this.get(`/resources/${resourceId}/availability?${params}`);
    }

    // 预约相关API
    async getBookings() {
        return this.get('/bookings/');
    }

    async getBooking(bookingId) {
        return this.get(`/bookings/${bookingId}`);
    }

    async createBooking(bookingData) {
        return this.post('/bookings/', {
            resource_id: bookingData.resourceId,
            task_name: bookingData.taskName,
            start_time: bookingData.startTime.toISOString(),
            end_time: bookingData.endTime.toISOString()
        });
    }

    async updateBooking(bookingId, updateData) {
        const data = {};
        if (updateData.taskName) data.task_name = updateData.taskName;
        if (updateData.endTime) data.end_time = updateData.endTime.toISOString();
        
        return this.put(`/bookings/${bookingId}`, data);
    }

    async deleteBooking(bookingId) {
        return this.delete(`/bookings/${bookingId}`);
    }

    async extendBooking(bookingId, hours) {
        return this.post(`/bookings/${bookingId}/extend`, { hours });
    }

    async releaseBooking(bookingId) {
        return this.post(`/bookings/${bookingId}/release`, {});
    }

    async getCalendarData(startDate, endDate) {
        const params = new URLSearchParams({
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        });
        return this.get(`/bookings/calendar/data?${params}`);
    }

    async getWeekCalendar(weekStart = null) {
        if (weekStart) {
            const params = new URLSearchParams({
                week_start: weekStart.toISOString()
            });
            return this.get(`/bookings/calendar/week?${params}`);
        }
        return this.get('/bookings/calendar/week');
    }
}

// 导出API服务实例
window.apiService = new ApiService();
