#!/bin/bash

# kimochi心晴 - 小程序开发环境自动配置脚本
# 一键配置小程序开发环境

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }

echo "================================"
echo "📱 kimochi心晴小程序开发环境配置"
echo "================================"
echo

# 步骤1: 检查依赖
log_step "步骤 1/6: 检查系统依赖"
echo

# 检查Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js 已安装: $NODE_VERSION"
else
    log_error "Node.js 未安装，请先安装 Node.js"
    echo "安装指南: https://nodejs.org/"
    exit 1
fi

# 检查npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    log_success "npm 已安装: $NPM_VERSION"
else
    log_error "npm 未安装"
    exit 1
fi

# 检查微信开发者工具 (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -d "/Applications/wechatwebdevtools.app" ]; then
        log_success "微信开发者工具 已安装"
    else
        log_warning "未找到微信开发者工具"
        echo "请从以下地址下载安装:"
        echo "https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html"
    fi
fi

echo

# 步骤2: 安装项目依赖
log_step "步骤 2/6: 安装项目依赖"
echo

if [ ! -d "node_modules" ]; then
    log_info "正在安装项目依赖..."
    npm install
    log_success "项目依赖安装完成"
else
    log_success "项目依赖已存在"
fi

echo

# 步骤3: 配置开发环境
log_step "步骤 3/6: 配置开发环境变量"
echo

if [ ! -f ".env.local" ]; then
    log_info "创建开发环境配置..."
    ./scripts/setup-environment.sh development
    log_success "开发环境配置已创建"
else
    log_success "开发环境配置已存在"
    
    # 询问是否重新生成
    read -p "是否重新生成开发环境配置? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/setup-environment.sh development
        log_success "开发环境配置已重新生成"
    fi
fi

echo

# 步骤4: 验证小程序配置
log_step "步骤 4/6: 验证小程序配置"
echo

# 检查关键文件
MINIPROGRAM_DIR="mini-program"

if [ ! -d "$MINIPROGRAM_DIR" ]; then
    log_error "小程序目录不存在: $MINIPROGRAM_DIR"
    exit 1
fi

# 检查关键文件
key_files=(
    "app.js"
    "app.json" 
    "app.wxss"
    "utils/api.js"
    "utils/util.js"
    "project.config.json"
)

for file in "${key_files[@]}"; do
    if [ -f "$MINIPROGRAM_DIR/$file" ]; then
        log_success "✓ $file"
    else
        log_error "✗ $file (缺失)"
    fi
done

echo

# 步骤5: 配置开发者工具设置
log_step "步骤 5/6: 配置微信开发者工具"
echo

echo "请手动在微信开发者工具中进行以下配置:"
echo
echo "1. 打开微信开发者工具"
echo "2. 导入项目: $(pwd)/$MINIPROGRAM_DIR"
echo "3. 在「详情」→「本地设置」中配置:"
echo "   ✅ 不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书"
echo "   ✅ 不校验Sitemap索引规则"  
echo "   ✅ 启用调试基础库"
echo "   ✅ 启用ES6转ES5"
echo "   ✅ 启用上传时压缩代码"
echo "   ❌ 关闭代码压缩上传 (开发时)"
echo

read -p "按 Enter 继续..."

# 步骤6: 测试开发环境
log_step "步骤 6/6: 测试开发环境"
echo

# 启动开发服务器进行测试
log_info "启动开发服务器进行连接测试..."

# 检查端口是否被占用
if lsof -i :3001 &> /dev/null; then
    log_warning "端口 3001 已被占用，跳过服务器测试"
else
    # 在后台启动服务器
    npm run dev &
    SERVER_PID=$!
    
    # 等待服务器启动
    log_info "等待服务器启动..."
    sleep 5
    
    # 测试连接
    if curl -s http://localhost:3001/api/health &> /dev/null; then
        log_success "开发服务器连接正常 ✓"
    else
        log_warning "开发服务器连接测试失败"
    fi
    
    # 停止测试服务器
    kill $SERVER_PID 2>/dev/null || true
    sleep 2
fi

echo
echo "================================"
echo "🎉 小程序开发环境配置完成！"
echo "================================"
echo
echo "📋 接下来的步骤:"
echo
echo "1. 💻 启动开发环境:"
echo "   ./scripts/miniprogram-dev.sh start"
echo
echo "2. 📱 在微信开发者工具中:"
echo "   - 导入项目: $(pwd)/$MINIPROGRAM_DIR"
echo "   - 确认「本地设置」已正确配置"
echo "   - 点击「预览」开始开发"
echo
echo "3. 🔄 切换API环境:"
echo "   在小程序「个人中心」→「开发者工具」中切换"
echo
echo "4. 🌐 如需HTTPS访问 (可选):"
echo "   ./scripts/miniprogram-dev.sh ngrok"
echo
echo "📚 详细说明请查看:"
echo "   - 开发指南: MINIPROGRAM-DEV-GUIDE.md"
echo "   - 环境配置: CONFIG-RELOAD-GUIDE.md"
echo
echo "⚡ 快速命令:"
echo "   检查状态: ./scripts/miniprogram-dev.sh check"
echo "   打开工具: ./scripts/miniprogram-dev.sh open"
echo
echo "🎊 Happy coding! 祝您开发愉快！"
