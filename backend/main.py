from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os

from database import create_tables, init_db
from routers import auth, bookings, resources, users

# 创建FastAPI应用实例
app = FastAPI(
    title="OpenBook API",
    description="显卡资源预约与管理系统后端API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该指定具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """应用启动时的初始化操作"""
    print("正在初始化数据库...")
    create_tables()
    init_db()
    print("数据库初始化完成")
    print("OpenBook API 服务已启动")
    print("API文档地址: http://localhost:8000/docs")

@app.get("/", summary="API根路径")
async def root():
    """API根路径，返回基本信息"""
    return {
        "message": "欢迎使用 OpenBook API",
        "version": "1.0.0",
        "description": "显卡资源预约与管理系统",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/api/health", summary="健康检查")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "message": "OpenBook API 运行正常"
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """HTTP异常处理器"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """通用异常处理器"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "内部服务器错误",
            "status_code": 500
        }
    )

if __name__ == "__main__":
    # 运行应用
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开发模式下启用自动重载
        log_level="info"
    )
