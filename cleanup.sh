#!/bin/bash
# OpenBook 项目清理脚本

echo "开始清理不需要的文件..."

# 删除旧的前端文件
echo "删除旧的前端文件..."
rm -f index.html
rm -f script.js
rm -f script-integrated.js
rm -f api.js
rm -f styles.css

# 删除测试文件
echo "删除测试文件..."
rm -f test-api.html
rm -f test-multi-booking.html
rm -f test-multi-booking.js

# 删除构建文件和缓存
echo "删除构建缓存..."
rm -rf dist/
rm -rf frontend/.next/

# 删除空目录
echo "删除空目录..."
rmdir pages/ 2>/dev/null || true

# 删除开发数据库（可选）
echo "删除开发数据库..."
read -p "是否删除开发数据库文件 openbook.db? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f openbook.db
    echo "已删除数据库文件"
else
    echo "保留数据库文件"
fi

# 删除文档文件（可选）
echo "处理文档文件..."
read -p "是否删除功能文档文件? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f CALENDAR_MEMORY_BOOKING_UPDATES.md
    rm -f GPU_Memory_Management_Admin_Panel.md
    rm -f MEMORY_AWARE_BOOKING_SUMMARY.md
    rm -f User_Booking_Memory_Feature.md
    echo "已删除功能文档"
else
    echo "保留功能文档"
fi

echo "清理完成！"
echo ""
echo "保留的核心文件："
echo "- backend/ (后端代码)"
echo "- frontend/ (现代化前端)"
echo "- README.md (项目说明)"
echo "- .git/ 和 .gitignore (版本控制)"
echo "- contribute/ (贡献指南，如果选择保留)"
