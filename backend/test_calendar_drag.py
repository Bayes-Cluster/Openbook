#!/usr/bin/env python3
"""
测试日历拖拽功能 - 验证用户可以在已有预约的时间段进行拖拽选择
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

    print("🎯 设置日历拖拽测试场景...")
    
    # 使用明天上午 9:00-11:00 (用户A占用15GB)
    tomorrow = datetime.utcnow() + timedelta(days=1)
    start_time = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=2)
    
    # 使用第一个可用资源
    resource = db.query(Resource).filter(Resource.is_active == True).first()
    print(f"📊 资源: {resource.name} (总内存: {resource.total_memory_gb}GB)")
    print(f"⏰ 测试时间: {start_time.strftime('%Y-%m-%d %H:%M')} - {end_time.strftime('%Y-%m-%d %H:%M')}")
    
    # 清理可能存在的测试预约
    existing = db.query(Booking).filter(
        Booking.resource_id == resource.id,
        Booking.start_time == start_time,
        Booking.user_id == "drag-test-user"
    ).all()
    for b in existing:
        db.delete(b)
    db.commit()
    
    try:
        # 创建用户A的预约（占用15GB）
        print("\n👤 创建用户A的预约 (15GB)...")
        booking_a = BookingCreate(
            resource_id=resource.id,
            task_name="用户A的机器学习任务",
            estimated_memory_gb=15,
            start_time=start_time,
            end_time=end_time
        )
        db_booking = service.create_booking(booking_a, "drag-test-user")
        print(f"✅ 用户A预约成功: {db_booking.task_name}")
        
        print(f"\n🎯 日历拖拽测试准备完成！")
        print(f"📋 现在测试拖拽功能:")
        print(f"   1. 访问 http://localhost:3000，点击'日历预约'")
        print(f"   2. 选择资源: {resource.name}")
        print(f"   3. 应该可以在红色区域（已有预约）进行拖拽选择")
        print(f"   4. 拖拽选择 {start_time.strftime('%m-%d %H:%M')} - {end_time.strftime('%m-%d %H:%M')} 时间段")
        print(f"   5. 输入9GB以下内存 → 应该成功创建预约")
        print(f"   6. 输入10GB以上内存 → 应该失败并显示'显存不足'")
        print(f"\n💡 修复前: 用户无法在红色区域拖拽")
        print(f"💡 修复后: 用户可以在任何区域拖拽，后端检查内存冲突")
        
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
