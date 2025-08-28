#!/bin/bash

# kimochi心晴 - 本地更新打包脚本
# 将本地更改打包并上传到服务器

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_IP="47.104.8.84"
SSH_KEY="kimochi-prod.pem"
SERVER_USER="root"

show_help() {
    echo "kimochi心晴 - 本地更新工具"
    echo
    echo "用法:"
    echo "  $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help        显示帮助信息"
    echo "  -b, --branch      指定分支 (默认: 当前分支)"
    echo "  -m, --message     提交消息"
    echo "  -u, --upload      直接上传到服务器"
    echo "  -d, --deploy      打包、上传并部署"
    echo
    echo "示例:"
    echo "  $0 -m \"修复用户登录问题\" -d"
    echo "  $0 -b prod -u"
}

# 检查Git状态
check_git_status() {
    log_info "检查Git状态..."
    
    cd "$PROJECT_ROOT"
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        log_warning "发现未提交的更改:"
        git status --porcelain
        echo
        
        if [ -z "$COMMIT_MESSAGE" ]; then
            read -p "请输入提交消息: " COMMIT_MESSAGE
        fi
        
        if [ -n "$COMMIT_MESSAGE" ]; then
            log_info "提交更改..."
            git add -A
            git commit -m "$COMMIT_MESSAGE"
            log_success "更改已提交"
        else
            log_error "需要提交消息才能继续"
            return 1
        fi
    else
        log_info "没有未提交的更改"
    fi
}

# 创建更新包
create_update_package() {
    log_info "创建更新包..."
    
    cd "$PROJECT_ROOT"
    
    # 获取当前分支和提交信息
    CURRENT_BRANCH=$(git branch --show-current)
    COMMIT_HASH=$(git rev-parse --short HEAD)
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    PACKAGE_NAME="kimochi-update-${CURRENT_BRANCH}-${COMMIT_HASH}-${TIMESTAMP}.tar.gz"
    
    log_info "分支: $CURRENT_BRANCH"
    log_info "提交: $COMMIT_HASH"
    log_info "包名: $PACKAGE_NAME"
    
    # 创建压缩包
    tar -czf "$PACKAGE_NAME" \
        --exclude=node_modules \
        --exclude=.next-dev \
        --exclude=.git \
        --exclude=*.log \
        --exclude=.env.local \
        --exclude=kimochi-*.tar.gz \
        .
        
    log_success "更新包创建完成: $PACKAGE_NAME"
    echo "包大小: $(du -h "$PACKAGE_NAME" | cut -f1)"
    
    echo "$PACKAGE_NAME"
}

# 上传更新包
upload_package() {
    local package_name="$1"
    
    log_info "上传更新包到服务器..."
    
    # 确保服务器目录存在
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "mkdir -p /tmp/kimochi-update"
    
    # 上传包
    scp -i "$SSH_KEY" "$package_name" "$SERVER_USER@$SERVER_IP:/tmp/kimochi-update/"
    
    log_success "更新包上传完成"
    
    # 清理本地包
    rm "$package_name"
    log_info "本地临时文件已清理"
}

# 触发服务器部署
trigger_deploy() {
    log_info "触发服务器部署..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "kimochi-update apply"
    
    log_success "部署完成！"
    
    # 健康检查
    log_info "执行健康检查..."
    sleep 3
    
    if curl -s "http://$SERVER_IP/api/health" > /dev/null; then
        log_success "应用运行正常！"
        log_info "访问地址: http://$SERVER_IP"
    else
        log_warning "应用可能需要更多时间启动"
    fi
}

# 主函数
main() {
    local BRANCH=""
    local COMMIT_MESSAGE=""
    local UPLOAD_ONLY=false
    local FULL_DEPLOY=false
    
    # 参数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                return 0
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -m|--message)
                COMMIT_MESSAGE="$2"
                shift 2
                ;;
            -u|--upload)
                UPLOAD_ONLY=true
                shift
                ;;
            -d|--deploy)
                FULL_DEPLOY=true
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                return 1
                ;;
        esac
    done
    
    # 检查必需文件
    if [ ! -f "$PROJECT_ROOT/$SSH_KEY" ]; then
        log_error "SSH密钥文件不存在: $SSH_KEY"
        return 1
    fi
    
    # 切换分支
    if [ -n "$BRANCH" ]; then
        log_info "切换到分支: $BRANCH"
        git checkout "$BRANCH"
    fi
    
    # 检查Git状态
    check_git_status
    
    # 创建更新包
    PACKAGE_NAME=$(create_update_package)
    
    # 上传
    if [ "$UPLOAD_ONLY" = true ] || [ "$FULL_DEPLOY" = true ]; then
        upload_package "$PACKAGE_NAME"
    fi
    
    # 完整部署
    if [ "$FULL_DEPLOY" = true ]; then
        trigger_deploy
    fi
    
    if [ "$UPLOAD_ONLY" = false ] && [ "$FULL_DEPLOY" = false ]; then
        log_info "更新包已创建: $PACKAGE_NAME"
        log_info "要上传到服务器，请运行:"
        echo "  $0 -u"
        echo "或者完整部署："
        echo "  $0 -d"
    fi
}

main "$@"
