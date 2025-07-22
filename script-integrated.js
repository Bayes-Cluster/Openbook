// 应用状态管理 - 集成后端API
class OpenBookApp {
    constructor() {
        this.currentUser = null;
        this.currentWeek = new Date();
        this.bookings = [];
        this.resources = [];
        this.selectedSlots = [];
        this.isSelecting = false;
        this.selectedExtendHours = 0;
        this.currentManageBooking = null;
        this.userPermissions = null;
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        
        // 首先检查OAuth回调
        const oauthResult = window.apiService.handleOAuthCallback();
        if (oauthResult) {
            if (oauthResult.success) {
                try {
                    await this.loadCurrentUser();
                    this.showMainPage();
                    this.showSuccessMessage('OAuth登录成功！');
                    return;
                } catch (error) {
                    console.error('加载用户信息失败:', error);
                    this.showErrorMessage('加载用户信息失败');
                }
            } else {
                this.showErrorMessage(oauthResult.error);
                this.showPage('loginPage');
                return;
            }
        }
        
        // 检查是否已有token，如果有则尝试自动登录
        if (window.apiService.token) {
            try {
                await this.loadCurrentUser();
                this.showMainPage();
            } catch (error) {
                console.log('自动登录失败:', error);
                window.apiService.clearToken();
                this.showPage('loginPage');
            }
        } else {
            this.showPage('loginPage');
        }
        
        // 加载OAuth提供商信息
        await this.loadOAuthProvider();
    }
    
    // 加载当前用户信息
    async loadCurrentUser() {
        try {
            this.currentUser = await window.apiService.getCurrentUser();
            this.userPermissions = await window.apiService.getUserPermissions();
            this.updateUserDisplay();
        } catch (error) {
            throw error;
        }
    }
    
    // 绑定事件监听器
    bindEvents() {
        // OAuth 登录
        document.getElementById('oauthLogin').addEventListener('click', () => this.handleOAuthLogin());
        
        // 导航按钮
        document.getElementById('goToBooking').addEventListener('click', () => this.showBookingPage());
        document.getElementById('backToMain').addEventListener('click', () => this.showMainPage());
        
        // 退出登录
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('logoutBtnBooking').addEventListener('click', () => this.handleLogout());
        
        // 日历控制
        document.getElementById('prevWeek').addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeek').addEventListener('click', () => this.navigateWeek(1));
        
        // 弹窗控制
        this.bindModalEvents();
        
        // 拖拽选择
        this.bindDragEvents();
    }
    
    // 绑定弹窗事件
    bindModalEvents() {
        // 预约确认弹窗
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal('bookingModal'));
        document.getElementById('cancelBooking').addEventListener('click', () => this.closeModal('bookingModal'));
        document.getElementById('confirmBooking').addEventListener('click', () => this.confirmBooking());
        
        // 管理预约弹窗
        document.getElementById('closeManageModal').addEventListener('click', () => this.closeModal('manageModal'));
        
        // 延长预约弹窗
        document.getElementById('closeExtendModal').addEventListener('click', () => this.closeModal('extendModal'));
        document.getElementById('cancelExtend').addEventListener('click', () => this.closeModal('extendModal'));
        document.getElementById('confirmExtend').addEventListener('click', () => this.confirmExtend());
        
        // 点击弹窗外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }
    
    // 绑定拖拽事件
    bindDragEvents() {
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }
    
    // 处理 OAuth 登录
    async handleOAuthLogin() {
        this.showLoadingMessage('正在重定向到OAuth提供商...');
        
        try {
            // 获取OAuth授权URL
            const response = await window.apiService.getOAuthUrl();
            
            // 重定向到OAuth提供商
            window.location.href = response.oauth_url;
        } catch (error) {
            this.showErrorMessage('获取OAuth URL失败: ' + error.message);
            this.restoreLoginContent();
        }
    }
    
    // 显示加载消息
    showLoadingMessage(message) {
        const loginContent = document.querySelector('.login-content');
        loginContent.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #667eea; margin-bottom: 1rem;"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    // 加载OAuth提供商信息
    async loadOAuthProvider() {
        try {
            const provider = await window.apiService.getOAuthProvider();
            this.updateLoginContent(provider);
        } catch (error) {
            console.error('加载OAuth提供商信息失败:', error);
            // 使用默认登录内容
            this.restoreLoginContent();
        }
    }

    // 更新登录内容显示OAuth提供商
    updateLoginContent(provider) {
        const loginContent = document.querySelector('.login-content');
        const providerIcon = this.getProviderIcon(provider.name);
        
        loginContent.innerHTML = `
            <h2>欢迎使用 OpenBook</h2>
            <p>请通过 ${provider.name} OAuth 登录来访问资源预约功能</p>
            <div class="provider-info">
                <small>当前OAuth提供商: ${provider.name}</small>
            </div>
            <button id="oauthLogin" class="oauth-btn">
                ${providerIcon}
                通过 ${provider.name} 登录
            </button>
        `;
        
        // 重新绑定登录按钮事件
        document.getElementById('oauthLogin').addEventListener('click', () => this.handleOAuthLogin());
    }

    // 获取提供商图标
    getProviderIcon(providerName) {
        const icons = {
            'Google': '<i class="fab fa-google"></i>',
            'GitHub': '<i class="fab fa-github"></i>',
            'GitLab': '<i class="fab fa-gitlab"></i>',
            'Microsoft': '<i class="fab fa-microsoft"></i>',
            'OAuth Provider': '<i class="fas fa-key"></i>'
        };
        return icons[providerName] || '<i class="fas fa-sign-in-alt"></i>';
    }

    // 恢复登录页面内容
    restoreLoginContent() {
        const loginContent = document.querySelector('.login-content');
        loginContent.innerHTML = `
            <h2>欢迎使用 OpenBook</h2>
            <p>请通过 OAuth 登录来访问资源预约功能</p>
            <button id="oauthLogin" class="oauth-btn">
                <i class="fas fa-sign-in-alt"></i>
                通过 OAuth 登录
            </button>
        `;
        
        // 重新绑定登录按钮事件
        document.getElementById('oauthLogin').addEventListener('click', () => this.handleOAuthLogin());
    }
    
    // 处理退出登录
    async handleLogout() {
        try {
            await window.apiService.logout();
        } catch (error) {
            console.error('登出失败:', error);
        } finally {
            this.currentUser = null;
            this.userPermissions = null;
            this.bookings = [];
            this.resources = [];
            this.showPage('loginPage');
            this.restoreLoginContent();
        }
    }
    
    // 显示页面
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }
    
    // 显示主页面
    async showMainPage() {
        this.showPage('mainPage');
        await this.updateMyBookings();
    }
    
    // 显示预约页面
    async showBookingPage() {
        this.showPage('bookingPage');
        await this.loadResources();
        await this.updateCalendar();
    }
    
    // 加载资源列表
    async loadResources() {
        try {
            this.resources = await window.apiService.getResources();
        } catch (error) {
            console.error('加载资源失败:', error);
            this.showErrorMessage('加载资源列表失败');
        }
    }
    
    // 更新用户显示
    updateUserDisplay() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.name;
            document.getElementById('userNameBooking').textContent = this.currentUser.name;
        }
    }
    
    // 更新我的预约列表
    async updateMyBookings() {
        const container = document.getElementById('myBookings');
        
        try {
            const userBookings = await window.apiService.getBookings();
            
            if (userBookings.length === 0) {
                container.innerHTML = '<p style="color: #666; text-align: center; padding: 2rem;">暂无预约记录</p>';
                return;
            }
            
            container.innerHTML = userBookings.map(booking => {
                const status = this.getBookingStatus(booking);
                return `
                    <div class="booking-item">
                        <h4>${booking.task_name}</h4>
                        <p><i class="fas fa-microchip"></i> 资源: ${booking.resource_name}</p>
                        <p><i class="fas fa-clock"></i> ${this.formatDateTime(new Date(booking.start_time))} - ${this.formatDateTime(new Date(booking.end_time))}</p>
                        <span class="booking-status status-${status.class}">${status.text}</span>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('加载预约失败:', error);
            container.innerHTML = `
                <div class="alert alert-destructive">
                    <i class="fas fa-exclamation-circle alert-icon"></i>
                    <div class="alert-content">
                        <div class="alert-title">加载失败</div>
                        <div class="alert-description">无法加载预约信息，请刷新页面重试</div>
                    </div>
                </div>
            `;
        }
    }
    
    // 获取预约状态
    getBookingStatus(booking) {
        const now = new Date();
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);
        
        if (booking.status === 'cancelled') {
            return { class: 'cancelled', text: '已取消' };
        } else if (now < startTime) {
            return { class: 'upcoming', text: '未开始' };
        } else if (now >= startTime && now <= endTime) {
            return { class: 'active', text: '进行中' };
        } else {
            return { class: 'completed', text: '已完成' };
        }
    }
    
    // 日历导航
    navigateWeek(direction) {
        this.currentWeek.setDate(this.currentWeek.getDate() + (direction * 7));
        this.updateCalendar();
    }
    
    // 更新日历
    async updateCalendar() {
        this.updateWeekDisplay();
        await this.generateCalendar();
    }
    
    // 更新周显示
    updateWeekDisplay() {
        const startOfWeek = this.getStartOfWeek(this.currentWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        document.getElementById('currentWeek').textContent = 
            `${this.formatDate(startOfWeek)} - ${this.formatDate(endOfWeek)}`;
    }
    
    // 获取周的开始日期（周一）
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }
    
    // 生成日历
    async generateCalendar() {
        const calendar = document.getElementById('calendar');
        const startOfWeek = this.getStartOfWeek(this.currentWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        
        try {
            // 从后端获取日历数据
            console.log('请求日历数据 - 开始:', startOfWeek.toISOString(), '结束:', endOfWeek.toISOString());
            const calendarData = await window.apiService.getCalendarData(startOfWeek, endOfWeek);
            console.log('收到日历数据:', calendarData);
            console.log('预约槽数量:', calendarData.slots?.length || 0);
            
            // 添加测试数据来验证多任务功能
            const testSlots = [
                {
                    start_time: new Date(startOfWeek.getTime() + 2*24*60*60*1000 + 10*60*60*1000).toISOString(), // 周三 10:00
                    end_time: new Date(startOfWeek.getTime() + 2*24*60*60*1000 + 11*60*60*1000).toISOString(),   // 周三 11:00
                    booking: {
                        id: 'test1',
                        task_name: '深度学习训练',
                        user_id: this.currentUser?.id || 'current_user',
                        status: 'confirmed'
                    }
                },
                {
                    start_time: new Date(startOfWeek.getTime() + 2*24*60*60*1000 + 10*60*60*1000).toISOString(), // 周三 10:00
                    end_time: new Date(startOfWeek.getTime() + 2*24*60*60*1000 + 11*60*60*1000).toISOString(),   // 周三 11:00
                    booking: {
                        id: 'test2',
                        task_name: '数据预处理',
                        user_id: 'other_user',
                        status: 'confirmed'
                    }
                },
                {
                    start_time: new Date(startOfWeek.getTime() + 2*24*60*60*1000 + 10*60*60*1000).toISOString(), // 周三 10:00
                    end_time: new Date(startOfWeek.getTime() + 2*24*60*60*1000 + 11*60*60*1000).toISOString(),   // 周三 11:00
                    booking: {
                        id: 'test3',
                        task_name: '模型验证',
                        user_id: 'another_user',
                        status: 'active'
                    }
                }
            ];
            
            // 将测试数据合并到实际数据中
            const allSlots = [...(calendarData.slots || []), ...testSlots];
            console.log('合并后的槽数量:', allSlots.length);
            
            // 检查是否有预约数据
            if (allSlots.length > 0) {
                const bookingSlots = allSlots.filter(slot => slot.booking);
                console.log('有预约的时间槽:', bookingSlots.length, bookingSlots);
            }
            
            // 生成日历头部
            const header = this.generateCalendarHeader(startOfWeek);
            
            // 生成日历主体
            const body = this.generateCalendarBody(startOfWeek, allSlots);
            
            calendar.innerHTML = header + body;
            
            // 绑定日历单元格事件
            this.bindCalendarEvents();
        } catch (error) {
            console.error('生成日历失败:', error);
            calendar.innerHTML = `
                <div class="alert alert-destructive" style="margin: 2rem;">
                    <i class="fas fa-exclamation-circle alert-icon"></i>
                    <div class="alert-content">
                        <div class="alert-title">日历加载失败</div>
                        <div class="alert-description">无法加载日历数据，请刷新页面重试</div>
                    </div>
                </div>
            `;
        }
    }
    
    // 生成日历头部
    generateCalendarHeader(startOfWeek) {
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        
        let header = '<div class="calendar-header">';
        header += '<div>时间</div>';
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            header += `<div>${days[i]}<br>${this.formatDate(date)}</div>`;
        }
        
        header += '</div>';
        return header;
    }
    
    // 生成日历主体
    generateCalendarBody(startOfWeek, slots) {
        let body = '<div class="calendar-body">';
        
        // 生成时间段（8:00 - 22:00，每小时一行）
        for (let hour = 8; hour < 22; hour++) {
            body += `<div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>`;
            
            // 为每天生成单元格
            for (let day = 0; day < 7; day++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + day);
                date.setHours(hour, 0, 0, 0);
                
                const endDate = new Date(date);
                endDate.setHours(hour + 1);
                
                body += this.generateCalendarCell(date, endDate, day, hour, slots);
            }
        }
        
        body += '</div>';
        return body;
    }
    
    // 生成日历单元格 - 支持多任务并排显示
    generateCalendarCell(startTime, endTime, day, hour, slots) {
        const cellId = `cell-${day}-${hour}`;
        
        // 查找所有重叠的时间段
        const overlappingSlots = slots.filter(s => {
            const slotStart = new Date(s.start_time);
            const slotEnd = new Date(s.end_time);
            
            // 检查时间段是否重叠（允许一定的时间误差）
            const timeDiff = Math.abs(slotStart.getTime() - startTime.getTime());
            return timeDiff < 60000 || // 1分钟误差
                   (slotStart <= startTime && slotEnd > startTime) ||
                   (slotStart < endTime && slotEnd >= endTime) ||
                   (slotStart >= startTime && slotEnd <= endTime);
        });
        
        let cellClass = 'calendar-cell available';
        let cellContent = '';
        
        if (overlappingSlots.length > 0) {
            // 有预约的情况
            const bookings = overlappingSlots.filter(s => s.booking).map(s => s.booking);
            
            if (bookings.length > 0) {
                console.log(`时间段 ${hour}:00 发现 ${bookings.length} 个预约:`, bookings.map(b => b.task_name)); // 调试输出
                
                // 检查是否有我的预约
                const hasMyBooking = bookings.some(booking => booking.user_id === this.currentUser.id);
                
                if (hasMyBooking) {
                    cellClass = 'calendar-cell my-booking-container';
                } else {
                    cellClass = 'calendar-cell booked-container';
                }
                
                // 生成多个任务的HTML
                cellContent = '<div class="booking-tasks-container">';
                bookings.forEach((booking, index) => {
                    const status = this.getBookingStatus(booking);
                    let taskClass, taskText;
                    
                    if (booking.user_id === this.currentUser.id) {
                        taskClass = 'booking-block my-booking';
                        taskText = booking.task_name;
                    } else if (status.class === 'active') {
                        taskClass = 'booking-block in-use';
                        taskText = '使用中';
                    } else {
                        taskClass = 'booking-block booked';
                        taskText = '已预约';
                    }
                    
                    cellContent += `
                        <div class="${taskClass}" data-booking-id="${booking.id}">
                            <span class="task-text">${taskText}</span>
                        </div>
                    `;
                });
                cellContent += '</div>';
                
                console.log(`生成的HTML:`, cellContent); // 调试输出
            } else {
                // 有时间段但没有预约的情况
                cellClass = 'calendar-cell available';
            }
        }
        
        return `<div id="${cellId}" class="${cellClass}" data-start="${startTime.toISOString()}" data-end="${endTime.toISOString()}" data-day="${day}" data-hour="${hour}">${cellContent}</div>`;
    }
    
    // 绑定日历事件
    bindCalendarEvents() {
        document.querySelectorAll('.calendar-cell').forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });
    }
    
    // 处理单元格点击
    handleCellClick(e) {
        const cell = e.currentTarget;
        
        // 检查是否点击在具体的booking-block上
        const clickedBooking = e.target.closest('.booking-block[data-booking-id]');
        if (clickedBooking) {
            const bookingId = clickedBooking.dataset.bookingId;
            this.showManageBookingModal(bookingId);
            return;
        }
        
        // 检查是否有我的预约
        const myBookingBlock = cell.querySelector('.booking-block.my-booking[data-booking-id]');
        if (myBookingBlock) {
            const bookingId = myBookingBlock.dataset.bookingId;
            this.showManageBookingModal(bookingId);
            return;
        }
        
        // 如果有任何预约（包括其他人的预约），不允许新建预约
        if (cell.querySelector('.booking-block')) {
            return;
        }
        
        // 开始选择时间段
        this.startTimeSelection(cell);
    }
    
    // 显示管理预约弹窗
    async showManageBookingModal(bookingId) {
        try {
            const booking = await window.apiService.getBooking(bookingId);
            this.currentManageBooking = booking;
            const status = this.getBookingStatus(booking);
            
            document.getElementById('manageTaskName').textContent = booking.task_name;
            document.getElementById('manageResource').textContent = booking.resource_name;
            document.getElementById('manageStartTime').textContent = this.formatDateTime(new Date(booking.start_time));
            document.getElementById('manageEndTime').textContent = this.formatDateTime(new Date(booking.end_time));
            document.getElementById('manageStatus').textContent = status.text;
            
            // 根据状态生成操作按钮
            const actionsContainer = document.getElementById('manageActions');
            actionsContainer.innerHTML = this.generateManageActions(status.class);
            
            // 绑定操作按钮事件
            this.bindManageActions();
            
            this.showModal('manageModal');
        } catch (error) {
            console.error('加载预约详情失败:', error);
            this.showErrorMessage('加载预约详情失败');
        }
    }
    
    // 生成管理操作按钮
    generateManageActions(status) {
        let actions = '';
        
        if (status === 'upcoming') {
            actions += `
                <button class="manage-btn delete-btn" id="deleteBooking">
                    <i class="fas fa-trash"></i> 删除预约
                </button>
            `;
        } else if (status === 'active') {
            actions += `
                <button class="manage-btn release-btn" id="releaseBooking">
                    <i class="fas fa-unlock"></i> 释放剩余时间
                </button>
                <button class="manage-btn extend-btn" id="extendBooking">
                    <i class="fas fa-plus-circle"></i> 延长预约
                </button>
            `;
        }
        
        return actions;
    }
    
    // 绑定管理操作事件
    bindManageActions() {
        const deleteBtn = document.getElementById('deleteBooking');
        const releaseBtn = document.getElementById('releaseBooking');
        const extendBtn = document.getElementById('extendBooking');
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteBooking());
        }
        
        if (releaseBtn) {
            releaseBtn.addEventListener('click', () => this.releaseBooking());
        }
        
        if (extendBtn) {
            extendBtn.addEventListener('click', () => this.showExtendModal());
        }
    }
    
    // 删除预约
    async deleteBooking() {
        if (confirm('确定要删除这个预约吗？')) {
            try {
                await window.apiService.deleteBooking(this.currentManageBooking.id);
                this.closeModal('manageModal');
                await this.updateCalendar();
                this.showSuccessMessage('预约已删除');
            } catch (error) {
                console.error('删除预约失败:', error);
                this.showErrorMessage('删除预约失败: ' + error.message);
            }
        }
    }
    
    // 释放预约
    async releaseBooking() {
        if (confirm('确定要释放剩余时间吗？')) {
            try {
                await window.apiService.releaseBooking(this.currentManageBooking.id);
                this.closeModal('manageModal');
                await this.updateCalendar();
                this.showSuccessMessage('已释放剩余时间');
            } catch (error) {
                console.error('释放预约失败:', error);
                this.showErrorMessage('释放预约失败: ' + error.message);
            }
        }
    }
    
    // 显示延长预约弹窗
    async showExtendModal() {
        this.closeModal('manageModal');
        
        try {
            const extendLimits = await window.apiService.getExtendLimits();
            this.generateExtendOptions(extendLimits.available_options);
            this.selectedExtendHours = 0;
            this.showModal('extendModal');
        } catch (error) {
            console.error('获取延长限制失败:', error);
            this.showErrorMessage('获取延长选项失败');
        }
    }
    
    // 生成延长选项
    generateExtendOptions(availableOptions) {
        const container = document.getElementById('extendOptions');
        container.innerHTML = availableOptions.map(hours => 
            `<button class="extend-option" data-hours="${hours}">${hours} 小时</button>`
        ).join('');
        
        // 绑定选择事件
        container.querySelectorAll('.extend-option').forEach(option => {
            option.addEventListener('click', (e) => {
                container.querySelectorAll('.extend-option').forEach(opt => opt.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedExtendHours = parseInt(e.target.dataset.hours);
            });
        });
    }
    
    // 确认延长预约
    async confirmExtend() {
        if (this.selectedExtendHours === 0) {
            this.showErrorMessage('请选择延长时长');
            return;
        }
        
        try {
            await window.apiService.extendBooking(this.currentManageBooking.id, this.selectedExtendHours);
            this.closeModal('extendModal');
            await this.updateCalendar();
            this.showSuccessMessage(`预约已延长 ${this.selectedExtendHours} 小时`);
        } catch (error) {
            console.error('延长预约失败:', error);
            this.showErrorMessage('延长预约失败: ' + error.message);
        }
    }
    
    // 开始时间选择
    startTimeSelection(startCell) {
        this.selectedSlots = [startCell];
        this.isSelecting = true;
        startCell.classList.add('selecting');
    }
    
    // 鼠标按下事件
    handleMouseDown(e) {
        if (!e.target.classList.contains('calendar-cell') || 
            !e.target.classList.contains('available')) {
            return;
        }
        
        e.preventDefault();
        this.clearSelection();
        this.startTimeSelection(e.target);
    }
    
    // 鼠标移动事件
    handleMouseMove(e) {
        if (!this.isSelecting || !e.target.classList.contains('calendar-cell')) {
            return;
        }
        
        const currentCell = e.target;
        const startCell = this.selectedSlots[0];
        
        // 检查是否在同一天
        if (currentCell.dataset.day !== startCell.dataset.day) {
            return;
        }
        
        // 更新选择
        this.updateSelection(startCell, currentCell);
    }
    
    // 鼠标抬起事件
    handleMouseUp(e) {
        if (this.isSelecting && this.selectedSlots.length > 0) {
            this.showBookingModal();
        }
        this.isSelecting = false;
    }
    
    // 更新选择范围
    updateSelection(startCell, endCell) {
        this.clearSelection();
        
        const startHour = parseInt(startCell.dataset.hour);
        const endHour = parseInt(endCell.dataset.hour);
        const day = startCell.dataset.day;
        
        const minHour = Math.min(startHour, endHour);
        const maxHour = Math.max(startHour, endHour);
        
        this.selectedSlots = [];
        
        for (let hour = minHour; hour <= maxHour; hour++) {
            const cell = document.getElementById(`cell-${day}-${hour}`);
            if (cell && cell.classList.contains('available')) {
                cell.classList.add('selecting');
                this.selectedSlots.push(cell);
            }
        }
    }
    
    // 清除选择
    clearSelection() {
        document.querySelectorAll('.selecting').forEach(cell => {
            cell.classList.remove('selecting');
        });
        this.selectedSlots = [];
    }
    
    // 显示预约确认弹窗
    showBookingModal() {
        if (this.selectedSlots.length === 0) return;
        
        const startTime = new Date(this.selectedSlots[0].dataset.start);
        const endTime = new Date(this.selectedSlots[this.selectedSlots.length - 1].dataset.end);
        const resource = this.getAvailableResource();
        
        document.getElementById('modalResource').textContent = resource;
        document.getElementById('modalStartTime').textContent = this.formatDateTime(startTime);
        document.getElementById('modalEndTime').textContent = this.formatDateTime(endTime);
        document.getElementById('modalDuration').textContent = `${this.selectedSlots.length} 小时`;
        document.getElementById('taskName').value = '';
        
        this.showModal('bookingModal');
    }
    
    // 获取可用资源
    getAvailableResource() {
        // 简化实现，返回第一个可用资源
        return this.resources.length > 0 ? this.resources[0].name : 'GPU-01';
    }
    
    // 确认预约
    async confirmBooking() {
        const taskName = document.getElementById('taskName').value.trim();
        if (!taskName) {
            this.showErrorMessage('请输入任务名称');
            return;
        }
        
        const startTime = new Date(this.selectedSlots[0].dataset.start);
        const endTime = new Date(this.selectedSlots[this.selectedSlots.length - 1].dataset.end);
        const resourceName = document.getElementById('modalResource').textContent;
        
        // 找到对应的资源ID
        const resource = this.resources.find(r => r.name === resourceName);
        const resourceId = resource ? resource.id : 'gpu-01';
        
        try {
            await window.apiService.createBooking({
                resourceId: resourceId,
                taskName: taskName,
                startTime: startTime,
                endTime: endTime
            });
            
            this.closeModal('bookingModal');
            this.clearSelection();
            await this.updateCalendar();
            this.showSuccessMessage('预约成功！');
        } catch (error) {
            console.error('创建预约失败:', error);
            this.showErrorMessage('预约失败: ' + error.message);
        }
    }
    
    // 显示弹窗
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    // 关闭弹窗
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    // 显示成功消息
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }
    
    // 显示错误消息
    showErrorMessage(message) {
        this.showToast(message, 'error');
    }
    
    // 显示提示消息
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#28a745' : '#dc3545';
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 2000;
            font-weight: bold;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    // 格式化日期时间
    formatDateTime(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    // 格式化日期
    formatDate(date) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}-${day}`;
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    new OpenBookApp();
});
