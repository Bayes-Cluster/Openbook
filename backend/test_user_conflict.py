#!/usr/bin/env python3
"""
测试用户预约冲突检测的演示脚本
这个脚本将创建一个真实的冲突场景供前端测试
"""

import sys
sys.path.append('.')

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import Base, Resource, Booking, User
from schemas import BookingCreate
from services import BookingService
from datetime import datetime, timedelta
import uuid

def main():
    # 连接数据库
    engine = create_engine('sqlite:///openbook.db')
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # 创建测试服务
    service = BookingService(db)

    print("🔧 准备冲突测试场景...")
    
    # 清理旧的测试数据
    test_bookings = db.query(Booking).filter(
        Booking.task_name.like('%测试任务%')
    ).all()
    for booking in test_bookings:
        db.delete(booking)
    db.commit()
    
    # 设置测试时间（明天上午9点到下午6点）
    tomorrow = datetime.utcnow() + timedelta(days=1)
    start_time = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=9)  # 9小时
    
    # 使用第一个可用资源
    resource = db.query(Resource).filter(Resource.is_active == True).first()
    if not resource:
        print("❌ 没有找到可用资源")
        return
    
    print(f"📊 资源信息: {resource.name} (总内存: {resource.total_memory_gb}GB)")
    print(f"⏰ 测试时间段: {start_time.strftime('%Y-%m-%d %H:%M')} - {end_time.strftime('%Y-%m-%d %H:%M')}")
    
    try:
        # 创建用户A的预约（占用18GB）
        print(f"\n👤 用户A创建预约 (18GB)...")
        booking_a = BookingCreate(
            resource_id=resource.id,
            task_name="用户A的深度学习训练任务",
            estimated_memory_gb=18,
            start_time=start_time,
            end_time=end_time
        )
        db_booking_a = service.create_booking(booking_a, "user-a-test")
        print(f"✅ 用户A预约成功: ID {db_booking_a.id[:8]}...")
        
        # 现在如果用户B尝试预约相同时间段，应该能成功预约6GB，但无法预约7GB或更多
        
        # 检查可用内存
        memory_check = service._check_memory_availability(
            resource.id, start_time, end_time
        )
        
        print(f"\n📈 当前内存状态:")
        print(f"   总内存: {memory_check['total_memory_gb']}GB")
        print(f"   已使用: {memory_check['used_memory_gb']}GB") 
        print(f"   可用: {memory_check['available_memory_gb']}GB")
        
        print(f"\n🎯 测试场景已准备完成！")
        print(f"📋 现在您可以在前端尝试以下操作：")
        print(f"   1. 预约相同时间段 ≤ 6GB 的任务 → 应该成功")
        print(f"   2. 预约相同时间段 ≥ 7GB 的任务 → 应该失败并显示内存不足错误")
        print(f"   3. 预约不同时间段的任务 → 应该成功（不论内存大小）")
        print(f"\n🌐 请访问 http://localhost:3000 进行测试")
        print(f"💡 错误信息应该显示在页面顶部的红色区域中")
        
        # 保持预约用于测试
        input("\n按回车键清理测试数据...")
        
    except Exception as e:
        print(f"❌ 创建测试场景失败: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # 清理测试数据
        print("🧹 清理测试数据...")
        test_bookings = db.query(Booking).filter(
            Booking.task_name.like('%测试任务%')
        ).all()
        for booking in test_bookings:
            db.delete(booking)
        
        # 清理用户A的预约
        user_a_bookings = db.query(Booking).filter(
            Booking.user_id == "user-a-test"
        ).all()
        for booking in user_a_bookings:
            db.delete(booking)
            
        db.commit()
        print("✅ 清理完成")
        
    db.close()

if __name__ == "__main__":
    main()
