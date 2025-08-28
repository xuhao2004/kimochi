#!/bin/bash

# kimochi心晴 - 智能部署脚本
# 支持本地部署和GitHub部署，针对青岛2核2G服务器优化

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

# 配置变量
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
SSH_KEY_PATH="${PROJECT_ROOT}/kimochi-prod.pem"
SERVER_IP="47.104.8.84"
SERVER_USER="root"
DEPLOY_PATH="/opt/kimochi"
GITHUB_REPO="https://github.com/xuhao2004/kimochi.git"
BRANCH="prod"

# 全局变量
DEPLOYMENT_ID=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_LOG="/tmp/kimochi_deploy_${DEPLOYMENT_ID}.log"

# 显示帮助信息
show_help() {
    cat << 'EOF'
kimochi心晴 - 智能部署脚本

用法: ./scripts/deploy.sh [COMMAND] [OPTIONS]

命令:
  init          初始化服务器环境 (首次部署必须)
  deploy        部署应用到生产服务器
  github        从GitHub部署 (推荐)
  local         从本地部署
  status        检查服务器和应用状态
  logs          查看应用日志
  restart       重启应用
  backup        创建数据备份
  rollback      回滚到上一个版本
  help          显示此帮助信息

选项:
  --branch      指定Git分支 (默认: prod)
  --force       强制部署，跳过检查
  --no-build    跳过构建步骤 (仅限本地部署)
  --backup      部署前创建备份

示例:
  ./scripts/deploy.sh init                    # 初始化服务器
  ./scripts/deploy.sh github                  # 从GitHub部署
  ./scripts/deploy.sh deploy --backup         # 部署前备份
  ./scripts/deploy.sh github --branch dev     # 部署dev分支

服务器信息:
  IP: 47.104.8.84
  配置: 2核2G (青岛阿里云)
  系统: Ubuntu (已优化配置)
  
EOF
}

# 记录部署日志
log_deploy() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$DEPLOYMENT_LOG"
    log_info "$1"
}

# 检查依赖
check_dependencies() {
    log_step "检查系统依赖..."
    
    local missing_deps=()
    
    # 检查必需工具
    for cmd in node npm git ssh scp; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少必需依赖: ${missing_deps[*]}"
        log_info "请安装缺少的工具后重试"
        exit 1
    fi
    
    # 检查Node.js版本
    local node_version=$(node --version | grep -o 'v[0-9]*' | grep -o '[0-9]*')
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js版本过低，需要v18+，当前: $(node --version)"
        exit 1
    fi
    
    # 检查SSH密钥
    if [[ ! -f "$SSH_KEY_PATH" ]]; then
        log_error "SSH密钥文件不存在: $SSH_KEY_PATH"
        log_info "请确保kimochi-prod.pem文件存在并具有正确权限"
        exit 1
    fi
    
    # 检查SSH密钥权限
    if [[ "$(stat -f %A "$SSH_KEY_PATH" 2>/dev/null || stat -c %a "$SSH_KEY_PATH")" != "600" ]]; then
        log_warning "修复SSH密钥权限..."
        chmod 600 "$SSH_KEY_PATH"
    fi
    
    log_success "依赖检查通过"
}

# 连接服务器执行命令
ssh_exec() {
    ssh -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        -o ServerAliveInterval=60 \
        "$SERVER_USER@$SERVER_IP" "$@"
}

# 复制文件到服务器
scp_upload() {
    scp -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        -r "$@" "$SERVER_USER@$SERVER_IP:"
}

# 测试服务器连接
test_server_connection() {
    log_step "测试服务器连接..."
    
    if ! ssh_exec "echo 'Server connection OK'" &>/dev/null; then
        log_error "无法连接到服务器 $SERVER_IP"
        log_info "请检查:"
        log_info "1. 服务器IP地址是否正确"
        log_info "2. SSH密钥是否有效"
        log_info "3. 防火墙是否允许SSH连接"
        exit 1
    fi
    
    log_success "服务器连接正常"
}

# 初始化服务器环境
init_server() {
    log_step "初始化服务器环境..."
    
    test_server_connection
    
    # 上传初始化脚本
    log_info "上传服务器初始化脚本..."
    scp_upload "$PROJECT_ROOT/scripts/server-init.sh" "/tmp/"
    
    # 执行初始化脚本
    log_info "执行服务器初始化..."
    ssh_exec "chmod +x /tmp/server-init.sh && /tmp/server-init.sh"
    
    log_success "服务器环境初始化完成"
}

# 本地构建
build_locally() {
    log_step "本地构建应用..."
    
    cd "$PROJECT_ROOT"
    
    # 检查环境配置
    if [[ ! -f ".env.prod.local" ]]; then
        log_error "生产环境配置文件不存在: .env.prod.local"
        log_info "请创建并配置 .env.prod.local 文件"
        exit 1
    fi
    
    # 安装依赖
    log_info "安装依赖..."
    npm ci --registry https://registry.npmmirror.com --production=false
    
    # 生成Prisma Client
    log_info "生成数据库客户端..."
    npx dotenv -e .env.prod.local -- npx prisma generate
    
    # 运行检查
    log_info "运行代码质量检查..."
    npm run test:type
    npm run test:lint
    
    # 构建应用
    log_info "构建生产版本..."
    npm run build
    
    log_success "本地构建完成"
}

# 创建部署包
create_deployment_package() {
    log_step "创建部署包..."
    
    cd "$PROJECT_ROOT"
    
    local package_name="kimochi_${DEPLOYMENT_ID}.tar.gz"
    
    # 创建部署包，排除不必要的文件
    tar -czf "/tmp/$package_name" \
        --exclude=node_modules \
        --exclude=.next-dev \
        --exclude=.git \
        --exclude=*.log \
        --exclude=.env.local \
        --exclude=.env.development \
        .next-prod \
        public \
        package*.json \
        prisma \
        scripts \
        ecosystem.config.js \
        nginx.conf \
        .env.prod.local \
        next.config.* \
        tsconfig.json \
        tailwind.config.* \
        postcss.config.*
    
    echo "/tmp/$package_name"
    log_success "部署包创建完成: $package_name"
}

# 备份当前部署
backup_current_deployment() {
    log_step "备份当前部署..."
    
    ssh_exec "
        if [ -d '$DEPLOY_PATH' ]; then
            mkdir -p '$DEPLOY_PATH/backups'
            cd '$DEPLOY_PATH'
            tar -czf 'backups/backup_$(date +%Y%m%d_%H%M%S).tar.gz' \
                .next-prod \
                prisma \
                .env.prod.local \
                uploads \
                2>/dev/null || true
            
            # 清理超过5个的备份
            cd backups
            ls -t backup_*.tar.gz | tail -n +6 | xargs -r rm -f
            echo '备份完成'
        else
            echo '未找到现有部署，跳过备份'
        fi
    "
    
    log_success "备份完成"
}

# 从本地部署
deploy_local() {
    log_deploy "开始本地部署"
    
    local skip_build=${1:-false}
    local create_backup=${2:-false}
    
    test_server_connection
    
    # 检查服务器环境
    if ! ssh_exec "[ -d '$DEPLOY_PATH' ]"; then
        log_warning "服务器环境未初始化，正在初始化..."
        init_server
    fi
    
    # 创建备份
    if [ "$create_backup" = true ]; then
        backup_current_deployment
    fi
    
    # 构建
    if [ "$skip_build" = false ]; then
        build_locally
    fi
    
    # 创建部署包
    local package_path=$(create_deployment_package)
    local package_name=$(basename "$package_path")
    
    # 上传部署包
    log_step "上传部署包到服务器..."
    scp_upload "$package_path" "$DEPLOY_PATH/"
    
    # 部署
    log_step "在服务器上执行部署..."
    ssh_exec "
        cd '$DEPLOY_PATH'
        
        # 停止现有服务
        pm2 stop kimochi || true
        
        # 解压新版本
        tar -xzf '$package_name'
        
        # 安装生产依赖
        npm ci --only=production --registry https://registry.npmmirror.com
        
        # 数据库迁移
        npx prisma generate
        npx prisma db push --accept-data-loss || npx prisma migrate deploy || true
        
        # 更新权限
        chown -R root:root .
        chmod -R 755 .
        
        # 配置Nginx
        if [ -f nginx.conf ]; then
            cp nginx.conf /etc/nginx/sites-available/kimochi
            ln -sf /etc/nginx/sites-available/kimochi /etc/nginx/sites-enabled/
            rm -f /etc/nginx/sites-enabled/default
            nginx -t && systemctl reload nginx
        fi
        
        # 启动应用
        pm2 start ecosystem.config.js --env production
        pm2 save
        
        # 清理部署文件
        rm -f '$package_name'
        
        echo '部署完成'
    "
    
    # 清理本地文件
    rm -f "$package_path"
    
    # 健康检查
    health_check
    
    log_deploy "本地部署完成"
    log_success "部署完成！访问地址: http://$SERVER_IP"
}

# 从GitHub部署
deploy_github() {
    log_deploy "开始GitHub部署"
    
    local branch=${1:-$BRANCH}
    local create_backup=${2:-false}
    
    test_server_connection
    
    # 检查服务器环境
    if ! ssh_exec "[ -d '$DEPLOY_PATH' ]"; then
        log_warning "服务器环境未初始化，正在初始化..."
        init_server
    fi
    
    # 创建备份
    if [ "$create_backup" = true ]; then
        backup_current_deployment
    fi
    
    # 在服务器上执行GitHub部署
    log_step "在服务器上执行GitHub部署..."
    ssh_exec "
        set -e
        
        # 准备部署目录
        cd '$DEPLOY_PATH'
        
        # 停止现有服务
        pm2 stop kimochi || true
        
        # 克隆或更新代码
        if [ -d '.git' ]; then
            echo '更新现有仓库...'
            git fetch origin
            git reset --hard origin/$branch
        else
            echo '克隆仓库...'
            git clone -b $branch $GITHUB_REPO .
        fi
        
        # 创建生产环境配置
        if [ ! -f '.env.prod.local' ]; then
            echo '创建默认生产环境配置...'
            cat > .env.prod.local << 'EOL'
NODE_ENV=\"production\"
DATABASE_URL=\"file:./prisma/production.db\"
JWT_SECRET=\"\$(openssl rand -hex 32)\"
PORT=\"3000\"
NEXT_PUBLIC_APP_NAME=\"kimochi心晴\"
DOMAIN=\"47.104.8.84\"
DOMAINS=\"47.104.8.84,kimochi.space\"
SUPER_ADMIN_EMAIL=\"admin@kimochi.space\"
SUPER_ADMIN_PASSWORD=\"kimochi@2025\"
SUPER_ADMIN_NAME=\"超级管理员\"
NEXT_PUBLIC_DISABLE_VERIFICATION_CODE=\"1\"
DISABLE_VERIFICATION_CODE=\"1\"
DISABLE_WECHAT_WEB_OAUTH=\"1\"
NEXT_PUBLIC_ENABLE_OLD_EMAIL_UNAVAILABLE=\"1\"
EOL
        fi
        
        # 安装依赖
        npm ci --registry https://registry.npmmirror.com
        
        # 生成Prisma Client
        npx prisma generate
        
        # 构建应用
        npm run build
        
        # 数据库迁移
        npx prisma db push --accept-data-loss || npx prisma migrate deploy || true
        
        # 配置Nginx
        if [ -f nginx.conf ]; then
            cp nginx.conf /etc/nginx/sites-available/kimochi
            ln -sf /etc/nginx/sites-available/kimochi /etc/nginx/sites-enabled/
            rm -f /etc/nginx/sites-enabled/default
            nginx -t && systemctl reload nginx
        fi
        
        # 启动应用
        pm2 start ecosystem.config.js --env production
        pm2 save
        
        echo 'GitHub部署完成'
    "
    
    # 健康检查
    health_check
    
    log_deploy "GitHub部署完成"
    log_success "部署完成！访问地址: http://$SERVER_IP"
}

# 健康检查
health_check() {
    log_step "执行健康检查..."
    
    # 等待应用启动
    sleep 5
    
    local max_attempts=6
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "健康检查 (尝试 $attempt/$max_attempts)..."
        
        if ssh_exec "curl -s -f http://localhost:3000/api/health" &>/dev/null; then
            log_success "应用健康检查通过"
            
            # 显示应用状态
            ssh_exec "
                echo '=== 应用状态 ==='
                pm2 status
                echo
                echo '=== 系统资源 ==='
                free -h | grep Mem
                df -h / | tail -1
            "
            return 0
        fi
        
        log_warning "健康检查失败，等待重试..."
        sleep 10
        ((attempt++))
    done
    
    log_error "健康检查失败，应用可能存在问题"
    log_info "查看日志: ./scripts/deploy.sh logs"
    return 1
}

# 检查状态
check_status() {
    log_step "检查服务器和应用状态..."
    
    test_server_connection
    
    ssh_exec "
        echo '=== kimochi心晴系统状态 ==='
        echo '时间: \$(date)'
        echo '服务器: \$(hostname -f)'
        echo
        
        echo '=== 系统资源 ==='
        echo '内存使用:'
        free -h | grep -E 'Mem|Swap'
        echo
        echo '磁盘使用:'
        df -h /
        echo
        echo 'CPU负载:'
        uptime
        echo
        
        echo '=== 服务状态 ==='
        echo 'PM2进程:'
        pm2 status
        echo
        echo 'Nginx状态:'
        systemctl status nginx --no-pager | head -5
        echo
        
        echo '=== 应用检查 ==='
        if curl -s http://localhost:3000/api/health &>/dev/null; then
            echo '✓ 应用健康检查: 正常'
        else
            echo '✗ 应用健康检查: 异常'
        fi
        
        if [ -f '$DEPLOY_PATH/.git/HEAD' ]; then
            echo \"当前部署版本: \$(cd $DEPLOY_PATH && git rev-parse --short HEAD)\"
            echo \"当前分支: \$(cd $DEPLOY_PATH && git branch --show-current)\"
        fi
    "
}

# 查看日志
view_logs() {
    log_step "查看应用日志..."
    
    test_server_connection
    
    ssh_exec "
        echo '=== PM2应用日志 ==='
        pm2 logs kimochi --lines 50 --nostream
    "
}

# 重启应用
restart_app() {
    log_step "重启应用..."
    
    test_server_connection
    
    ssh_exec "
        pm2 restart kimochi
        echo '应用重启完成'
    "
    
    # 健康检查
    health_check
}

# 创建备份
create_backup() {
    log_step "创建数据备份..."
    
    test_server_connection
    
    ssh_exec "
        cd '$DEPLOY_PATH'
        
        # 执行备份脚本
        if [ -f scripts/backup.sh ]; then
            ./scripts/backup.sh
        else
            # 手动备份
            mkdir -p backups
            BACKUP_FILE=\"backups/manual_backup_\$(date +%Y%m%d_%H%M%S).tar.gz\"
            tar -czf \"\$BACKUP_FILE\" prisma/*.db* uploads .env.* 2>/dev/null || true
            echo \"手动备份完成: \$BACKUP_FILE\"
        fi
    "
}

# 主函数
main() {
    local command=${1:-help}
    local branch="prod"
    local force_deploy=false
    local skip_build=false
    local create_backup=false
    
    # 解析参数
    shift || true
    while [[ $# -gt 0 ]]; do
        case $1 in
            --branch)
                branch="$2"
                shift 2
                ;;
            --force)
                force_deploy=true
                shift
                ;;
            --no-build)
                skip_build=true
                shift
                ;;
            --backup)
                create_backup=true
                shift
                ;;
            *)
                log_warning "未知参数: $1"
                shift
                ;;
        esac
    done
    
    # 创建部署日志
    echo "部署开始时间: $(date)" > "$DEPLOYMENT_LOG"
    echo "命令: $command" >> "$DEPLOYMENT_LOG"
    echo "参数: 分支=$branch, 强制=$force_deploy, 跳过构建=$skip_build, 备份=$create_backup" >> "$DEPLOYMENT_LOG"
    
    case $command in
        "init")
            check_dependencies
            init_server
            ;;
        "deploy"|"local")
            check_dependencies
            deploy_local $skip_build $create_backup
            ;;
        "github")
            check_dependencies
            deploy_github $branch $create_backup
            ;;
        "status")
            check_dependencies
            check_status
            ;;
        "logs")
            check_dependencies
            view_logs
            ;;
        "restart")
            check_dependencies
            restart_app
            ;;
        "backup")
            check_dependencies
            create_backup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 错误处理
trap 'log_error "部署脚本执行失败，请检查日志: $DEPLOYMENT_LOG"' ERR

# 执行主函数
main "$@"
