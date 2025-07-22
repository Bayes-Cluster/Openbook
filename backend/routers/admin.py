from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from auth import require_admin, local_login, create_local_user, get_current_active_user
from models import User as UserModel, Resource as ResourceModel
from schemas import (
    AdminUserUpdate, AdminUserList, AdminResourceUpdate, AdminResourceList,
    AdminStats, LocalLogin, LocalUserCreate, SuccessResponse, User, Resource
)
from services import AdminService

router = APIRouter(prefix="/admin", tags=["管理员"])

# 本地登录（管理员）
@router.post("/login", summary="管理员本地登录")
async def admin_login(
    login_data: LocalLogin,
    db: Session = Depends(get_db)
):
    """管理员通过邮箱密码登录"""
    try:
        result = local_login(db, login_data.email, login_data.password)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"登录失败: {str(e)}"
        )

# 创建本地管理员账号
@router.post("/create-admin", summary="创建管理员账号")
async def create_admin_account(
    user_data: LocalUserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """创建新的管理员账号（只有管理员可以创建）"""
    try:
        user = create_local_user(
            db, 
            user_data.name, 
            user_data.email, 
            user_data.password, 
            user_data.group
        )
        return SuccessResponse(
            message="管理员账号创建成功",
            data={
                "user_id": user.id,
                "email": user.email,
                "group": user.group
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建账号失败: {str(e)}"
        )

# 获取管理员统计信息
@router.get("/stats", response_model=AdminStats, summary="获取管理员统计")
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """获取系统统计信息"""
    service = AdminService(db)
    stats = service.get_admin_stats()
    return AdminStats(**stats)

# 用户管理
@router.get("/users", response_model=AdminUserList, summary="获取用户列表")
async def get_users_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页大小"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """获取用户列表（分页和搜索）"""
    service = AdminService(db)
    result = service.get_users_list(page, page_size, search)
    return AdminUserList(**result)

@router.put("/users/{user_id}", response_model=User, summary="更新用户信息")
async def update_user(
    user_id: str,
    update_data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """更新用户信息"""
    service = AdminService(db)
    try:
        # 转换为字典，过滤掉None值
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        user = service.update_user(user_id, update_dict)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新失败: {str(e)}"
        )

@router.delete("/users/{user_id}", summary="禁用用户")
async def disable_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """禁用用户账号"""
    service = AdminService(db)
    try:
        service.delete_user(user_id)
        return SuccessResponse(message="用户已禁用")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"禁用失败: {str(e)}"
        )

# 资源管理
@router.get("/resources", response_model=AdminResourceList, summary="获取资源列表")
async def get_resources_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页大小"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """获取资源列表（分页和搜索）"""
    service = AdminService(db)
    result = service.get_resources_list(page, page_size, search)
    return AdminResourceList(**result)

@router.post("/resources", response_model=Resource, summary="创建资源")
async def create_resource(
    name: str,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """创建新资源"""
    service = AdminService(db)
    try:
        resource = service.create_resource(name, description)
        return resource
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建失败: {str(e)}"
        )

@router.put("/resources/{resource_id}", response_model=Resource, summary="更新资源信息")
async def update_resource(
    resource_id: str,
    update_data: AdminResourceUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """更新资源信息"""
    service = AdminService(db)
    try:
        # 转换为字典，过滤掉None值
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        resource = service.update_resource(resource_id, update_dict)
        return resource
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新失败: {str(e)}"
        )

@router.delete("/resources/{resource_id}", summary="禁用资源")
async def disable_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """禁用资源"""
    service = AdminService(db)
    try:
        service.delete_resource(resource_id)
        return SuccessResponse(message="资源已禁用")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"禁用失败: {str(e)}"
        )
