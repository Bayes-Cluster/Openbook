# OpenBook 后端API

基于 FastAPI 的显卡资源预约与管理系统后端服务。

## 🚀 快速开始

### 环境要求

- Python 3.8+
- [pixi](https://pixi.sh/) 包管理器（推荐）或 pip

### 使用 pixi（推荐）

```bash
cd backend

# 安装依赖
pixi install

# 启动开发服务器
pixi run dev

# 或启动生产服务器
pixi run start
```

### 使用传统 pip

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动服务
python run.py --reload
```

### 环境配置

1. 复制环境配置文件：
```bash
cp .env.example .env
```

2. 根据需要修改 `.env` 文件中的配置

### 启动选项

```bash
# 使用 pixi（推荐）
pixi run dev          # 开发模式（自动重载）
pixi run start        # 生产模式
pixi run debug        # 调试模式
pixi run serve        # 自定义主机和端口

# 使用传统方式
python run.py --reload    # 开发模式
python run.py            # 生产模式
python main.py           # 直接运行
```

### 访问API文档

服务启动后，可以通过以下地址访问API文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## 📋 API 概览

### 认证端点 (`/api/auth`)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/auth/oauth/login` | OAuth登录 |
| POST | `/auth/oauth/callback` | OAuth回调处理 |
| GET  | `/auth/oauth/url` | 获取OAuth授权URL |
| POST | `/auth/logout` | 用户登出 |

### 预约管理 (`/api/bookings`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET    | `/bookings/` | 获取预约列表 |
| POST   | `/bookings/` | 创建预约 |
| GET    | `/bookings/{id}` | 获取预约详情 |
| PUT    | `/bookings/{id}` | 更新预约 |
| DELETE | `/bookings/{id}` | 删除预约 |
| POST   | `/bookings/{id}/extend` | 延长预约 |
| POST   | `/bookings/{id}/release` | 释放预约 |
| GET    | `/bookings/calendar/data` | 获取日历数据 |
| GET    | `/bookings/calendar/week` | 获取周日历数据 |

### 资源管理 (`/api/resources`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/resources/` | 获取资源列表 |
| GET | `/resources/{id}` | 获取资源详情 |
| GET | `/resources/{id}/stats` | 获取资源统计 |
| GET | `/resources/{id}/availability` | 检查资源可用性 |

### 用户管理 (`/api/users`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/users/me` | 获取当前用户信息 |
| GET | `/users/me/stats` | 获取用户统计 |
| GET | `/users/me/permissions` | 获取用户权限信息 |
| PUT | `/users/me/profile` | 更新用户资料 |
| GET | `/users/me/extend-limits` | 获取延长时间限制 |

## 🔐 认证机制

### JWT Token 认证

API 使用 JWT (JSON Web Token) 进行用户认证：

1. 用户通过 OAuth 登录获取访问令牌
2. 在后续请求中在 Authorization 头部携带 Bearer Token
3. 服务器验证令牌的有效性和用户权限

#### 请求示例

```bash
curl -H "Authorization: Bearer your-jwt-token" \
     http://localhost:8000/api/users/me
```

### OAuth 流程

1. 前端重定向用户到 OAuth 提供商
2. 用户授权后重定向回回调URL
3. 后端验证授权码并获取用户信息
4. 创建或更新用户记录并返回 JWT Token

## 📊 数据模型

### 用户 (User)
```json
{
  "id": "string",
  "name": "string", 
  "email": "string",
  "group": "standard|premium|admin",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 资源 (Resource)
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 预约 (Booking)
```json
{
  "id": "string",
  "user_id": "string",
  "resource_id": "string",
  "task_name": "string",
  "start_time": "datetime",
  "end_time": "datetime",
  "original_end_time": "datetime",
  "status": "upcoming|active|completed|cancelled",
  "is_deleted": false,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## 🔧 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接URL | `sqlite:///./openbook.db` |
| `SECRET_KEY` | JWT签名密钥 | 需要设置 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token过期时间（分钟） | `1440` |
| `HOST` | 服务器主机 | `0.0.0.0` |
| `PORT` | 服务器端口 | `8000` |

### 用户组权限

| 用户组 | 最大延长时间 | 最长预约时间 | 提前预约天数 | 同时预约数 |
|--------|-------------|-------------|-------------|------------|
| standard | 4小时 | 8小时 | 7天 | 2个 |
| premium | 8小时 | 24小时 | 14天 | 5个 |
| admin | 24小时 | 无限制 | 无限制 | 无限制 |

## 🗃️ 数据库

### 支持的数据库

- SQLite (默认，适合开发和小规模部署)
- PostgreSQL (推荐用于生产环境)
- MySQL/MariaDB

### 数据库迁移

数据库表会在应用启动时自动创建。初始数据包括：

- 示例用户账户
- GPU资源配置
- 测试预约数据

## 🛠️ 开发指南

### 项目结构

```
backend/
├── main.py              # 应用入口
├── run.py               # 启动脚本
├── requirements.txt     # 依赖包
├── .env.example        # 环境配置示例
├── models.py           # 数据模型
├── schemas.py          # Pydantic模式
├── database.py         # 数据库配置
├── auth.py             # 认证服务
├── services.py         # 业务逻辑
└── routers/            # API路由
    ├── __init__.py
    ├── auth.py
    ├── bookings.py
    ├── resources.py
    └── users.py
```

### 添加新的API端点

1. 在相应的路由文件中定义新端点
2. 在 `schemas.py` 中定义数据模式
3. 在 `services.py` 中实现业务逻辑
4. 更新API文档

### 开发工具

使用 pixi 可以方便地运行各种开发任务：

```bash
# 代码格式化
pixi run format

# 代码风格检查
pixi run lint

# 类型检查
pixi run typecheck

# 安全检查
pixi run security

# 运行测试
pixi run test

# 生成测试覆盖率报告
pixi run test-cov

# 数据库初始化
pixi run init-db

# 健康检查
pixi run health

# 完整的代码质量检查
pixi run check

# 格式化并检查代码
pixi run format-check

# 运行所有测试
pixi run test-all
```

### 传统测试方式

```bash
# 运行测试
pytest

# 生成测试覆盖率报告
pytest --cov=. --cov-report=html
```

## 🚀 部署

### Docker 部署

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "run.py"]
```

### 生产环境配置

1. 设置安全的 `SECRET_KEY`
2. 使用 PostgreSQL 数据库
3. 配置 HTTPS
4. 设置适当的 CORS 策略
5. 启用日志记录

## 📝 API 使用示例

### 用户登录

```javascript
// 前端发起OAuth登录
const response = await fetch('/api/auth/oauth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com'
  })
});

const { access_token } = await response.json();
localStorage.setItem('token', access_token);
```

### 创建预约

```javascript
const response = await fetch('/api/bookings/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    resource_id: 'gpu-01',
    task_name: '深度学习训练',
    start_time: '2024-01-01T09:00:00',
    end_time: '2024-01-01T12:00:00'
  })
});
```

### 获取日历数据

```javascript
const params = new URLSearchParams({
  start_date: '2024-01-01T00:00:00',
  end_date: '2024-01-08T00:00:00'
});

const response = await fetch(`/api/bookings/calendar/data?${params}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});

const calendarData = await response.json();
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

此项目采用 MIT 许可证 - 查看 LICENSE 文件了解详情。
