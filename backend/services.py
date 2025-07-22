from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid

from models import Booking, BookingLog, Resource, User
from schemas import BookingCreate, BookingUpdate, BookingExtend, CalendarResponse, CalendarSlot, BookingResponse, ResourceStats


class BookingService:
    def __init__(self, db: Session):
        self.db = db

    def _get_current_time(self) -> datetime:
        """获取当前UTC时间（无时区信息）"""
        return datetime.utcnow()

    def _ensure_timezone_naive(self, dt: datetime) -> datetime:
        """确保 datetime 对象是时区无关的UTC时间"""
        if dt.tzinfo is not None:
            # 如果有时区信息，转换为 UTC 并移除时区信息
            utc_dt = dt.astimezone(timezone.utc)
            return datetime(utc_dt.year, utc_dt.month, utc_dt.day, 
                          utc_dt.hour, utc_dt.minute, utc_dt.second, utc_dt.microsecond)
        return dt

    def _make_timezone_naive(self, dt: datetime) -> datetime:
        """将时区感知的 datetime 转换为天真的 datetime（UTC）"""
        return self._ensure_timezone_naive(dt)

    def _validate_booking_time(self, start_time: datetime, end_time: datetime) -> None:
        """验证预约时间的有效性"""
        current_time = self._get_current_time()
        
        # 确保时间是UTC无时区格式
        start_time = self._ensure_timezone_naive(start_time)
        end_time = self._ensure_timezone_naive(end_time)
        
        # 检查开始时间不能早于当前时间
        if start_time < current_time:
            raise ValueError("预约开始时间不能早于当前时间")
        
        # 检查结束时间必须晚于开始时间
        if end_time <= start_time:
            raise ValueError("预约结束时间必须晚于开始时间")
        
        # 检查预约时长不能超过24小时
        duration = end_time - start_time
        if duration > timedelta(hours=24):
            raise ValueError("单次预约时长不能超过24小时")

    def update_booking_statuses(self) -> int:
        """自动更新预约状态，返回更新的数量"""
        current_time = self._get_current_time()
        updated_count = 0
        
        try:
            # 查找所有需要更新状态的预约，添加空值检查
            # 1. 未开始 -> 进行中 (开始时间已到，结束时间未到)
            upcoming_to_active = (
                self.db.query(Booking)
                .filter(
                    Booking.status == 'upcoming',
                    Booking.start_time.isnot(None),
                    Booking.end_time.isnot(None),
                    Booking.start_time <= current_time,
                    Booking.end_time > current_time,
                    Booking.is_deleted == False
                )
                .all()
            )
            
            for booking in upcoming_to_active:
                booking.status = 'active'
                # 记录状态变更日志
                log_entry = BookingLog(
                    id=str(uuid.uuid4()),
                    booking_id=booking.id,
                    action='status_change',
                    details=f'状态自动更新: upcoming -> active',
                    timestamp=current_time
                )
                self.db.add(log_entry)
                updated_count += 1
            
            # 2. 进行中 -> 已完成 (结束时间已到)
            active_to_completed = (
                self.db.query(Booking)
                .filter(
                    Booking.status == 'active',
                    Booking.end_time.isnot(None),
                    Booking.end_time <= current_time,
                    Booking.is_deleted == False
                )
                .all()
            )
            
            for booking in active_to_completed:
                booking.status = 'completed'
                # 记录状态变更日志
                log_entry = BookingLog(
                    id=str(uuid.uuid4()),
                    booking_id=booking.id,
                    action='status_change',
                    details=f'状态自动更新: active -> completed',
                    timestamp=current_time
                )
                self.db.add(log_entry)
                updated_count += 1
            
            # 3. 未开始 -> 已完成 (整个时间段都已过去)
            upcoming_to_completed = (
                self.db.query(Booking)
                .filter(
                    Booking.status == 'upcoming',
                    Booking.end_time.isnot(None),
                    Booking.end_time <= current_time,
                    Booking.is_deleted == False
                )
                .all()
            )
            
            for booking in upcoming_to_completed:
                booking.status = 'completed'
                # 记录状态变更日志
                log_entry = BookingLog(
                    id=str(uuid.uuid4()),
                    booking_id=booking.id,
                    action='status_change',
                    details=f'状态自动更新: upcoming -> completed (过期)',
                    timestamp=current_time
                )
                self.db.add(log_entry)
                updated_count += 1
            
            self.db.commit()
            
            if updated_count > 0:
                print(f"自动更新了 {updated_count} 个预约的状态")
            
            return updated_count
            
        except Exception as e:
            self.db.rollback()
            print(f"自动更新预约状态失败: {e}")
            return 0

    def get_status_summary(self) -> dict:
        """获取预约状态摘要"""
        current_time = self._get_current_time()
        
        # 先更新状态
        self.update_booking_statuses()
        
        try:
            # 统计各状态的预约数量，添加空值检查
            upcoming_count = (
                self.db.query(Booking)
                .filter(
                    Booking.status == 'upcoming',
                    Booking.is_deleted == False
                )
                .count()
            ) or 0
            
            active_count = (
                self.db.query(Booking)
                .filter(
                    Booking.status == 'active',
                    Booking.is_deleted == False
                )
                .count()
            ) or 0
            
            completed_count = (
                self.db.query(Booking)
                .filter(
                    Booking.status == 'completed',
                    Booking.is_deleted == False
                )
                .count()
            ) or 0
            
            summary = {
                'upcoming': upcoming_count,
                'active': active_count,
                'completed': completed_count,
                'last_updated': current_time.isoformat()
            }
            
            return summary
            
        except Exception as e:
            print(f"获取状态摘要失败: {e}")
            return {
                'upcoming': 0,
                'active': 0,
                'completed': 0,
                'last_updated': current_time.isoformat()
            }

    def get_bookings(self, user_id: str, skip: int = 0, limit: int = 100) -> List[Booking]:
        """获取用户的预约列表"""
        return (
            self.db.query(Booking)
            .filter(Booking.user_id == user_id, Booking.is_deleted == False)
            .order_by(Booking.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_booking(self, booking_id: str, user_id: str) -> Optional[Booking]:
        """获取指定预约详情"""
        return (
            self.db.query(Booking)
            .filter(
                Booking.id == booking_id,
                Booking.user_id == user_id,
                Booking.is_deleted == False
            )
            .first()
        )

    def create_booking(self, booking: BookingCreate, user_id: str) -> Booking:
        """创建新预约"""
        # 标准化时间格式（确保为UTC无时区）
        start_time = self._ensure_timezone_naive(booking.start_time)
        end_time = self._ensure_timezone_naive(booking.end_time)
        
        # 验证预约时间
        self._validate_booking_time(start_time, end_time)

        # 检查资源是否存在且可用
        resource = self.db.query(Resource).filter(
            Resource.id == booking.resource_id,
            Resource.is_active == True
        ).first()
        if not resource:
            raise ValueError("资源不存在或不可用")

        # 检查时间冲突（使用精确的时间比较）
        if self._has_time_conflict(booking.resource_id, start_time, end_time):
            raise ValueError("该时间段已被预约，请选择其他时间")

        # 创建预约
        db_booking = Booking(
            id=str(uuid.uuid4()),
            user_id=user_id,
            resource_id=booking.resource_id,
            task_name=booking.task_name,
            start_time=start_time,
            end_time=end_time,
            original_end_time=end_time,
            status="upcoming"
        )

        self.db.add(db_booking)
        
        # 记录日志
        self._create_booking_log(db_booking.id, "created", f"创建预约: {booking.task_name}")
        
        self.db.commit()
        self.db.refresh(db_booking)
        
        return db_booking

    def update_booking(self, booking_id: str, booking_update: BookingUpdate, user_id: str) -> Optional[Booking]:
        """更新预约信息（仅限未开始的预约）"""
        db_booking = self.get_booking(booking_id, user_id)
        if not db_booking:
            return None

        # 只允许更新未开始的预约
        if db_booking.status != "upcoming":
            raise ValueError("只能更新未开始的预约")

        # 更新字段
        if booking_update.task_name is not None:
            db_booking.task_name = booking_update.task_name

        if booking_update.end_time is not None:
            # 处理时区问题
            new_end_time = self._make_timezone_naive(booking_update.end_time)
            
            # 检查新的结束时间是否合理
            if new_end_time <= db_booking.start_time:
                raise ValueError("结束时间必须晚于开始时间")

            # 检查是否有时间冲突
            if self._has_time_conflict(
                db_booking.resource_id, 
                db_booking.start_time, 
                new_end_time,
                exclude_booking_id=booking_id
            ):
                raise ValueError("修改后的时间与其他预约冲突")

            db_booking.end_time = new_end_time

        db_booking.updated_at = datetime.utcnow()
        
        # 记录日志
        self._create_booking_log(booking_id, "updated", "更新预约信息")
        
        self.db.commit()
        self.db.refresh(db_booking)
        
        return db_booking

    def delete_booking(self, booking_id: str, user_id: str) -> bool:
        """删除预约（仅限未开始的预约）"""
        db_booking = self.get_booking(booking_id, user_id)
        if not db_booking:
            return False

        # 只允许删除未开始的预约
        if db_booking.status != "upcoming":
            raise ValueError("只能删除未开始的预约")

        # 软删除
        db_booking.is_deleted = True
        db_booking.status = "cancelled"
        db_booking.updated_at = datetime.utcnow()
        
        # 记录日志
        self._create_booking_log(booking_id, "cancelled", "用户取消预约")
        
        self.db.commit()
        
        return True

    def extend_booking(self, booking_id: str, extend_data: BookingExtend, current_user: User) -> Optional[Booking]:
        """延长正在进行的预约"""
        db_booking = self.get_booking(booking_id, current_user.id)
        if not db_booking:
            return None

        # 只允许延长正在进行的预约
        if db_booking.status != "active":
            raise ValueError("只能延长正在进行的预约")

        # 计算新的结束时间
        new_end_time = db_booking.end_time + timedelta(hours=extend_data.hours)

        # 检查是否有时间冲突
        if self._has_time_conflict(
            db_booking.resource_id,
            db_booking.end_time,
            new_end_time,
            exclude_booking_id=booking_id
        ):
            raise ValueError("延长时间与其他预约冲突")

        # 更新结束时间
        db_booking.end_time = new_end_time
        db_booking.updated_at = datetime.utcnow()
        
        # 记录日志
        self._create_booking_log(
            booking_id, 
            "extended", 
            f"延长预约 {extend_data.hours} 小时，新结束时间: {new_end_time}"
        )
        
        self.db.commit()
        self.db.refresh(db_booking)
        
        return db_booking

    def release_booking(self, booking_id: str, user_id: str) -> Optional[Booking]:
        """释放正在进行的预约剩余时间"""
        db_booking = self.get_booking(booking_id, user_id)
        if not db_booking:
            return None

        # 只允许释放正在进行的预约
        if db_booking.status != "active":
            raise ValueError("只能释放正在进行的预约")

        # 设置结束时间为当前时间
        current_time = datetime.utcnow()
        db_booking.end_time = current_time
        db_booking.status = "completed"
        db_booking.updated_at = current_time
        
        # 记录日志
        self._create_booking_log(
            booking_id, 
            "released", 
            f"用户主动释放剩余时间，实际结束时间: {current_time}"
        )
        
        self.db.commit()
        self.db.refresh(db_booking)
        
        return db_booking

    def get_calendar_data(self, start_date: datetime, end_date: datetime) -> CalendarResponse:
        """获取日历数据"""
        # 处理时区问题
        start_date = self._make_timezone_naive(start_date)
        end_date = self._make_timezone_naive(end_date)
        
        # 获取所有资源
        resources = self.db.query(Resource).filter(Resource.is_active == True).all()
        
        # 获取时间范围内的所有预约
        bookings = (
            self.db.query(Booking)
            .filter(
                Booking.is_deleted == False,
                Booking.start_time < end_date,
                Booking.end_time > start_date
            )
            .all()
        )

        # 生成时间槽
        slots = []
        current_time = start_date
        
        while current_time < end_date:
            slot_end = current_time + timedelta(hours=1)
            
            # 查找此时间槽的预约
            booking_for_slot = None
            for booking in bookings:
                if (booking.start_time <= current_time and booking.end_time > current_time):
                    # 将 Booking 模型转换为 BookingResponse
                    booking_for_slot = BookingResponse(
                        id=booking.id,
                        user_id=booking.user_id,
                        resource_id=booking.resource_id,
                        resource_name=booking.resource.name,
                        task_name=booking.task_name,
                        start_time=booking.start_time,
                        end_time=booking.end_time,
                        original_end_time=booking.original_end_time,
                        status=booking.status,
                        created_at=booking.created_at,
                        updated_at=booking.updated_at
                    )
                    break
            
            slots.append(CalendarSlot(
                start_time=current_time,
                end_time=slot_end,
                booking=booking_for_slot,
                is_available=booking_for_slot is None
            ))
            
            current_time = slot_end

        return CalendarResponse(
            start_date=start_date,
            end_date=end_date,
            resources=resources,
            slots=slots
        )

    def _has_time_conflict(self, resource_id: str, start_time: datetime, end_time: datetime, exclude_booking_id: str = None) -> bool:
        """检查时间冲突 - 使用精确的时间范围重叠检测"""
        # 确保时间格式一致
        start_time = self._ensure_timezone_naive(start_time)
        end_time = self._ensure_timezone_naive(end_time)
        
        query = (
            self.db.query(Booking)
            .filter(
                Booking.resource_id == resource_id,
                Booking.is_deleted == False,
                Booking.status.in_(["upcoming", "active"]),
                # 使用标准的时间范围重叠检测：两个时间段重叠当且仅当 start1 < end2 AND start2 < end1
                Booking.start_time < end_time,
                Booking.end_time > start_time
            )
        )
        
        if exclude_booking_id:
            query = query.filter(Booking.id != exclude_booking_id)
        
        conflicting_booking = query.first()
        
        # 调试信息（生产环境可以移除）
        if conflicting_booking:
            print(f"时间冲突检测: 请求时间段 {start_time} - {end_time}, 冲突预约 {conflicting_booking.start_time} - {conflicting_booking.end_time}")
        
        return conflicting_booking is not None

    def _create_booking_log(self, booking_id: str, action: str, details: str):
        """创建预约日志"""
        log = BookingLog(
            booking_id=booking_id,
            action=action,
            details=details,
            timestamp=datetime.utcnow()
        )
        self.db.add(log)

    def update_booking_statuses(self):
        """更新预约状态（定时任务调用）"""
        current_time = datetime.utcnow()
        
        # 更新应该开始的预约
        upcoming_bookings = (
            self.db.query(Booking)
            .filter(
                Booking.status == "upcoming",
                Booking.start_time <= current_time,
                Booking.end_time > current_time,
                Booking.is_deleted == False
            )
            .all()
        )
        
        for booking in upcoming_bookings:
            booking.status = "active"
            booking.updated_at = current_time
            self._create_booking_log(booking.id, "started", "预约自动开始")

        # 更新应该结束的预约
        active_bookings = (
            self.db.query(Booking)
            .filter(
                Booking.status == "active",
                Booking.end_time <= current_time,
                Booking.is_deleted == False
            )
            .all()
        )
        
        for booking in active_bookings:
            booking.status = "completed"
            booking.updated_at = current_time
            self._create_booking_log(booking.id, "completed", "预约自动结束")

        self.db.commit()


class ResourceService:
    def __init__(self, db: Session):
        self.db = db

    def get_resources(self, active_only: bool = True) -> List[Resource]:
        """获取资源列表"""
        query = self.db.query(Resource)
        if active_only:
            query = query.filter(Resource.is_active == True)
        return query.order_by(Resource.name).all()

    def get_resource(self, resource_id: str) -> Optional[Resource]:
        """获取指定资源"""
        return (
            self.db.query(Resource)
            .filter(Resource.id == resource_id)
            .first()
        )

    def get_resource_stats(self, resource_id: str, start_date: datetime, end_date: datetime) -> ResourceStats:
        """获取资源统计信息"""
        # 获取资源
        resource = self.get_resource(resource_id)
        if not resource:
            raise ValueError("资源不存在")

        # 处理时区问题
        start_date = self._make_timezone_naive(start_date)
        end_date = self._make_timezone_naive(end_date)

        # 计算时间范围内的预约统计
        bookings = (
            self.db.query(Booking)
            .filter(
                Booking.resource_id == resource_id,
                Booking.is_deleted == False,
                Booking.start_time < end_date,
                Booking.end_time > start_date
            )
            .all()
        )

        # 计算总使用时间
        total_hours_used = 0
        total_bookings = len(bookings)
        
        for booking in bookings:
            # 计算交集时间
            booking_start = max(booking.start_time, start_date)
            booking_end = min(booking.end_time, end_date)
            if booking_start < booking_end:
                duration = (booking_end - booking_start).total_seconds() / 3600
                total_hours_used += duration

        # 计算总可用时间
        total_hours_available = (end_date - start_date).total_seconds() / 3600

        # 计算利用率
        utilization_rate = (total_hours_used / total_hours_available * 100) if total_hours_available > 0 else 0

        return ResourceStats(
            resource_id=resource_id,
            resource_name=resource.name,
            total_bookings=total_bookings,
            total_hours_used=total_hours_used,
            utilization_rate=utilization_rate,
            period_start=start_date,
            period_end=end_date
        )


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_stats(self, user_id: str) -> dict:
        """获取用户统计信息"""
        # 获取用户的所有预约
        all_bookings = (
            self.db.query(Booking)
            .filter(
                Booking.user_id == user_id,
                Booking.is_deleted == False
            )
            .all()
        )

        # 计算各种统计
        total_bookings = len(all_bookings)
        active_bookings = len([b for b in all_bookings if b.status == "active"])
        upcoming_bookings = len([b for b in all_bookings if b.status == "upcoming"])
        completed_bookings = len([b for b in all_bookings if b.status == "completed"])

        # 计算总预约时间和已使用时间
        total_hours = 0  # 总预约时间（包括未来的预约）
        used_hours = 0   # 已实际使用的时间
        
        current_time = datetime.utcnow()
        
        for booking in all_bookings:
            # 计算预约的总时长
            booking_duration = (booking.end_time - booking.start_time).total_seconds() / 3600
            total_hours += booking_duration
            
            # 计算已使用的时间
            if booking.status == "completed":
                # 已完成的预约，全部时间都算已使用
                used_hours += booking_duration
            elif booking.status == "active":
                # 正在进行的预约，计算已过去的时间
                if booking.start_time <= current_time:
                    elapsed_time = min(current_time, booking.end_time) - booking.start_time
                    used_hours += elapsed_time.total_seconds() / 3600

        return {
            "total_bookings": total_bookings,
            "active_bookings": active_bookings,
            "upcoming_bookings": upcoming_bookings,
            "completed_bookings": completed_bookings,
            "total_hours": total_hours,
            "used_hours": used_hours
        }

    def update_booking_statuses(self) -> int:
        """自动更新预约状态，返回更新的数量"""
        current_time = self._get_current_time()
        updated_count = 0
        
        try:
            # 查找所有需要更新状态的预约
            # 1. 未开始 -> 进行中 (开始时间已到，结束时间未到)
            upcoming_to_active = (
                self.db.query(Booking)
                .filter(
                    Booking.status == 'upcoming',
                    Booking.start_time <= current_time,
                    Booking.end_time > current_time,
                    Booking.is_deleted == False
                )
                .all()
            )
            
            for booking in upcoming_to_active:
                booking.status = 'active'
                # 记录状态变更日志
                log_entry = BookingLog(
                    id=str(uuid.uuid4()),
                    booking_id=booking.id,
                    action='status_change',
                    details=f'状态自动更新: upcoming -> active',
                    timestamp=current_time
                )
                self.db.add(log_entry)
                updated_count += 1
            
            # 2. 进行中 -> 已完成 (结束时间已到)
            active_to_completed = (
                self.db.query(Booking)
                .filter(
                    Booking.status == 'active',
                    Booking.end_time <= current_time,
                    Booking.is_deleted == False
                )
                .all()
            )
            
            for booking in active_to_completed:
                booking.status = 'completed'
                # 记录状态变更日志
                log_entry = BookingLog(
                    id=str(uuid.uuid4()),
                    booking_id=booking.id,
                    action='status_change',
                    details=f'状态自动更新: active -> completed',
                    timestamp=current_time
                )
                self.db.add(log_entry)
                updated_count += 1
            
            # 3. 未开始 -> 已完成 (整个时间段都已过去)
            upcoming_to_completed = (
                self.db.query(Booking)
                .filter(
                    Booking.status == 'upcoming',
                    Booking.end_time <= current_time,
                    Booking.is_deleted == False
                )
                .all()
            )
            
            for booking in upcoming_to_completed:
                booking.status = 'completed'
                # 记录状态变更日志
                log_entry = BookingLog(
                    id=str(uuid.uuid4()),
                    booking_id=booking.id,
                    action='status_change',
                    details=f'状态自动更新: upcoming -> completed (过期)',
                    timestamp=current_time
                )
                self.db.add(log_entry)
                updated_count += 1
            
            self.db.commit()
            
            if updated_count > 0:
                print(f"自动更新了 {updated_count} 个预约的状态")
            
            return updated_count
            
        except Exception as e:
            self.db.rollback()
            print(f"自动更新预约状态失败: {e}")
            raise e

    def get_status_summary(self) -> dict:
        """获取预约状态摘要"""
        current_time = self._get_current_time()
        
        # 先更新状态
        self.update_booking_statuses()
        
        # 统计各状态的预约数量
        summary = {
            'upcoming': self.db.query(Booking).filter(
                Booking.status == 'upcoming',
                Booking.is_deleted == False
            ).count(),
            'active': self.db.query(Booking).filter(
                Booking.status == 'active',
                Booking.is_deleted == False
            ).count(),
            'completed': self.db.query(Booking).filter(
                Booking.status == 'completed',
                Booking.is_deleted == False
            ).count(),
            'last_updated': current_time.isoformat()
        }
        
        return summary
