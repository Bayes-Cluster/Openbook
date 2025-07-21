"""
路由模块初始化文件

此模块包含了OpenBook API的所有路由定义：
- auth: 用户认证相关路由
- bookings: 预约管理相关路由  
- resources: 资源管理相关路由
- users: 用户管理相关路由
"""

from . import auth, bookings, resources, users

__all__ = ["auth", "bookings", "resources", "users"]
