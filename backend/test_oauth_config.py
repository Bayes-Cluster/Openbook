#!/usr/bin/env python3
import os
from dotenv import load_dotenv

load_dotenv()

# 检查OAuth配置
oauth_config = {
    'OAUTH_CLIENT_ID': os.getenv('OAUTH_CLIENT_ID'),
    'OAUTH_CLIENT_SECRET': os.getenv('OAUTH_CLIENT_SECRET'),
    'OAUTH_AUTHORIZATION_URL': os.getenv('OAUTH_AUTHORIZATION_URL'),
    'OAUTH_TOKEN_URL': os.getenv('OAUTH_TOKEN_URL'),
    'OAUTH_USER_INFO_URL': os.getenv('OAUTH_USER_INFO_URL'),
    'OAUTH_REDIRECT_URI': os.getenv('OAUTH_REDIRECT_URI')
}

print('OAuth配置检查:')
for key, value in oauth_config.items():
    if value:
        print(f'{key}: ✓ 已配置')
    else:
        print(f'{key}: ✗ 未配置')

# 尝试导入oauth_service模块
try:
    from oauth_service import oauth_service
    print('\n✓ OAuth服务模块导入成功')
    
    # 尝试获取提供商信息
    try:
        provider_info = oauth_service.get_provider_info()
        print(f'✓ OAuth提供商: {provider_info.get("name", "未知")}')
    except Exception as e:
        print(f'✗ 获取提供商信息失败: {e}')
        
except Exception as e:
    print(f'\n✗ OAuth服务模块导入失败: {e}')
