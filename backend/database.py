from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os
from dotenv import load_dotenv

load_dotenv()

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./openbook.db")

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建数据库表
def create_tables():
    Base.metadata.create_all(bind=engine)

# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 初始化数据库数据
def init_db():
    from models import User, Resource
    from datetime import datetime
    import uuid
    
    db = SessionLocal()
    
    try:
        # 检查是否已有数据
        user_count = db.query(User).count()
        if user_count > 0:
            db.close()
            return
    except Exception as e:
        print(f"检查用户数据时出错: {e}")
        # 如果表不存在，继续创建数据
        pass
    
    try:
        # 创建示例用户
        users = [
            User(
                id="admin",
                name="Administrator",
                email="admin@example.com",
                group="admin"
            )
        ]
        
        for user in users:
            db.add(user)
        
        # 创建GPU资源
        resources = [
            Resource(
                id="gpu-01",
                name="RTX-4090D-1",
                description="NVIDIA RTX 4090D 24G - Deep Leraning"
            ),
            Resource(
                id="gpu-02",
                name="RTX-4090D-2",
                description="NVIDIA RTX 4090D 24G - Deep Learning"
            ),
            Resource(
                id="gpu-03",
                name="RTX-3080-20G",
                description="NVIDIA RTX 3080 20G - General Purpose"
            )
        ]
        
        for resource in resources:
            db.add(resource)
        
        db.commit()
        print("数据库初始化完成")
        
    except Exception as e:
        print(f"数据库初始化失败: {e}")
        db.rollback()
    finally:
        db.close()
