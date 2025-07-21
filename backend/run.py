#!/usr/bin/env python3
"""
OpenBook 后端服务启动脚本

使用方法:
    python run.py [--host HOST] [--port PORT] [--reload]

示例:
    python run.py                          # 默认配置启动
    python run.py --host 127.0.0.1        # 指定主机
    python run.py --port 8080             # 指定端口
    python run.py --reload                # 开发模式（自动重载）
"""

import argparse
import uvicorn
import os
from dotenv import load_dotenv

def main():
    # 加载环境变量
    load_dotenv()
    
    # 命令行参数解析
    parser = argparse.ArgumentParser(description='OpenBook 后端服务')
    parser.add_argument('--host', default=os.getenv('HOST', '0.0.0.0'), 
                       help='服务器主机地址')
    parser.add_argument('--port', type=int, default=int(os.getenv('PORT', 8000)), 
                       help='服务器端口')
    parser.add_argument('--reload', action='store_true', 
                       help='启用自动重载（开发模式）')
    parser.add_argument('--log-level', default=os.getenv('LOG_LEVEL', 'info').lower(),
                       choices=['debug', 'info', 'warning', 'error'],
                       help='日志级别')
    
    args = parser.parse_args()
    
    # 确保日志级别是小写
    log_level = args.log_level.lower()
    
    print("=" * 50)
    print("🚀 OpenBook 后端服务启动中...")
    print("=" * 50)
    print(f"📍 服务地址: http://{args.host}:{args.port}")
    print(f"📚 API文档: http://{args.host}:{args.port}/docs")
    print(f"📖 ReDoc文档: http://{args.host}:{args.port}/redoc")
    print(f"🔧 自动重载: {'开启' if args.reload else '关闭'}")
    print(f"📝 日志级别: {log_level.upper()}")
    print("=" * 50)
    
    # 启动服务器
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level=log_level,
        access_log=True
    )

if __name__ == "__main__":
    main()
