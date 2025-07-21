from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import Optional
import os
from dotenv import load_dotenv

from database import get_db
from models import User
from schemas import TokenData

load_dotenv()

# JWT配置
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24小时

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer认证
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """获取密码哈希"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> TokenData:
    """验证令牌"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证凭据",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = TokenData(email=email)
        return token_data
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """根据邮箱获取用户"""
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, email: str) -> Optional[User]:
    """模拟OAuth认证用户（在实际实现中，这里会验证OAuth令牌）"""
    user = get_user_by_email(db, email)
    if not user:
        # 如果用户不存在，创建新用户（模拟OAuth首次登录）
        user = User(
            id=f"oauth_{email.split('@')[0]}",
            name=email.split('@')[0],
            email=email,
            group="standard"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """获取当前认证用户"""
    token_data = verify_token(credentials.credentials)
    user = get_user_by_email(db, token_data.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户已被禁用"
        )
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """获取当前活跃用户"""
    return current_user

def check_user_permissions(user: User, required_group: str = "standard") -> bool:
    """检查用户权限"""
    group_hierarchy = {
        "standard": 0,
        "premium": 1,
        "admin": 2
    }
    
    user_level = group_hierarchy.get(user.group, 0)
    required_level = group_hierarchy.get(required_group, 0)
    
    return user_level >= required_level

def get_max_extend_hours(user: User) -> int:
    """根据用户组获取最大延长小时数"""
    extend_limits = {
        "standard": 4,
        "premium": 8,
        "admin": 24
    }
    return extend_limits.get(user.group, 4)

# OAuth模拟端点
def simulate_oauth_login(email: str, db: Session) -> dict:
    """模拟OAuth登录流程"""
    # 在实际实现中，这里会：
    # 1. 重定向到OAuth提供商
    # 2. 验证授权码
    # 3. 获取用户信息
    # 4. 创建或更新用户记录
    
    user = authenticate_user(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OAuth认证失败"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "group": user.group
        }
    }
