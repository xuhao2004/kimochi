#!/bin/bash

# kimochi心晴 - 小程序开发环境启动脚本
# 用于快速启动开发环境和配置

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m' 
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示使用方法
show_usage() {
    echo "kimochi心晴 - 小程序开发环境脚本"
    echo
    echo "用法:"
    echo "  $0 start          # 启动开发环境"
    echo "  $0 ngrok          # 启动内网穿透"
    echo "  $0 check          # 检查开发环境"
    echo "  $0 open           # 打开微信开发者工具"
    echo
    echo "示例:"
    echo "  $0 start          # 启动后端服务器"
    echo "  $0 ngrok          # 使用ngrok提供HTTPS访问"
    echo
}

# 检查依赖
check_dependencies() {
    log_info "检查开发环境依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    # 检查项目依赖
    if [ ! -d "node_modules" ]; then
        log_warning "项目依赖未安装，正在安装..."
        npm install
    fi
    
    log_success "依赖检查完成"
}

# 启动开发环境
start_dev() {
    log_info "启动小程序开发环境..."
    
    # 检查依赖
    check_dependencies
    
    # 检查端口占用
    if lsof -i :3001 &> /dev/null; then
        log_warning "端口 3001 已被占用"
        read -p "是否终止现有进程? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pkill -f "next.*dev" || true
            sleep 2
        else
            log_error "请手动终止占用端口 3001 的进程"
            exit 1
        fi
    fi
    
    # 确保使用开发环境配置
    if [ ! -f ".env.local" ]; then
        log_warning "开发环境配置不存在，正在创建..."
        ./scripts/setup-environment.sh development
    fi
    
    log_success "开发环境配置完成"
    echo
    echo "================================"
    echo "📱 小程序开发环境已启动"
    echo "================================"
    echo "🌐 后端服务器: http://localhost:3001"
    echo "📱 小程序目录: ./mini-program/"
    echo "🔧 开发工具: 微信开发者工具"
    echo
    echo "📋 接下来的步骤:"
    echo "1. 打开微信开发者工具"
    echo "2. 导入小程序项目: $(pwd)/mini-program/"
    echo "3. 在设置中开启'不校验合法域名'"
    echo "4. 在小程序个人中心切换到开发环境"
    echo
    echo "🚀 启动开发服务器..."
    
    # 启动开发服务器
    npm run dev
}

# 启动ngrok内网穿透
start_ngrok() {
    log_info "启动内网穿透 (ngrok)..."
    
    # 检查ngrok是否安装
    if ! command -v ngrok &> /dev/null; then
        log_error "ngrok 未安装"
        echo
        echo "安装方法:"
        echo "1. macOS: brew install ngrok"
        echo "2. 其他系统: https://ngrok.com/download"
        exit 1
    fi
    
    # 检查开发服务器是否运行
    if ! curl -s http://localhost:3001/api/health &> /dev/null; then
        log_warning "开发服务器未运行，请先运行: $0 start"
    fi
    
    echo
    echo "================================"
    echo "🌐 启动内网穿透"
    echo "================================"
    echo "📡 本地服务器: http://localhost:3001"
    echo "🌍 将提供HTTPS公网访问"
    echo
    echo "⚠️  注意:"
    echo "- 免费版ngrok链接每次重启会变化"
    echo "- 获得HTTPS链接后需要在小程序中配置"
    echo
    
    # 启动ngrok
    ngrok http 3001
}

# 检查开发环境状态
check_env() {
    echo "================================"
    echo "🔍 开发环境状态检查"
    echo "================================"
    
    # 检查Node.js版本
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js: $NODE_VERSION"
    else
        log_error "Node.js: 未安装"
    fi
    
    # 检查npm版本
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm: $NPM_VERSION"
    else
        log_error "npm: 未安装"
    fi
    
    # 检查开发服务器
    if curl -s http://localhost:3001/api/health &> /dev/null; then
        log_success "开发服务器: 运行中 (http://localhost:3001)"
    else
        log_warning "开发服务器: 未运行"
    fi
    
    # 检查ngrok
    if command -v ngrok &> /dev/null; then
        NGROK_VERSION=$(ngrok version | head -n1)
        log_success "ngrok: $NGROK_VERSION"
    else
        log_warning "ngrok: 未安装 (可选)"
    fi
    
    # 检查配置文件
    if [ -f ".env.local" ]; then
        log_success "开发配置: 存在"
    else
        log_warning "开发配置: 不存在"
    fi
    
    # 检查小程序目录
    if [ -d "mini-program" ]; then
        log_success "小程序代码: 存在"
        
        # 检查关键文件
        if [ -f "mini-program/app.js" ]; then
            log_success "  - app.js: 存在"
        else
            log_error "  - app.js: 缺失"
        fi
        
        if [ -f "mini-program/utils/api.js" ]; then
            log_success "  - api.js: 存在"
        else
            log_error "  - api.js: 缺失"
        fi
    else
        log_error "小程序代码: 不存在"
    fi
    
    echo
    echo "💡 如果发现问题，请运行相应命令修复:"
    echo "   安装依赖: npm install"
    echo "   创建配置: ./scripts/setup-environment.sh development"
    echo "   启动服务: ./scripts/miniprogram-dev.sh start"
}

# 打开微信开发者工具
open_devtools() {
    log_info "尝试打开微信开发者工具..."
    
    # macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # 尝试不同的可能路径
        if [ -d "/Applications/wechatwebdevtools.app" ]; then
            open -a "wechatwebdevtools" "$(pwd)/mini-program"
            log_success "已打开微信开发者工具"
        else
            log_warning "未找到微信开发者工具"
            echo "请手动打开微信开发者工具并导入项目:"
            echo "项目路径: $(pwd)/mini-program/"
        fi
    else
        log_warning "当前系统不支持自动打开开发者工具"
        echo "请手动打开微信开发者工具并导入项目:"
        echo "项目路径: $(pwd)/mini-program/"
    fi
}

# 主程序
case "${1:-}" in
    "start")
        start_dev
        ;;
    "ngrok")
        start_ngrok
        ;;
    "check")
        check_env
        ;;
    "open")
        open_devtools
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
