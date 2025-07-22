from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # 本地账号密码哈希，OAuth用户为None
    group = Column(String, default="standard")  # standard, premium, admin
    is_active = Column(Boolean, default=True)
    is_local_account = Column(Boolean, default=False)  # 是否为本地账号
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联预约
    bookings = relationship("Booking", back_populates="user")

class Resource(Base):
    __tablename__ = "resources"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联预约
    bookings = relationship("Booking", back_populates="resource")

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    resource_id = Column(String, ForeignKey("resources.id"), nullable=False)
    task_name = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    original_end_time = Column(DateTime, nullable=False)  # 原始结束时间，用于延长记录
    status = Column(String, default="upcoming")  # upcoming, active, completed, cancelled
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联用户和资源
    user = relationship("User", back_populates="bookings")
    resource = relationship("Resource", back_populates="bookings")

class BookingLog(Base):
    __tablename__ = "booking_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    action = Column(String, nullable=False)  # created, extended, released, cancelled
    details = Column(Text)  # JSON格式的详细信息
    timestamp = Column(DateTime, default=datetime.utcnow)
