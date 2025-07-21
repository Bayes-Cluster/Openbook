# Generic OAuth 2.0 配置指南

OpenBook 系统现在支持任何符合 OAuth 2.0 标准的认证提供商。本指南将帮助您配置常见的 OAuth 提供商。

## 🔧 基本配置

### 环境变量设置

在 `backend/.env` 文件中配置以下OAuth设置：

```env
# OAuth 2.0 基本配置
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_AUTHORIZATION_URL=https://provider.com/oauth/authorize
OAUTH_TOKEN_URL=https://provider.com/oauth/token
OAUTH_USER_INFO_URL=https://provider.com/oauth/userinfo
OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/oauth/callback

# 可选配置
OAUTH_SCOPE=openid email profile
OAUTH_PROVIDER_NAME=Your Provider
OAUTH_EMAIL_FIELD=email
OAUTH_NAME_FIELD=name
OAUTH_AVATAR_FIELD=picture
OAUTH_ID_FIELD=sub
OAUTH_STATE_SECRET=your-random-secret-key
OAUTH_USE_PKCE=true
```

## 🌐 常见OAuth提供商配置

### 1. Google OAuth

#### 1.1 Google Cloud Console 设置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API 或 Google Identity API
4. 创建 OAuth 2.0 客户端 ID：
   - 应用类型：Web应用
   - 授权重定向URI：`http://localhost:8000/api/auth/oauth/callback`

#### 1.2 环境配置

```env
# Google OAuth 配置
OAUTH_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
OAUTH_CLIENT_SECRET=your_google_client_secret
OAUTH_AUTHORIZATION_URL=https://accounts.google.com/o/oauth2/v2/auth
OAUTH_TOKEN_URL=https://oauth2.googleapis.com/token
OAUTH_USER_INFO_URL=https://www.googleapis.com/oauth2/v2/userinfo
OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/oauth/callback
OAUTH_SCOPE=openid email profile
OAUTH_PROVIDER_NAME=Google
OAUTH_EMAIL_FIELD=email
OAUTH_NAME_FIELD=name
OAUTH_AVATAR_FIELD=picture
OAUTH_ID_FIELD=sub
```

### 2. GitHub OAuth

#### 2.1 GitHub 设置

1. 访问 GitHub Settings → Developer settings → OAuth Apps
2. 创建新的 OAuth App：
   - Application name: OpenBook
   - Homepage URL: `http://localhost:8080`
   - Authorization callback URL: `http://localhost:8000/api/auth/oauth/callback`

#### 2.2 环境配置

```env
# GitHub OAuth 配置
OAUTH_CLIENT_ID=your_github_client_id
OAUTH_CLIENT_SECRET=your_github_client_secret
OAUTH_AUTHORIZATION_URL=https://github.com/login/oauth/authorize
OAUTH_TOKEN_URL=https://github.com/login/oauth/access_token
OAUTH_USER_INFO_URL=https://api.github.com/user
OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/oauth/callback
OAUTH_SCOPE=user:email
OAUTH_PROVIDER_NAME=GitHub
OAUTH_EMAIL_FIELD=email
OAUTH_NAME_FIELD=name
OAUTH_AVATAR_FIELD=avatar_url
OAUTH_ID_FIELD=id
```

### 3. GitLab OAuth

#### 3.1 GitLab 设置

1. 访问 GitLab User Settings → Applications
2. 创建新应用：
   - Name: OpenBook
   - Redirect URI: `http://localhost:8000/api/auth/oauth/callback`
   - Scopes: `read_user`, `email`

#### 3.2 环境配置

```env
# GitLab OAuth 配置
OAUTH_CLIENT_ID=your_gitlab_application_id
OAUTH_CLIENT_SECRET=your_gitlab_secret
OAUTH_AUTHORIZATION_URL=https://gitlab.com/oauth/authorize
OAUTH_TOKEN_URL=https://gitlab.com/oauth/token
OAUTH_USER_INFO_URL=https://gitlab.com/api/v4/user
OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/oauth/callback
OAUTH_SCOPE=read_user email
OAUTH_PROVIDER_NAME=GitLab
OAUTH_EMAIL_FIELD=email
OAUTH_NAME_FIELD=name
OAUTH_AVATAR_FIELD=avatar_url
OAUTH_ID_FIELD=id
```

### 4. Microsoft OAuth

#### 4.1 Azure 设置

1. 访问 [Azure Portal](https://portal.azure.com/)
2. 进入 Azure Active Directory → App registrations
3. 创建新注册：
   - Name: OpenBook
   - Redirect URI: Web - `http://localhost:8000/api/auth/oauth/callback`

#### 4.2 环境配置

```env
# Microsoft OAuth 配置
OAUTH_CLIENT_ID=your_azure_application_id
OAUTH_CLIENT_SECRET=your_azure_client_secret
OAUTH_AUTHORIZATION_URL=https://login.microsoftonline.com/common/oauth2/v2.0/authorize
OAUTH_TOKEN_URL=https://login.microsoftonline.com/common/oauth2/v2.0/token
OAUTH_USER_INFO_URL=https://graph.microsoft.com/v1.0/me
OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/oauth/callback
OAUTH_SCOPE=openid email profile
OAUTH_PROVIDER_NAME=Microsoft
OAUTH_EMAIL_FIELD=mail
OAUTH_NAME_FIELD=displayName
OAUTH_AVATAR_FIELD=photo
OAUTH_ID_FIELD=id
```

## 🔒 安全配置

### PKCE (Proof Key for Code Exchange)

对于公共客户端，建议启用 PKCE：

```env
OAUTH_USE_PKCE=true
```

### State 参数

设置强随机密钥用于生成 state 参数：

```env
OAUTH_STATE_SECRET=$(openssl rand -hex 32)
```

### HTTPS 配置

⚠️ **生产环境必须使用 HTTPS**

```env
# 生产环境配置
OAUTH_REDIRECT_URI=https://yourdomain.com/api/auth/oauth/callback
```

## 🚀 部署配置

### 开发环境

```bash
# 1. 复制环境配置
cp backend/.env.example backend/.env

# 2. 编辑 .env 文件，填入您的 OAuth 配置

# 3. 启动后端
cd backend
pixi run dev

# 4. 启动前端
python -m http.server 8080
```

### 生产环境

```env
# 更新重定向URI
OAUTH_REDIRECT_URI=https://yourdomain.com/api/auth/oauth/callback

# 使用安全的密钥
OAUTH_STATE_SECRET=your-production-secret-key
SECRET_KEY=your-production-jwt-secret

# 限制CORS
ALLOWED_ORIGINS=["https://yourdomain.com"]
```

## 🧪 测试配置

### 验证OAuth配置

```bash
# 1. 启动服务
cd backend
pixi run dev

# 2. 访问提供商信息API
curl http://localhost:8000/api/auth/oauth/provider

# 3. 测试授权URL生成
curl http://localhost:8000/api/auth/oauth/url
```

### 常见问题排查

1. **重定向URI不匹配**
   - 检查OAuth应用配置中的重定向URI
   - 确保环境变量中的OAUTH_REDIRECT_URI正确

2. **域名限制**
   - 某些提供商只允许HTTPS回调
   - 本地开发时可使用 ngrok 等工具

3. **权限范围**
   - 确保请求的scope包含必要的用户信息权限
   - 不同提供商的scope名称可能不同

## 📋 字段映射

不同OAuth提供商返回的用户信息字段名可能不同，通过环境变量进行映射：

| 提供商 | Email字段 | Name字段 | Avatar字段 | ID字段 |
|--------|-----------|----------|------------|--------|
| Google | email | name | picture | sub |
| GitHub | email | name | avatar_url | id |
| GitLab | email | name | avatar_url | id |
| Microsoft | mail | displayName | photo | id |

## 🔧 自定义OAuth提供商

对于自建或企业OAuth服务器：

```env
# 自定义OAuth配置示例
OAUTH_CLIENT_ID=your_custom_client_id
OAUTH_CLIENT_SECRET=your_custom_client_secret
OAUTH_AUTHORIZATION_URL=https://your-oauth-server.com/oauth/authorize
OAUTH_TOKEN_URL=https://your-oauth-server.com/oauth/token
OAUTH_USER_INFO_URL=https://your-oauth-server.com/oauth/userinfo
OAUTH_PROVIDER_NAME=Your Company SSO
OAUTH_SCOPE=openid email profile
# 根据实际API调整字段映射
OAUTH_EMAIL_FIELD=email
OAUTH_NAME_FIELD=full_name
OAUTH_AVATAR_FIELD=profile_image
OAUTH_ID_FIELD=user_id
```

## 📚 更多资源

- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC](https://tools.ietf.org/html/rfc7636)
- [OpenID Connect](https://openid.net/connect/)

## 💡 提示

1. **开发时**：可以使用 `localhost` 域名
2. **生产时**：必须使用 HTTPS 和真实域名
3. **安全性**：定期轮换客户端密钥
4. **监控**：记录OAuth认证日志用于调试

配置完成后，用户将通过真实的OAuth提供商进行认证，确保了系统的安全性和可靠性。
