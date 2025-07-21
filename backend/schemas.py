from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

# 基础模式
class UserBase(BaseModel):
    name: str
    email: EmailStr
    group: str = "standard"

class UserCreate(UserBase):
    id: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    group: Optional[str] = None

class User(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# 资源模式
class ResourceBase(BaseModel):
    name: str
    description: Optional[str] = None

class ResourceCreate(ResourceBase):
    id: str

class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Resource(ResourceBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# 预约模式
class BookingBase(BaseModel):
    resource_id: str
    task_name: str
    start_time: datetime
    end_time: datetime

class BookingCreate(BookingBase):
    pass

class BookingUpdate(BaseModel):
    task_name: Optional[str] = None
    end_time: Optional[datetime] = None

class BookingExtend(BaseModel):
    hours: int  # 延长的小时数

class BookingRelease(BaseModel):
    pass  # 释放预约不需要额外参数

class Booking(BookingBase):
    id: str
    user_id: str
    original_end_time: datetime
    status: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    user: User
    resource: Resource
    
    class Config:
        from_attributes = True

# 预约日志模式
class BookingLogCreate(BaseModel):
    booking_id: str
    action: str
    details: Optional[str] = None

class BookingLog(BaseModel):
    id: int
    booking_id: str
    action: str
    details: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True

# API响应模式
class BookingResponse(BaseModel):
    id: str
    user_id: str
    resource_id: str
    resource_name: str
    task_name: str
    start_time: datetime
    end_time: datetime
    original_end_time: datetime
    status: str
    created_at: datetime
    updated_at: datetime

class CalendarSlot(BaseModel):
    start_time: datetime
    end_time: datetime
    booking: Optional[BookingResponse] = None
    is_available: bool

class CalendarResponse(BaseModel):
    start_date: datetime
    end_date: datetime
    resources: List[Resource]
    slots: List[CalendarSlot]

# 统计响应模式
class BookingStats(BaseModel):
    total_bookings: int
    active_bookings: int
    upcoming_bookings: int
    completed_bookings: int
    total_hours: float
    used_hours: float

class ResourceStats(BaseModel):
    resource_id: str
    resource_name: str
    total_bookings: int
    utilization_rate: float
    total_hours: float

class SystemStats(BaseModel):
    total_users: int
    total_resources: int
    booking_stats: BookingStats
    resource_stats: List[ResourceStats]

# OAuth相关模式
class TokenData(BaseModel):
    email: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class UserLogin(BaseModel):
    email: str
    # 在实际OAuth实现中，这里会有更多字段

# 错误响应模式
class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

# 成功响应模式
class SuccessResponse(BaseModel):
    message: str
    data: Optional[dict] = None
