#!/bin/bash

# kimochi心晴 - 环境配置重载脚本
# 用于在修改环境配置文件后让配置生效

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
    echo "kimochi心晴 - 环境配置重载脚本"
    echo
    echo "用法:"
    echo "  $0 local          # 重载本地开发环境配置"
    echo "  $0 production     # 重载服务器生产环境配置"
    echo "  $0 both           # 同时重载本地和服务器配置"
    echo
    echo "示例:"
    echo "  $0 local          # 修改.env.local后重启本地开发服务器"
    echo "  $0 production     # 修改服务器.env.prod.local后重启PM2"
    echo
}

# 重载本地开发环境
reload_local() {
    log_info "重载本地开发环境配置..."
    
    # 检查是否有开发服务器运行
    DEV_PID=$(pgrep -f "next.*dev|npm.*dev" 2>/dev/null || true)
    
    if [ -n "$DEV_PID" ]; then
        log_warning "检测到开发服务器正在运行 (PID: $DEV_PID)"
        log_info "停止开发服务器..."
        kill $DEV_PID 2>/dev/null || true
        sleep 2
        log_success "开发服务器已停止"
        echo
        log_info "请手动重启开发服务器:"
        log_info "npm run dev"
    else
        log_info "当前没有开发服务器运行"
        echo
        log_info "启动开发服务器:"
        log_info "npm run dev"
    fi
    
    echo
    log_success "本地环境配置重载完成"
    echo
    log_info "配置文件位置: .env.local"
    log_info "如需修改配置，请编辑该文件后重新运行此脚本"
}

# 重载服务器生产环境
reload_production() {
    log_info "重载服务器生产环境配置..."
    
    # 检查SSH密钥
    if [ ! -f "kimochi-prod.pem" ]; then
        log_error "未找到SSH密钥文件: kimochi-prod.pem"
        exit 1
    fi
    
    log_info "连接到生产服务器..."
    
    # 远程执行重载命令
    ssh -i kimochi-prod.pem root@47.104.8.84 "
        echo '=== 检查当前应用状态 ==='
        pm2 status | grep kimochi
        
        echo
        echo '=== 重载环境配置 ==='
        cd /opt/kimochi
        
        # 检查环境配置文件
        if [ ! -f '.env.prod.local' ]; then
            echo 'ERROR: 未找到生产环境配置文件 .env.prod.local'
            exit 1
        fi
        
        echo '环境配置文件存在，准备重载...'
        
        # 重启PM2应用
        echo '重启kimochi应用...'
        pm2 restart kimochi
        
        echo
        echo '=== 验证重载结果 ==='
        sleep 3
        pm2 status | grep kimochi
        
        echo
        echo '=== 应用健康检查 ==='
        curl -k -s https://localhost/api/health | head -1 || echo 'API检查失败'
        
        echo
        echo '✅ 生产环境配置重载完成'
    "
    
    if [ $? -eq 0 ]; then
        log_success "服务器环境配置重载成功"
        echo
        log_info "配置文件位置: /opt/kimochi/.env.prod.local"
        log_info "应用状态: 已重启并运行"
    else
        log_error "服务器环境配置重载失败"
        exit 1
    fi
}

# 主程序
case "${1:-}" in
    "local")
        reload_local
        ;;
    "production")
        reload_production
        ;;
    "both")
        reload_local
        echo
        echo "=================================="
        echo
        reload_production
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
