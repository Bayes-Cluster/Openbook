#!/usr/bin/env python3
"""
测试预约状态自动更新功能
"""

from database import SessionLocal
from services import BookingService
from models import Booking
from datetime import datetime, timedelta

def test_status_update():
    """测试状态更新功能"""
    db = SessionLocal()
    booking_service = BookingService(db)
    
    print("=" * 50)
    print("预约状态更新测试")
    print("=" * 50)
    
    current_time = datetime.utcnow()
    print(f"当前时间: {current_time}")
    
    # 显示当前所有预约的状态
    all_bookings = db.query(Booking).filter(Booking.is_deleted == False).all()
    print(f"\n当前预约总数: {len(all_bookings)}")
    
    for booking in all_bookings:
        print(f"预约 {booking.id[:8]}... - {booking.task_name}")
        print(f"  状态: {booking.status}")
        print(f"  开始时间: {booking.start_time}")
        print(f"  结束时间: {booking.end_time}")
        print(f"  当前时间相对位置: ", end="")
        
        if current_time < booking.start_time:
            print("未开始")
        elif current_time >= booking.start_time and current_time < booking.end_time:
            print("应该进行中")
        else:
            print("应该已完成")
        print()
    
    print("-" * 30)
    print("执行状态更新...")
    
    # 执行状态更新
    updated_count = booking_service.update_booking_statuses()
    print(f"更新了 {updated_count} 个预约的状态")
    
    # 获取状态摘要
    summary = booking_service.get_status_summary()
    print("\n状态摘要:")
    print(f"  未开始: {summary['upcoming']}")
    print(f"  进行中: {summary['active']}")
    print(f"  已完成: {summary['completed']}")
    print(f"  最后更新: {summary['last_updated']}")
    
    print("\n更新后的预约状态:")
    all_bookings = db.query(Booking).filter(Booking.is_deleted == False).all()
    for booking in all_bookings:
        print(f"预约 {booking.id[:8]}... - {booking.task_name} - 状态: {booking.status}")
    
    db.close()
    print("\n测试完成!")

def create_test_booking():
    """创建一个测试预约（过去的时间）来测试状态更新"""
    db = SessionLocal()
    
    try:
        # 创建一个应该已经完成的预约
        past_booking = Booking(
            id="test-booking-" + datetime.now().strftime("%Y%m%d%H%M%S"),
            user_id="admin",
            resource_id="gpu-01",
            task_name="测试预约 - 应该自动完成",
            start_time=datetime.utcnow() - timedelta(hours=2),
            end_time=datetime.utcnow() - timedelta(hours=1),
            status="upcoming"  # 故意设为 upcoming 来测试自动更新
        )
        
        db.add(past_booking)
        db.commit()
        print(f"创建了测试预约: {past_booking.id}")
        return past_booking.id
        
    except Exception as e:
        print(f"创建测试预约失败: {e}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    # 创建测试预约
    test_booking_id = create_test_booking()
    
    if test_booking_id:
        print(f"创建了测试预约 {test_booking_id}")
        print("等待2秒后执行状态更新测试...")
        import time
        time.sleep(2)
    
    # 执行测试
    test_status_update()
