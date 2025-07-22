// 模拟多任务数据的测试脚本
console.log('开始多任务测试...');

// 创建测试数据
const testSlots = [
    {
        start_time: '2025-07-22T10:00:00Z',
        end_time: '2025-07-22T11:00:00Z',
        booking: {
            id: 1,
            task_name: '深度学习训练',
            user_id: 'user1'
        }
    },
    {
        start_time: '2025-07-22T10:00:00Z',
        end_time: '2025-07-22T11:00:00Z',
        booking: {
            id: 2,
            task_name: '数据预处理',
            user_id: 'user2'
        }
    },
    {
        start_time: '2025-07-22T10:00:00Z',
        end_time: '2025-07-22T11:00:00Z',
        booking: {
            id: 3,
            task_name: '模型验证',
            user_id: 'user3'
        }
    }
];

// 创建一个简单的测试单元格
function createTestCell() {
    const container = document.createElement('div');
    container.style.cssText = `
        width: 200px;
        height: 60px;
        border: 1px solid #ddd;
        margin: 20px;
        position: relative;
        background: #f0f8ff;
    `;
    
    const tasksContainer = document.createElement('div');
    tasksContainer.className = 'booking-tasks-container';
    
    testSlots.forEach(slot => {
        const booking = slot.booking;
        const taskBlock = document.createElement('div');
        taskBlock.className = 'booking-block my-booking';
        taskBlock.dataset.bookingId = booking.id;
        
        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = booking.task_name;
        
        taskBlock.appendChild(taskText);
        tasksContainer.appendChild(taskBlock);
    });
    
    container.appendChild(tasksContainer);
    return container;
}

// 添加测试单元格到页面
document.addEventListener('DOMContentLoaded', () => {
    const testContainer = document.createElement('div');
    testContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 9999;
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    const title = document.createElement('h3');
    title.textContent = '多任务测试';
    title.style.margin = '0 0 10px 0';
    
    testContainer.appendChild(title);
    testContainer.appendChild(createTestCell());
    
    document.body.appendChild(testContainer);
    
    console.log('测试单元格已添加到页面');
});
