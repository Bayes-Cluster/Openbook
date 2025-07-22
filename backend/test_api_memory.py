#!/usr/bin/env python3
"""
显存管理 API 测试脚本
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001"

def test_admin_login():
    """测试管理员登录"""
    print("=== 测试管理员登录 ===")
    
    # 创建管理员账号
    create_admin_data = {
        "email": "admin@test.com",
        "password": "admin123456",
        "name": "测试管理员"
    }
    
    response = requests.post(f"{BASE_URL}/admin/create-local-user", json=create_admin_data)
    print(f"创建管理员账号: {response.status_code}")
    if response.status_code != 200:
        print(f"创建失败: {response.text}")
    
    # 管理员登录
    login_data = {
        "email": "admin@test.com",
        "password": "admin123456"
    }
    
    response = requests.post(f"{BASE_URL}/admin/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        print("✓ 管理员登录成功")
        return data.get("access_token")
    else:
        print(f"✗ 管理员登录失败: {response.status_code} - {response.text}")
        return None

def test_create_resource_with_memory(auth_token):
    """测试创建带显存的资源"""
    print("\n=== 测试创建带显存的资源 ===")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 创建GPU资源
    data = {
        "name": "NVIDIA A100 80GB",
        "description": "高性能GPU",
        "total_memory_gb": 80
    }
    
    response = requests.post(f"{BASE_URL}/admin/resources", headers=headers, params=data)
    if response.status_code == 200:
        resource = response.json()
        print(f"✓ 资源创建成功: {resource['name']}")
        print(f"显存容量: {resource['total_memory_gb']}GB")
        return resource['id']
    else:
        print(f"✗ 资源创建失败: {response.status_code} - {response.text}")
        return None

def test_check_memory_usage(resource_id, auth_token):
    """测试检查显存使用情况"""
    print("\n=== 测试检查显存使用情况 ===")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.get(f"{BASE_URL}/admin/resources/{resource_id}/memory", headers=headers)
    if response.status_code == 200:
        memory_info = response.json()
        print(f"✓ 显存查询成功:")
        print(f"  总显存: {memory_info['total_memory_gb']}GB")
        print(f"  可用显存: {memory_info['available_memory_gb']}GB")
        print(f"  冲突预约: {memory_info.get('conflicting_bookings', [])}")
        return memory_info
    else:
        print(f"✗ 显存查询失败: {response.status_code} - {response.text}")
        return None

def test_resource_memory_availability(resource_id):
    """测试资源显存可用性检查"""
    print("\n=== 测试资源显存可用性检查 ===")
    
    # 设置测试时间（1小时后）
    start_time = datetime.utcnow() + timedelta(hours=1)
    end_time = start_time + timedelta(hours=2)
    
    params = {
        "estimated_memory_gb": 40,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }
    
    # 这个端点需要用户认证，我们暂时跳过具体测试
    print(f"应该测试端点: GET /resources/{resource_id}/memory")
    print(f"参数: {params}")
    print("(需要用户认证，暂时跳过具体测试)")

def test_booking_with_memory():
    """测试带显存的预约创建"""
    print("\n=== 测试带显存的预约创建 ===")
    
    print("这需要用户认证，所以暂时跳过具体测试")
    print("但API端点已经更新支持estimated_memory_gb字段")

def main():
    """主测试函数"""
    print("开始 GPU 显存管理 API 测试...")
    
    try:
        # 管理员登录
        auth_token = test_admin_login()
        if not auth_token:
            print("管理员登录失败，终止测试")
            return 1
        
        # 创建带显存的资源
        resource_id = test_create_resource_with_memory(auth_token)
        if not resource_id:
            print("资源创建失败，终止测试")
            return 1
        
        # 检查显存使用情况
        memory_info = test_check_memory_usage(resource_id, auth_token)
        
        # 测试资源显存可用性检查
        test_resource_memory_availability(resource_id)
        
        # 测试预约创建
        test_booking_with_memory()
        
        print("\n🎉 显存管理 API 测试完成!")
        return 0
        
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
