from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

from database import get_db
from auth import get_current_active_user, check_user_permissions
from models import User
from schemas import Resource, ResourceStats, SuccessResponse
from services import ResourceService

router = APIRouter(prefix="/resources", tags=["资源管理"])

@router.get("/", response_model=List[Resource], summary="获取资源列表")
async def get_resources(
    active_only: bool = Query(True, description="仅返回活跃资源"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取所有可用的GPU资源"""
    service = ResourceService(db)
    resources = service.get_resources(active_only=active_only)
    return resources

@router.get("/{resource_id}", response_model=Resource, summary="获取资源详情")
async def get_resource(
    resource_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取指定资源的详细信息"""
    service = ResourceService(db)
    resource = service.get_resource(resource_id)
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在"
        )
    
    return resource

@router.get("/{resource_id}/stats", response_model=ResourceStats, summary="获取资源统计")
async def get_resource_stats(
    resource_id: str,
    start_date: datetime = Query(..., description="统计开始日期"),
    end_date: datetime = Query(..., description="统计结束日期"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取资源使用统计"""
    # 验证日期范围
    if start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="开始日期必须早于结束日期"
        )
    
    # 限制查询范围（最多一年）
    max_range = timedelta(days=365)
    if end_date - start_date > max_range:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="查询范围不能超过一年"
        )
    
    service = ResourceService(db)
    resource = service.get_resource(resource_id)
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在"
        )
    
    stats = service.get_resource_stats(resource_id, start_date, end_date)
    
    return ResourceStats(
        resource_id=resource_id,
        resource_name=resource.name,
        total_bookings=stats["total_bookings"],
        utilization_rate=stats["utilization_rate"],
        total_hours=stats["total_hours"]
    )

@router.get("/{resource_id}/availability", summary="检查资源可用性")
async def check_resource_availability(
    resource_id: str,
    start_time: datetime = Query(..., description="检查开始时间"),
    end_time: datetime = Query(..., description="检查结束时间"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """检查资源在指定时间段的可用性"""
    # 验证时间范围
    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="开始时间必须早于结束时间"
        )
    
    if start_time < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能查询过去的时间"
        )
    
    service = ResourceService(db)
    resource = service.get_resource(resource_id)
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在"
        )
    
    # 检查是否有冲突的预约
    from services import BookingService
    booking_service = BookingService(db)
    has_conflict = booking_service._has_time_conflict(resource_id, start_time, end_time)
    
    return {
        "resource_id": resource_id,
        "resource_name": resource.name,
        "start_time": start_time,
        "end_time": end_time,
        "is_available": not has_conflict,
        "duration_hours": (end_time - start_time).total_seconds() / 3600
    }
