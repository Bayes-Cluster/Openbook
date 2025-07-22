from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional

from database import get_db
from auth import get_current_active_user
from models import User
from schemas import (
    Booking, BookingCreate, BookingUpdate, BookingExtend, BookingRelease,
    BookingResponse, CalendarResponse, SuccessResponse, ErrorResponse
)
from services import BookingService

router = APIRouter(prefix="/bookings", tags=["预约管理"])

@router.get("/", response_model=List[BookingResponse], summary="获取预约列表")
async def get_bookings(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回的记录数"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的预约列表"""
    service = BookingService(db)
    bookings = service.get_bookings(user_id=current_user.id, skip=skip, limit=limit)
    
    return [
        BookingResponse(
            id=booking.id,
            user_id=booking.user_id,
            resource_id=booking.resource_id,
            resource_name=booking.resource.name,
            task_name=booking.task_name,
            estimated_memory_gb=booking.estimated_memory_gb,
            start_time=booking.start_time,
            end_time=booking.end_time,
            original_end_time=booking.original_end_time,
            status=booking.status,
            created_at=booking.created_at,
            updated_at=booking.updated_at
        )
        for booking in bookings
    ]

@router.post("/", response_model=BookingResponse, summary="创建预约")
async def create_booking(
    booking: BookingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建新的资源预约"""
    service = BookingService(db)
    
    try:
        db_booking = service.create_booking(booking, current_user.id)
        
        return BookingResponse(
            id=db_booking.id,
            user_id=db_booking.user_id,
            resource_id=db_booking.resource_id,
            resource_name=db_booking.resource.name,
            task_name=db_booking.task_name,
            estimated_memory_gb=db_booking.estimated_memory_gb,
            start_time=db_booking.start_time,
            end_time=db_booking.end_time,
            original_end_time=db_booking.original_end_time,
            status=db_booking.status,
            created_at=db_booking.created_at,
            updated_at=db_booking.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{booking_id}", response_model=BookingResponse, summary="获取预约详情")
async def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取指定预约的详情"""
    service = BookingService(db)
    booking = service.get_booking(booking_id, current_user.id)
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="预约不存在"
        )
    
    return BookingResponse(
        id=booking.id,
        user_id=booking.user_id,
        resource_id=booking.resource_id,
        resource_name=booking.resource.name,
        task_name=booking.task_name,
        estimated_memory_gb=booking.estimated_memory_gb,
        start_time=booking.start_time,
        end_time=booking.end_time,
        original_end_time=booking.original_end_time,
        status=booking.status,
        created_at=booking.created_at,
        updated_at=booking.updated_at
    )

@router.put("/{booking_id}", response_model=BookingResponse, summary="更新预约")
async def update_booking(
    booking_id: str,
    booking_update: BookingUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新预约信息（仅限未开始的预约）"""
    service = BookingService(db)
    
    try:
        updated_booking = service.update_booking(booking_id, booking_update, current_user.id)
        
        if not updated_booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="预约不存在"
            )
        
        return BookingResponse(
            id=updated_booking.id,
            user_id=updated_booking.user_id,
            resource_id=updated_booking.resource_id,
            resource_name=updated_booking.resource.name,
            task_name=updated_booking.task_name,
            estimated_memory_gb=updated_booking.estimated_memory_gb,
            start_time=updated_booking.start_time,
            end_time=updated_booking.end_time,
            original_end_time=updated_booking.original_end_time,
            status=updated_booking.status,
            created_at=updated_booking.created_at,
            updated_at=updated_booking.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{booking_id}", response_model=SuccessResponse, summary="删除预约")
async def delete_booking(
    booking_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除预约（仅限未开始的预约）"""
    service = BookingService(db)
    
    try:
        success = service.delete_booking(booking_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="预约不存在"
            )
        
        return SuccessResponse(message="预约已删除")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{booking_id}/extend", response_model=BookingResponse, summary="延长预约")
async def extend_booking(
    booking_id: str,
    extend_data: BookingExtend,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """延长正在进行的预约"""
    service = BookingService(db)
    
    try:
        extended_booking = service.extend_booking(booking_id, extend_data, current_user)
        
        if not extended_booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="预约不存在"
            )
        
        return BookingResponse(
            id=extended_booking.id,
            user_id=extended_booking.user_id,
            resource_id=extended_booking.resource_id,
            resource_name=extended_booking.resource.name,
            task_name=extended_booking.task_name,
            estimated_memory_gb=extended_booking.estimated_memory_gb,
            start_time=extended_booking.start_time,
            end_time=extended_booking.end_time,
            original_end_time=extended_booking.original_end_time,
            status=extended_booking.status,
            created_at=extended_booking.created_at,
            updated_at=extended_booking.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{booking_id}/release", response_model=BookingResponse, summary="释放预约")
async def release_booking(
    booking_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """释放正在进行的预约剩余时间"""
    service = BookingService(db)
    
    try:
        released_booking = service.release_booking(booking_id, current_user.id)
        
        if not released_booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="预约不存在"
            )
        
        return BookingResponse(
            id=released_booking.id,
            user_id=released_booking.user_id,
            resource_id=released_booking.resource_id,
            resource_name=released_booking.resource.name,
            task_name=released_booking.task_name,
            estimated_memory_gb=released_booking.estimated_memory_gb,
            start_time=released_booking.start_time,
            end_time=released_booking.end_time,
            original_end_time=released_booking.original_end_time,
            status=released_booking.status,
            created_at=released_booking.created_at,
            updated_at=released_booking.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/calendar/data", response_model=CalendarResponse, summary="获取日历数据")
async def get_calendar_data(
    start_date: datetime = Query(..., description="开始日期"),
    end_date: datetime = Query(..., description="结束日期"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取指定时间范围的日历数据"""
    # 验证日期范围
    if start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="开始日期必须早于结束日期"
        )
    
    # 限制查询范围（最多一个月）
    max_range = timedelta(days=31)
    if end_date - start_date > max_range:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="查询范围不能超过31天"
        )
    
    service = BookingService(db)
    calendar_data = service.get_calendar_data(start_date, end_date)
    
    return calendar_data

@router.get("/calendar/week", response_model=CalendarResponse, summary="获取周日历数据")
async def get_week_calendar(
    week_start: Optional[datetime] = Query(None, description="周开始日期，默认为当前周"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取指定周的日历数据"""
    if not week_start:
        # 默认获取当前周的数据
        today = datetime.now().date()
        days_since_monday = today.weekday()
        week_start = datetime.combine(today - timedelta(days=days_since_monday), datetime.min.time())
    
    week_end = week_start + timedelta(days=7)
    
    service = BookingService(db)
    calendar_data = service.get_calendar_data(week_start, week_end)
    
    return calendar_data

@router.post("/update-statuses", summary="手动触发预约状态更新")
async def update_booking_statuses(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """手动触发预约状态更新"""
    service = BookingService(db)
    updated_count = service.update_booking_statuses()
    
    return {
        "message": f"成功更新了 {updated_count} 个预约的状态",
        "updated_count": updated_count
    }

@router.get("/status-summary", summary="获取预约状态摘要")
async def get_status_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取预约状态摘要"""
    service = BookingService(db)
    summary = service.get_status_summary()
    
    return summary
