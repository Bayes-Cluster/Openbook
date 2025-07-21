from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from auth import create_access_token, get_user_by_email
from models import User
from schemas import Token, SuccessResponse
from oauth_service import oauth_service, generate_pkce_pair

router = APIRouter(prefix="/auth", tags=["认证"])

@router.get("/oauth/authorize", summary="发起OAuth授权")
async def oauth_authorize():
    """
    发起OAuth授权流程
    
    重定向用户到OAuth提供商的授权页面
    """
    try:
        # 生成state参数防CSRF攻击
        state = oauth_service.generate_state()
        
        # 如果启用PKCE，生成代码挑战
        pkce_data = None
        code_challenge = None
        
        if oauth_service.config.use_pkce:
            pkce_data = generate_pkce_pair()
            code_challenge = pkce_data["code_challenge"]
            
            # 将code_verifier保存到state中（实际应用中可能需要使用缓存）
            state = oauth_service.generate_state({
                "code_verifier": pkce_data["code_verifier"]
            })
        
        # 构建授权URL
        auth_url = oauth_service.get_authorization_url(state, code_challenge)
        
        return {
            "authorization_url": auth_url,
            "state": state,
            "provider": oauth_service.config.provider_name
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"构建OAuth授权URL失败: {str(e)}"
        )

@router.get("/oauth/callback", summary="OAuth回调处理")
async def oauth_callback(
    code: str = Query(..., description="OAuth授权码"),
    state: str = Query(..., description="State参数"),
    error: Optional[str] = Query(None, description="OAuth错误"),
    db: Session = Depends(get_db)
):
    """
    处理OAuth提供商的回调
    
    1. 验证state参数
    2. 用授权码换取访问令牌
    3. 获取用户信息
    4. 创建或更新用户记录
    5. 生成JWT令牌
    """
    # 检查是否有错误
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth授权失败: {error}"
        )
    
    try:
        # 验证state并提取code_verifier（如果使用PKCE）
        state_data = oauth_service.verify_state(state)
        code_verifier = state_data.get("code_verifier")
        
        # 完成OAuth流程
        oauth_user_info = await oauth_service.complete_oauth_flow(
            code, state, code_verifier
        )
        
        # 检查必需的用户信息
        email = oauth_user_info.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth提供商未返回邮箱信息"
            )
        
        # 查找或创建用户
        user = get_user_by_email(db, email)
        if not user:
            # 创建新用户
            user = User(
                id=f"oauth_{oauth_user_info.get('oauth_id', email.split('@')[0])}",
                name=oauth_user_info.get("name", email.split("@")[0]),
                email=email,
                group="standard"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # 更新现有用户信息
            if oauth_user_info.get("name"):
                user.name = oauth_user_info["name"]
                db.commit()
        
        # 生成JWT令牌
        access_token = create_access_token(data={"sub": user.email})
        
        # 重定向到前端（带令牌）
        frontend_url = f"http://localhost:8080?token={access_token}&status=success"
        return RedirectResponse(url=frontend_url)
        
    except HTTPException:
        # 重新抛出HTTP异常
        raise
    except Exception as e:
        # 重定向到前端错误页面
        frontend_url = f"http://localhost:8080?status=error&message={str(e)}"
        return RedirectResponse(url=frontend_url)

@router.get("/oauth/url", summary="获取OAuth授权URL")
async def get_oauth_url():
    """
    获取OAuth授权URL
    
    返回前端需要重定向到的OAuth授权URL
    """
    try:
        # 生成state参数
        state = oauth_service.generate_state()
        
        # 如果启用PKCE，生成代码挑战
        code_challenge = None
        if oauth_service.config.use_pkce:
            pkce_data = generate_pkce_pair()
            code_challenge = pkce_data["code_challenge"]
            
            # 将code_verifier保存到state中
            state = oauth_service.generate_state({
                "code_verifier": pkce_data["code_verifier"]
            })
        
        # 构建授权URL
        auth_url = oauth_service.get_authorization_url(state, code_challenge)
        
        return {
            "oauth_url": auth_url,
            "provider": oauth_service.config.provider_name,
            "state": state
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成OAuth URL失败: {str(e)}"
        )

@router.get("/oauth/provider", summary="获取OAuth提供商信息")
async def get_oauth_provider():
    """获取当前配置的OAuth提供商信息"""
    try:
        return oauth_service.get_provider_info()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取提供商信息失败: {str(e)}"
        )

@router.post("/logout", summary="用户登出")
async def logout():
    """
    用户登出
    
    由于使用JWT令牌，登出主要在客户端完成
    服务端可以维护一个黑名单来使令牌失效
    """
    return SuccessResponse(message="登出成功")
