#!/usr/bin/env python3
"""
显存管理功能测试脚本
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Base, User, Resource, Booking
from services import BookingService, AdminService
from schemas import BookingCreate

# 数据库设置
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_memory.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def setup_test_data():
    """设置测试数据"""
    print("正在设置测试数据...")
    
    # 创建数据库表
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 创建测试用户
        user = User(
            id="test_user_001",
            email="test@example.com",
            name="测试用户",
            group="phd_student",
            is_active=True
        )
        db.add(user)
        
        # 创建测试资源
        resource = Resource(
            id="gpu_001",
            name="NVIDIA A100",
            description="80GB GPU",
            total_memory_gb=80,  # 80GB显存
            is_active=True
        )
        db.add(resource)
        
        db.commit()
        print("测试数据设置完成!")
        return user.id, resource.id
        
    finally:
        db.close()

def test_memory_availability():
    """测试显存可用性检查"""
    print("\n=== 测试显存可用性检查 ===")
    
    db = SessionLocal()
    try:
        booking_service = BookingService(db)
        
        # 测试1：检查初始可用显存
        print("测试1：检查初始可用显存")
        memory_info = booking_service._check_memory_availability("gpu_001")
        print(f"总显存: {memory_info['total_memory_gb']}GB")
        print(f"可用显存: {memory_info['available_memory_gb']}GB")
        print(f"已用显存: {memory_info['used_memory_gb']}GB")
        
        assert memory_info['total_memory_gb'] == 80
        assert memory_info['available_memory_gb'] == 80
        assert memory_info['used_memory_gb'] == 0
        print("✓ 初始状态检查通过")
        
        # 测试2：检查特定时间段的可用性
        print("\n测试2：检查特定时间段的可用性")
        start_time = datetime.utcnow() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        memory_info = booking_service._check_memory_availability(
            "gpu_001", start_time, end_time, 40  # 需要40GB
        )
        print(f"可用显存: {memory_info['available_memory_gb']}GB")
        print(f"是否可预约40GB: {memory_info['can_book']}")
        
        assert memory_info['can_book'] == True
        print("✓ 时间段可用性检查通过")
        
    finally:
        db.close()

def test_booking_creation():
    """测试预约创建和显存分配"""
    print("\n=== 测试预约创建和显存分配 ===")
    
    db = SessionLocal()
    try:
        booking_service = BookingService(db)
        
        # 创建第一个预约（30GB）
        print("测试1：创建第一个预约（30GB）")
        start_time = datetime.utcnow() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        booking1 = BookingCreate(
            resource_id="gpu_001",
            task_name="深度学习训练1",
            estimated_memory_gb=30,
            start_time=start_time,
            end_time=end_time
        )
        
        created_booking1 = booking_service.create_booking(booking1, "test_user_001")
        print(f"✓ 预约1创建成功，ID: {created_booking1.id}")
        
        # 检查显存使用情况
        memory_info = booking_service._check_memory_availability("gpu_001", start_time, end_time)
        print(f"预约后可用显存: {memory_info['available_memory_gb']}GB")
        assert memory_info['available_memory_gb'] == 50  # 80-30=50
        
        # 创建第二个预约（40GB）
        print("\n测试2：创建第二个预约（40GB）")
        booking2 = BookingCreate(
            resource_id="gpu_001",
            task_name="深度学习训练2",
            estimated_memory_gb=40,
            start_time=start_time,
            end_time=end_time
        )
        
        created_booking2 = booking_service.create_booking(booking2, "test_user_001")
        print(f"✓ 预约2创建成功，ID: {created_booking2.id}")
        
        # 检查显存使用情况
        memory_info = booking_service._check_memory_availability("gpu_001", start_time, end_time)
        print(f"两个预约后可用显存: {memory_info['available_memory_gb']}GB")
        assert memory_info['available_memory_gb'] == 10  # 80-30-40=10
        
        # 尝试创建第三个预约（20GB） - 应该失败
        print("\n测试3：尝试创建超出容量的预约（20GB）")
        booking3 = BookingCreate(
            resource_id="gpu_001",
            task_name="深度学习训练3",
            estimated_memory_gb=20,
            start_time=start_time,
            end_time=end_time
        )
        
        try:
            booking_service.create_booking(booking3, "test_user_001")
            print("✗ 预约3不应该创建成功!")
            assert False, "应该抛出显存不足的异常"
        except ValueError as e:
            print(f"✓ 预约3正确被拒绝: {str(e)}")
            assert "显存不足" in str(e)
        
    finally:
        db.close()

def test_admin_resource_creation():
    """测试管理员创建带显存的资源"""
    print("\n=== 测试管理员创建带显存的资源 ===")
    
    db = SessionLocal()
    try:
        admin_service = AdminService(db)
        
        # 创建新资源
        resource = admin_service.create_resource(
            "gpu_002", 
            "NVIDIA V100 32GB", 
            32.0
        )
        
        print(f"✓ 资源创建成功: {resource.name}")
        print(f"显存容量: {resource.total_memory_gb}GB")
        
        assert resource.total_memory_gb == 32
        print("✓ 显存容量设置正确")
        
    finally:
        db.close()

def main():
    """主测试函数"""
    print("开始显存管理功能测试...")
    
    try:
        # 设置测试数据
        user_id, resource_id = setup_test_data()
        
        # 运行测试
        test_memory_availability()
        test_booking_creation()
        test_admin_resource_creation()
        
        print("\n🎉 所有测试通过!")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    finally:
        # 清理测试数据库
        if os.path.exists("test_memory.db"):
            os.remove("test_memory.db")
            print("测试数据库已清理")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
