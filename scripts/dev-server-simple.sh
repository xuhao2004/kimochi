#!/bin/bash

# 简化的开发服务器启动脚本
# 绕过npm配置问题

echo "🚀 启动简化开发服务器..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    exit 1
fi

# 检查.env.local文件
if [ ! -f ".env.local" ]; then
    echo "❌ 缺少.env.local文件"
    echo "💡 运行: cp config/environments/env.development .env.local"
    exit 1
fi

echo "📦 正在启动Next.js开发服务器..."

# 设置环境变量并启动
export NODE_ENV=development
export PORT=3001
export HOST=127.0.0.1

# 加载.env.local环境变量
if command -v dotenv &> /dev/null; then
    # 如果dotenv可用
    npx dotenv -e .env.local -- npx next dev -H $HOST -p $PORT
else
    # 如果dotenv不可用，直接启动
    echo "⚠️  dotenv不可用，使用基础模式启动"
    npx next dev -H $HOST -p $PORT
fi
