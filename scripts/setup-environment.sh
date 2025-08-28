#!/bin/bash

# kimochi心晴 - 环境配置管理脚本
# 基于config/environments/目录的模板创建环境配置文件

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

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENVIRONMENTS_DIR="$PROJECT_ROOT/config/environments"

show_help() {
    echo "kimochi心晴 - 环境配置管理工具"
    echo
    echo "用法:"
    echo "  $0 [环境名称]"
    echo
    echo "环境名称:"
    echo "  development  创建开发环境配置 (.env.local)"
    echo "  production   创建生产环境配置 (.env.prod.local)"
    echo
    echo "示例:"
    echo "  $0 development   # 创建开发环境配置"
    echo "  $0 production    # 创建生产环境配置"
}

# 生成JWT密钥
generate_jwt_secret() {
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || \
    openssl rand -hex 32 2>/dev/null || \
    head -c 32 /dev/urandom | xxd -p -c 32
}

# 创建环境配置
create_env_config() {
    local env_name="$1"
    local template_file="$ENVIRONMENTS_DIR/env.$env_name"
    local target_file
    
    case "$env_name" in
        "development")
            target_file="$PROJECT_ROOT/.env.local"
            ;;
        "production")
            target_file="$PROJECT_ROOT/.env.prod.local"
            ;;
        *)
            log_error "不支持的环境名称: $env_name"
            show_help
            exit 1
            ;;
    esac
    
    log_info "创建 $env_name 环境配置..."
    
    # 检查模板文件是否存在
    if [ ! -f "$template_file" ]; then
        log_error "配置模板不存在: $template_file"
        exit 1
    fi
    
    # 检查目标文件是否已存在
    if [ -f "$target_file" ]; then
        log_warning "配置文件已存在: $(basename "$target_file")"
        read -p "是否覆盖? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            exit 0
        fi
        
        # 备份现有文件
        backup_file="$target_file.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$target_file" "$backup_file"
        log_info "已备份现有配置: $(basename "$backup_file")"
    fi
    
    # 复制模板文件
    cp "$template_file" "$target_file"
    
    # 生成JWT密钥并替换占位符
    if grep -q "GENERATE_RANDOM_64_CHAR_STRING" "$target_file" 2>/dev/null; then
        log_info "生成JWT密钥..."
        JWT_SECRET=$(generate_jwt_secret)
        sed -i.tmp "s/GENERATE_RANDOM_64_CHAR_STRING/$JWT_SECRET/" "$target_file"
        rm -f "$target_file.tmp" # 清理sed的临时文件
        log_success "JWT密钥已生成并配置"
    fi
    
    log_success "环境配置已创建: $(basename "$target_file")"
    log_info "基于模板: $(basename "$template_file")"
    
    # 显示配置摘要
    echo
    echo "配置摘要:"
    echo "=========================================="
    grep -E "^(NODE_ENV|DATABASE_URL|DOMAIN|SUPER_ADMIN_EMAIL)=" "$target_file" 2>/dev/null | head -10
    echo "=========================================="
    echo
    log_warning "请检查并根据需要修改配置文件: $(basename "$target_file")"
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi
    
    case "$1" in
        "-h"|"--help"|"help")
            show_help
            ;;
        *)
            create_env_config "$1"
            ;;
    esac
}

main "$@"
