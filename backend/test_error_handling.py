#!/usr/bin/env python3
"""
快速测试预约冲突错误返回
"""

import sys
sys.path.append('.')

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import Base, Resource, Booking
from schemas import BookingCreate
from services import BookingService
from datetime import datetime, timedelta

def main():
    # 连接数据库
    engine = create_engine('sqlite:///openbook.db')
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # 创建测试服务
    service = BookingService(db)

    print("🔧 设置冲突测试场景...")
    
    # 使用明天上午 10:00-12:00
    tomorrow = datetime.utcnow() + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=2)
    
    # 使用第一个可用资源
    resource = db.query(Resource).filter(Resource.is_active == True).first()
    print(f"📊 资源: {resource.name} (总内存: {resource.total_memory_gb}GB)")
    print(f"⏰ 测试时间: {start_time.strftime('%Y-%m-%d %H:%M')} - {end_time.strftime('%Y-%m-%d %H:%M')}")
    
    # 清理可能存在的测试预约
    existing = db.query(Booking).filter(
        Booking.resource_id == resource.id,
        Booking.start_time == start_time,
        Booking.user_id == "conflict-test-user"
    ).all()
    for b in existing:
        db.delete(b)
    db.commit()
    
    try:
        # 创建一个占用 20GB 的预约
        print("\n👤 创建 20GB 预约...")
        booking1 = BookingCreate(
            resource_id=resource.id,
            task_name="冲突测试预约",
            estimated_memory_gb=20,
            start_time=start_time,
            end_time=end_time
        )
        db_booking = service.create_booking(booking1, "conflict-test-user")
        print(f"✅ 预约成功: {db_booking.task_name} (20GB)")
        
        print(f"\n📋 现在可以测试前端:")
        print(f"   1. 访问 http://localhost:3000")
        print(f"   2. 尝试预约相同时间段 ({start_time.strftime('%m-%d %H:%M')} - {end_time.strftime('%m-%d %H:%M')})")
        print(f"   3. 选择资源: {resource.name}")
        print(f"   4. 输入 5GB 或更多显存 → 应该失败并显示详细错误信息")
        print(f"   5. 输入 4GB 或以下显存 → 应该成功")
        print(f"\n💡 修复内容:")
        print(f"   - 错误信息现在会正确显示后端返回的 'detail' 字段")
        print(f"   - 预约失败时对话框保持打开，错误信息显示在对话框内")
        print(f"   - 页面顶部也会显示错误信息，并可以手动关闭")
        
        input("\n按回车键清理测试数据...")
        
        # 清理
        db.delete(db_booking)
        db.commit()
        print("✅ 清理完成")
        
    except Exception as e:
        print(f"❌ 设置失败: {e}")
        
    db.close()

if __name__ == "__main__":
    main()
