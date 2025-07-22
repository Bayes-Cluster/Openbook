#!/usr/bin/env python3
"""
创建初始管理员账号脚本
"""

import sys
import os
from getpass import getpass
from sqlalchemy.orm import Session

# 添加后端目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, create_tables
from auth import create_local_user

def create_admin():
    """创建管理员账号"""
    print("OpenBook 管理员账号创建工具")
    print("=" * 40)
    
    # 确保数据库表存在
    create_tables()
    
    # 获取管理员信息
    name = input("管理员姓名: ").strip()
    if not name:
        print("错误: 姓名不能为空")
        return False
        
    email = input("管理员邮箱: ").strip()
    if not email:
        print("错误: 邮箱不能为空")
        return False
    
    password = getpass("管理员密码: ").strip()
    if not password:
        print("错误: 密码不能为空")
        return False
        
    confirm_password = getpass("确认密码: ").strip()
    if password != confirm_password:
        print("错误: 两次输入的密码不一致")
        return False
    
    # 创建数据库会话
    db = SessionLocal()
    
    try:
        # 创建管理员用户
        user = create_local_user(db, name, email, password, "admin")
        print(f"\n✅ 管理员账号创建成功!")
        print(f"姓名: {user.name}")
        print(f"邮箱: {user.email}")
        print(f"用户组: {user.group}")
        print(f"用户ID: {user.id}")
        print("\n现在可以使用这个账号登录管理面板了。")
        return True
        
    except Exception as e:
        print(f"\n❌ 创建失败: {str(e)}")
        return False
        
    finally:
        db.close()

if __name__ == "__main__":
    success = create_admin()
    sys.exit(0 if success else 1)
