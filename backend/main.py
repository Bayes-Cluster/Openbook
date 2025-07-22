from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import asyncio
from contextlib import asynccontextmanager

from database import create_tables, init_db, SessionLocal
from routers import auth, bookings, resources, users
from services import BookingService

# 后台任务标志
background_tasks_active = True

async def status_update_task():
    """后台状态更新任务"""
    global background_tasks_active
    
    while background_tasks_active:
        try:
            db = SessionLocal()
            booking_service = BookingService(db)
            updated_count = booking_service.update_booking_statuses()
            
            if updated_count and updated_count > 0:
                print(f"[后台任务] 自动更新了 {updated_count} 个预约状态")
            
            db.close()
            
        except Exception as e:
            print(f"[后台任务] 状态更新失败: {e}")
            # 不打印完整错误堆栈，避免日志过多
        
        # 每分钟检查一次
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时
    print("启动数据库和后台任务...")
    create_tables()
    init_db()
    
    # 启动后台任务
    task = asyncio.create_task(status_update_task())
    print("后台状态更新任务已启动")
    
    yield
    
    # 关闭时
    global background_tasks_active
    background_tasks_active = False
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    print("后台任务已关闭")

# 创建FastAPI应用实例
app = FastAPI(
    title="OpenBook API",
    description="显卡资源预约与管理系统后端API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
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
