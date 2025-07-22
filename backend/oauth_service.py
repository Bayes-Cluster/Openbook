"""
Generic OAuth 2.0 服务

支持任何符合OAuth 2.0标准的提供商，包括：
- Google OAuth
- GitHub OAuth  
- GitLab OAuth
- Microsoft OAuth
- 自建OIDC服务器
- 企业SSO系统
"""

import secrets
import httpx
from typing import Dict, Optional, Any
from authlib.integrations.starlette_client import OAuth
from authlib.integrations.httpx_client import AsyncOAuth2Client
from fastapi import HTTPException, status
from itsdangerous import URLSafeTimedSerializer
import os
from dotenv import load_dotenv

load_dotenv()

class OAuthConfig:
    """OAuth配置类"""
    def __init__(self):
        # 必需配置
        self.client_id = os.getenv("OAUTH_CLIENT_ID")
        self.client_secret = os.getenv("OAUTH_CLIENT_SECRET")
        self.authorization_url = os.getenv("OAUTH_AUTHORIZATION_URL")
        self.token_url = os.getenv("OAUTH_TOKEN_URL")
        self.user_info_url = os.getenv("OAUTH_USER_INFO_URL")
        self.redirect_uri = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:8000/api/auth/oauth/callback")
        
        # 可选配置
        self.scope = os.getenv("OAUTH_SCOPE", "openid email profile")
        self.provider_name = os.getenv("OAUTH_PROVIDER_NAME", "OAuth Provider")
        
        # 用户信息字段映射
        self.email_field = os.getenv("OAUTH_EMAIL_FIELD", "email")
        self.name_field = os.getenv("OAUTH_NAME_FIELD", "name")
        self.avatar_field = os.getenv("OAUTH_AVATAR_FIELD", "picture")
        self.id_field = os.getenv("OAUTH_ID_FIELD", "sub")
        
        # 安全配置
        self.state_secret = os.getenv("OAUTH_STATE_SECRET", "your-state-secret-change-in-production")
        self.use_pkce = os.getenv("OAUTH_USE_PKCE", "true").lower() == "true"
        
        # 验证必需配置
        self._validate_config()
    
    def _validate_config(self):
        """验证OAuth配置"""
        required_fields = [
            "client_id", "client_secret", "authorization_url", 
            "token_url", "user_info_url"
        ]
        
        missing_fields = []
        for field in required_fields:
            if not getattr(self, field):
                missing_fields.append(field.upper())
        
        if missing_fields:
            raise ValueError(f"缺少必需的OAuth配置: {', '.join(missing_fields)}")

class GenericOAuthService:
    """通用OAuth 2.0服务"""
    
    def __init__(self):
        self.config = OAuthConfig()
        self.serializer = URLSafeTimedSerializer(self.config.state_secret)
        self._client = None
    
    @property
    def client(self) -> AsyncOAuth2Client:
        """获取OAuth客户端"""
        if not self._client:
            self._client = AsyncOAuth2Client(
                client_id=self.config.client_id,
                client_secret=self.config.client_secret,
                token_endpoint=self.config.token_url
            )
        return self._client
    
    def generate_state(self, user_data: Optional[Dict] = None) -> str:
        """生成OAuth state参数（防CSRF攻击）"""
        state_data = {
            "nonce": secrets.token_urlsafe(32),
            "timestamp": secrets.token_urlsafe(16)
        }
        if user_data:
            state_data.update(user_data)
        
        return self.serializer.dumps(state_data)
    
    def verify_state(self, state: str, max_age: int = 600) -> Dict:
        """验证OAuth state参数"""
        try:
            return self.serializer.loads(state, max_age=max_age)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的state参数: {str(e)}"
            )
    
    def get_authorization_url(self, state: str, code_challenge: Optional[str] = None) -> str:
        """构建OAuth授权URL"""
        params = {
            "client_id": self.config.client_id,
            "response_type": "code",
            "redirect_uri": self.config.redirect_uri,
            "scope": self.config.scope,
            "state": state
        }
        
        # 如果启用PKCE，添加code_challenge
        if self.config.use_pkce and code_challenge:
            params.update({
                "code_challenge": code_challenge,
                "code_challenge_method": "S256"
            })
        
        # 构建URL
        param_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.config.authorization_url}?{param_string}"
    
    async def exchange_code_for_token(
        self, 
        code: str, 
        state: str,
        code_verifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """用授权码换取访问令牌"""
        
        # 验证state
        self.verify_state(state)
        
        # 准备令牌请求
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.config.redirect_uri,
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret
        }
        
        # 如果使用PKCE，添加code_verifier
        if self.config.use_pkce and code_verifier:
            token_data["code_verifier"] = code_verifier
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.config.token_url,
                    data=token_data,
                    headers={"Accept": "application/json"}
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPError as e:
            # 获取详细的错误信息
            error_detail = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_response = e.response.json()
                    error_detail = f"{error_response}"
                except:
                    error_detail = f"HTTP {e.response.status_code}: {e.response.text}"
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"令牌交换失败: {error_detail}"
            )
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """获取用户信息"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.config.user_info_url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json"
                    }
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"获取用户信息失败: {str(e)}"
            )
    
    def map_user_info(self, oauth_user_info: Dict[str, Any]) -> Dict[str, Any]:
        """映射OAuth用户信息到标准格式"""
        return {
            "oauth_id": oauth_user_info.get(self.config.id_field),
            "email": oauth_user_info.get(self.config.email_field),
            "name": oauth_user_info.get(self.config.name_field),
            "avatar": oauth_user_info.get(self.config.avatar_field),
            "provider": self.config.provider_name,
            "raw_data": oauth_user_info  # 保存原始数据以备后用
        }
    
    async def complete_oauth_flow(
        self, 
        code: str, 
        state: str,
        code_verifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """完整的OAuth流程：代码交换 + 用户信息获取"""
        
        # 1. 用授权码换取访问令牌
        token_response = await self.exchange_code_for_token(code, state, code_verifier)
        access_token = token_response.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="未能获取访问令牌"
            )
        
        # 2. 获取用户信息
        oauth_user_info = await self.get_user_info(access_token)
        
        # 3. 映射用户信息
        user_info = self.map_user_info(oauth_user_info)
        
        # 4. 添加令牌信息
        user_info["tokens"] = {
            "access_token": access_token,
            "refresh_token": token_response.get("refresh_token"),
            "expires_in": token_response.get("expires_in"),
            "token_type": token_response.get("token_type", "Bearer")
        }
        
        return user_info

    def get_provider_info(self) -> Dict[str, str]:
        """获取OAuth提供商信息"""
        return {
            "name": self.config.provider_name,
            "authorization_url": self.config.authorization_url,
            "scopes": self.config.scope.split(),
            "supports_pkce": self.config.use_pkce
        }

# PKCE助手函数
def generate_pkce_pair() -> Dict[str, str]:
    """生成PKCE代码验证器和挑战"""
    import base64
    import hashlib
    
    # 生成代码验证器
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8')
    code_verifier = code_verifier.rstrip('=')
    
    # 生成代码挑战
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode('utf-8')).digest()
    ).decode('utf-8')
    code_challenge = code_challenge.rstrip('=')
    
    return {
        "code_verifier": code_verifier,
        "code_challenge": code_challenge
    }

# 全局OAuth服务实例
oauth_service = GenericOAuthService()
