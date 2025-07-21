from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_active_user, get_max_extend_hours
from models import User
from schemas import User as UserSchema, BookingStats, SuccessResponse
from services import UserService

router = APIRouter(prefix="/users", tags=["用户管理"])

@router.get("/me", response_model=UserSchema, summary="获取当前用户信息")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """获取当前登录用户的详细信息"""
    return current_user

@router.get("/me/stats", response_model=BookingStats, summary="获取用户统计")
async def get_user_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的预约统计信息"""
    service = UserService(db)
    stats = service.get_user_stats(current_user.id)
    
    return BookingStats(
        total_bookings=stats["total_bookings"],
        active_bookings=stats["active_bookings"],
        upcoming_bookings=stats["upcoming_bookings"],
        completed_bookings=stats["completed_bookings"],
        total_hours=stats["total_hours"],
        used_hours=stats["used_hours"]
    )

@router.get("/me/permissions", summary="获取用户权限信息")
async def get_user_permissions(
    current_user: User = Depends(get_current_active_user)
):
    """获取当前用户的权限和限制信息"""
    max_extend_hours = get_max_extend_hours(current_user)
    
    permissions = {
        "user_group": current_user.group,
        "max_extend_hours": max_extend_hours,
        "can_view_all_bookings": current_user.group in ["admin"],
        "can_manage_resources": current_user.group in ["admin"],
        "can_manage_users": current_user.group in ["admin"]
    }
    
    # 根据用户组设置不同的权限
    if current_user.group == "standard":
        permissions.update({
            "max_booking_duration": 8,  # 最长预约8小时
            "max_advance_days": 7,      # 最多提前7天预约
            "max_concurrent_bookings": 2  # 最多同时2个预约
        })
    elif current_user.group == "premium":
        permissions.update({
            "max_booking_duration": 24,  # 最长预约24小时
            "max_advance_days": 14,      # 最多提前14天预约
            "max_concurrent_bookings": 5  # 最多同时5个预约
        })
    elif current_user.group == "admin":
        permissions.update({
            "max_booking_duration": -1,  # 无限制
            "max_advance_days": -1,      # 无限制
            "max_concurrent_bookings": -1  # 无限制
        })
    
    return {
        "user_id": current_user.id,
        "user_name": current_user.name,
        "permissions": permissions
    }

@router.put("/me/profile", response_model=UserSchema, summary="更新用户资料")
async def update_user_profile(
    name: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新当前用户的基本资料"""
    if name is not None and name.strip():
        current_user.name = name.strip()
        db.commit()
        db.refresh(current_user)
    
    return current_user

@router.get("/me/extend-limits", summary="获取延长时间限制")
async def get_extend_limits(
    current_user: User = Depends(get_current_active_user)
):
    """获取当前用户的延长时间限制"""
    max_hours = get_max_extend_hours(current_user)
    
    # 生成可选的延长时间选项
    available_options = []
    for hours in range(1, max_hours + 1):
        if hours <= 4:  # 前4小时每小时一个选项
            available_options.append(hours)
        elif hours <= 8 and hours % 2 == 0:  # 5-8小时每2小时一个选项
            available_options.append(hours)
        elif hours <= 24 and hours % 4 == 0:  # 9-24小时每4小时一个选项
            available_options.append(hours)
    
    return {
        "user_group": current_user.group,
        "max_extend_hours": max_hours,
        "available_options": available_options,
        "description": f"您的用户组（{current_user.group}）最多可以延长 {max_hours} 小时"
    }
