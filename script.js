// 应用状态管理
class OpenBookApp {
    constructor() {
        this.currentUser = null;
        this.currentWeek = new Date();
        this.bookings = this.loadBookings();
        this.resources = ['GPU-01', 'GPU-02', 'GPU-03', 'GPU-04'];
        this.selectedSlots = [];
        this.isSelecting = false;
        this.selectedExtendHours = 0;
        this.currentManageBooking = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.showPage('loginPage');
        this.generateSampleBookings();
    }
    
    // 生成示例数据
    generateSampleBookings() {
        const now = new Date();
        const sampleBookings = [
            {
                id: 'booking_1',
                userId: 'user123',
                resource: 'GPU-01',
                taskName: '深度学习模型训练',
                startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 明天
                endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 明天+3小时
                status: 'upcoming'
            },
            {
                id: 'booking_2',
                userId: 'other_user',
                resource: 'GPU-02',
                taskName: '图像处理任务',
                startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2小时后
                endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4小时后
                status: 'upcoming'
            },
            {
                id: 'booking_3',
                userId: 'user123',
                resource: 'GPU-03',
                taskName: '数据分析',
                startTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1小时前开始
                endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2小时后结束
                status: 'active'
            }
        ];
        
        sampleBookings.forEach(booking => {
            if (!this.bookings.find(b => b.id === booking.id)) {
                this.bookings.push(booking);
            }
        });
        
        this.saveBookings();
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
        
        // 延长时间选择
        document.querySelectorAll('.extend-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.extend-option').forEach(opt => opt.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedExtendHours = parseInt(e.target.dataset.hours);
            });
        });
        
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
    handleOAuthLogin() {
        // 模拟 OAuth 登录流程
        this.showLoadingMessage('正在进行 OAuth 认证...');
        
        setTimeout(() => {
            this.currentUser = {
                id: 'user123',
                name: '张三',
                email: 'zhangsan@example.com',
                group: 'standard' // 用户组，影响延长时间限制
            };
            
            this.showMainPage();
            this.updateUserDisplay();
        }, 1500);
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
    
    // 处理退出登录
    handleLogout() {
        this.currentUser = null;
        this.showPage('loginPage');
        
        // 恢复登录页面内容
        const loginContent = document.querySelector('.login-content');
        loginContent.innerHTML = `
            <h2>欢迎使用 OpenBook</h2>
            <p>请通过 OAuth 登录来访问资源预约功能</p>
            <button id="oauthLogin" class="oauth-btn">
                <i class="fab fa-google"></i>
                通过 OAuth 登录
            </button>
        `;
        
        // 重新绑定登录按钮事件
        document.getElementById('oauthLogin').addEventListener('click', () => this.handleOAuthLogin());
    }
    
    // 显示页面
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }
    
    // 显示主页面
    showMainPage() {
        this.showPage('mainPage');
        this.updateMyBookings();
    }
    
    // 显示预约页面
    showBookingPage() {
        this.showPage('bookingPage');
        this.updateCalendar();
    }
    
    // 更新用户显示
    updateUserDisplay() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.name;
            document.getElementById('userNameBooking').textContent = this.currentUser.name;
        }
    }
    
    // 更新我的预约列表
    updateMyBookings() {
        const container = document.getElementById('myBookings');
        const userBookings = this.bookings.filter(booking => booking.userId === this.currentUser.id);
        
        if (userBookings.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 2rem;">暂无预约记录</p>';
            return;
        }
        
        container.innerHTML = userBookings.map(booking => {
            const status = this.getBookingStatus(booking);
            return `
                <div class="booking-item">
                    <h4>${booking.taskName}</h4>
                    <p><i class="fas fa-microchip"></i> 资源: ${booking.resource}</p>
                    <p><i class="fas fa-clock"></i> ${this.formatDateTime(booking.startTime)} - ${this.formatDateTime(booking.endTime)}</p>
                    <span class="booking-status status-${status.class}">${status.text}</span>
                </div>
            `;
        }).join('');
    }
    
    // 获取预约状态
    getBookingStatus(booking) {
        const now = new Date();
        if (now < booking.startTime) {
            return { class: 'upcoming', text: '未开始' };
        } else if (now >= booking.startTime && now <= booking.endTime) {
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
    updateCalendar() {
        this.updateWeekDisplay();
        this.generateCalendar();
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
    generateCalendar() {
        const calendar = document.getElementById('calendar');
        const startOfWeek = this.getStartOfWeek(this.currentWeek);
        
        // 生成日历头部
        const header = this.generateCalendarHeader(startOfWeek);
        
        // 生成日历主体
        const body = this.generateCalendarBody(startOfWeek);
        
        calendar.innerHTML = header + body;
        
        // 绑定日历单元格事件
        this.bindCalendarEvents();
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
    generateCalendarBody(startOfWeek) {
        let body = '<div class="calendar-body">';
        
        // 生成时间段（8:00 - 22:00，每小时一行）
        for (let hour = 8; hour < 22; hour++) {
            body += `<div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>`;
            
            // 为每个资源在每个时间段生成单元格
            for (let day = 0; day < 7; day++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + day);
                date.setHours(hour, 0, 0, 0);
                
                const endDate = new Date(date);
                endDate.setHours(hour + 1);
                
                body += this.generateCalendarCell(date, endDate, day, hour);
            }
        }
        
        body += '</div>';
        return body;
    }
    
    // 生成日历单元格
    generateCalendarCell(startTime, endTime, day, hour) {
        const cellId = `cell-${day}-${hour}`;
        const booking = this.findBookingForTimeSlot(startTime, endTime);
        
        let cellClass = 'calendar-cell available';
        let cellContent = '';
        
        if (booking) {
            if (booking.userId === this.currentUser.id) {
                cellClass = 'calendar-cell my-booking';
                cellContent = `<div class="booking-block my-booking">${booking.taskName}</div>`;
            } else {
                const status = this.getBookingStatus(booking);
                if (status.class === 'active') {
                    cellClass = 'calendar-cell in-use';
                    cellContent = `<div class="booking-block in-use">使用中</div>`;
                } else {
                    cellClass = 'calendar-cell booked';
                    cellContent = `<div class="booking-block booked">已预约</div>`;
                }
            }
        }
        
        return `<div id="${cellId}" class="${cellClass}" data-start="${startTime.toISOString()}" data-end="${endTime.toISOString()}" data-day="${day}" data-hour="${hour}">${cellContent}</div>`;
    }
    
    // 查找时间段内的预约
    findBookingForTimeSlot(startTime, endTime) {
        return this.bookings.find(booking => {
            return (
                (booking.startTime <= startTime && booking.endTime > startTime) ||
                (booking.startTime < endTime && booking.endTime >= endTime) ||
                (booking.startTime >= startTime && booking.endTime <= endTime)
            );
        });
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
        const startTime = new Date(cell.dataset.start);
        const endTime = new Date(cell.dataset.end);
        
        // 检查是否是我的预约
        const booking = this.findBookingForTimeSlot(startTime, endTime);
        if (booking && booking.userId === this.currentUser.id) {
            this.showManageBookingModal(booking);
            return;
        }
        
        // 如果已被预约，不允许操作
        if (booking) {
            return;
        }
        
        // 开始选择时间段
        this.startTimeSelection(cell);
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
        const resource = this.getAvailableResource(startTime, endTime);
        
        document.getElementById('modalResource').textContent = resource;
        document.getElementById('modalStartTime').textContent = this.formatDateTime(startTime);
        document.getElementById('modalEndTime').textContent = this.formatDateTime(endTime);
        document.getElementById('modalDuration').textContent = `${this.selectedSlots.length} 小时`;
        document.getElementById('taskName').value = '';
        
        this.showModal('bookingModal');
    }
    
    // 获取可用资源
    getAvailableResource(startTime, endTime) {
        for (const resource of this.resources) {
            const hasConflict = this.bookings.some(booking => {
                return booking.resource === resource && 
                       ((booking.startTime <= startTime && booking.endTime > startTime) ||
                        (booking.startTime < endTime && booking.endTime >= endTime) ||
                        (booking.startTime >= startTime && booking.endTime <= endTime));
            });
            
            if (!hasConflict) {
                return resource;
            }
        }
        
        return this.resources[0]; // 默认返回第一个资源
    }
    
    // 确认预约
    confirmBooking() {
        const taskName = document.getElementById('taskName').value.trim();
        if (!taskName) {
            alert('请输入任务名称');
            return;
        }
        
        const startTime = new Date(this.selectedSlots[0].dataset.start);
        const endTime = new Date(this.selectedSlots[this.selectedSlots.length - 1].dataset.end);
        const resource = document.getElementById('modalResource').textContent;
        
        const booking = {
            id: 'booking_' + Date.now(),
            userId: this.currentUser.id,
            resource: resource,
            taskName: taskName,
            startTime: startTime,
            endTime: endTime,
            status: 'upcoming'
        };
        
        this.bookings.push(booking);
        this.saveBookings();
        
        this.closeModal('bookingModal');
        this.clearSelection();
        this.updateCalendar();
        
        this.showSuccessMessage('预约成功！');
    }
    
    // 显示管理预约弹窗
    showManageBookingModal(booking) {
        this.currentManageBooking = booking;
        const status = this.getBookingStatus(booking);
        
        document.getElementById('manageTaskName').textContent = booking.taskName;
        document.getElementById('manageResource').textContent = booking.resource;
        document.getElementById('manageStartTime').textContent = this.formatDateTime(booking.startTime);
        document.getElementById('manageEndTime').textContent = this.formatDateTime(booking.endTime);
        document.getElementById('manageStatus').textContent = status.text;
        
        // 根据状态生成操作按钮
        const actionsContainer = document.getElementById('manageActions');
        actionsContainer.innerHTML = this.generateManageActions(status.class);
        
        // 绑定操作按钮事件
        this.bindManageActions();
        
        this.showModal('manageModal');
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
    deleteBooking() {
        if (confirm('确定要删除这个预约吗？')) {
            this.bookings = this.bookings.filter(b => b.id !== this.currentManageBooking.id);
            this.saveBookings();
            this.closeModal('manageModal');
            this.updateCalendar();
            this.showSuccessMessage('预约已删除');
        }
    }
    
    // 释放预约
    releaseBooking() {
        if (confirm('确定要释放剩余时间吗？')) {
            const booking = this.bookings.find(b => b.id === this.currentManageBooking.id);
            if (booking) {
                booking.endTime = new Date(); // 设置结束时间为当前时间
                this.saveBookings();
                this.closeModal('manageModal');
                this.updateCalendar();
                this.showSuccessMessage('已释放剩余时间');
            }
        }
    }
    
    // 显示延长预约弹窗
    showExtendModal() {
        this.closeModal('manageModal');
        
        // 重置选择
        document.querySelectorAll('.extend-option').forEach(opt => opt.classList.remove('selected'));
        this.selectedExtendHours = 0;
        
        this.showModal('extendModal');
    }
    
    // 确认延长预约
    confirmExtend() {
        if (this.selectedExtendHours === 0) {
            alert('请选择延长时长');
            return;
        }
        
        const booking = this.bookings.find(b => b.id === this.currentManageBooking.id);
        if (booking) {
            const newEndTime = new Date(booking.endTime);
            newEndTime.setHours(newEndTime.getHours() + this.selectedExtendHours);
            
            // 检查延长后是否有冲突
            const hasConflict = this.bookings.some(b => {
                return b.id !== booking.id && 
                       b.resource === booking.resource &&
                       b.startTime < newEndTime && 
                       b.endTime > booking.endTime;
            });
            
            if (hasConflict) {
                alert('延长时间与其他预约冲突，请选择较短的时长');
                return;
            }
            
            booking.endTime = newEndTime;
            this.saveBookings();
            this.closeModal('extendModal');
            this.updateCalendar();
            this.showSuccessMessage(`预约已延长 ${this.selectedExtendHours} 小时`);
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
        // 创建临时提示框
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 2000;
            font-weight: bold;
            animation: slideInRight 0.3s ease;
        `;
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
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
    
    // 加载预约数据
    loadBookings() {
        const saved = localStorage.getItem('openbook_bookings');
        if (saved) {
            return JSON.parse(saved).map(booking => ({
                ...booking,
                startTime: new Date(booking.startTime),
                endTime: new Date(booking.endTime)
            }));
        }
        return [];
    }
    
    // 保存预约数据
    saveBookings() {
        localStorage.setItem('openbook_bookings', JSON.stringify(this.bookings));
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
