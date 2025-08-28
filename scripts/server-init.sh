#!/bin/bash

# kimochi心晴 - 服务器初始化脚本
# 专为青岛阿里云轻量应用服务器(2核2G)优化
# 使用中国镜像源，优化低配置服务器性能

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

# 服务器配置
DEPLOY_PATH="/opt/kimochi"
SWAP_SIZE="1G"

main() {
    log_info "开始初始化kimochi心晴服务器环境..."
    log_info "目标服务器: 青岛阿里云 2核2G (已优化)"
    
    # 检查系统
    if ! command -v apt-get &> /dev/null; then
        log_error "此脚本仅支持Ubuntu/Debian系统"
        exit 1
    fi
    
    # 1. 系统更新 (使用阿里云镜像)
    log_info "配置阿里云镜像源并更新系统..."
    cp /etc/apt/sources.list /etc/apt/sources.list.backup
    
    # 获取Ubuntu版本代号
    UBUNTU_CODENAME=$(lsb_release -cs)
    log_info "检测到Ubuntu版本: $UBUNTU_CODENAME"
    
    cat > /etc/apt/sources.list << EOF
# 阿里云Ubuntu镜像源
deb http://mirrors.aliyun.com/ubuntu/ $UBUNTU_CODENAME main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ $UBUNTU_CODENAME main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ $UBUNTU_CODENAME-security main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ $UBUNTU_CODENAME-security main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ $UBUNTU_CODENAME-updates main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ $UBUNTU_CODENAME-updates main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ $UBUNTU_CODENAME-backports main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ $UBUNTU_CODENAME-backports main restricted universe multiverse
EOF
    
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get upgrade -y -qq
    
    # 2. 创建swap空间（重要：2G内存需要swap）
    log_info "配置swap空间..."
    if ! swapon --show | grep -q "/swapfile"; then
        fallocate -l $SWAP_SIZE /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        log_success "创建${SWAP_SIZE}交换空间"
    else
        log_info "交换空间已存在"
    fi
    
    # 3. 安装基础软件
    log_info "安装基础软件包..."
    apt-get install -y -qq \
        curl \
        wget \
        git \
        unzip \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        htop \
        nano \
        vim \
        ufw \
        sqlite3 \
        zip \
        rsync \
        cron
    
    # 4. 安装Node.js 20 (使用中国镜像)
    log_info "安装Node.js 20..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/nodesource/setup_20.x | bash -
        apt-get install -y nodejs
        log_success "Node.js $(node --version) 安装完成"
    else
        log_info "Node.js已安装: $(node --version)"
    fi
    
    # 5. 配置npm中国镜像
    log_info "配置npm中国镜像源..."
    npm config set registry https://registry.npmmirror.com/
    npm config set sass_binary_site https://npmmirror.com/mirrors/node-sass/
    npm config set electron_mirror https://npmmirror.com/mirrors/electron/
    npm config set python_mirror https://npmmirror.com/mirrors/python/
    npm config set chromedriver_cdnurl https://npmmirror.com/mirrors/chromedriver/
    log_success "npm镜像源配置完成"
    
    # 6. 安装PM2
    log_info "安装PM2进程管理器..."
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2@latest
        pm2 startup
        log_success "PM2安装完成"
    else
        log_info "PM2已安装: $(pm2 --version)"
    fi
    
    # 7. 安装Nginx
    log_info "安装Nginx..."
    if ! command -v nginx &> /dev/null; then
        apt-get install -y nginx
        systemctl enable nginx
        systemctl start nginx
        log_success "Nginx安装完成"
    else
        log_info "Nginx已安装: $(nginx -v 2>&1 | head -1)"
    fi
    
    # 8. 创建部署目录
    log_info "创建部署目录..."
    mkdir -p $DEPLOY_PATH
    mkdir -p $DEPLOY_PATH/logs
    mkdir -p $DEPLOY_PATH/uploads
    mkdir -p $DEPLOY_PATH/backups
    mkdir -p $DEPLOY_PATH/scripts
    chown -R root:root $DEPLOY_PATH
    chmod -R 755 $DEPLOY_PATH
    log_success "部署目录创建完成: $DEPLOY_PATH"
    
    # 9. 配置防火墙（保留SSH端口）
    log_info "配置防火墙..."
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw --force enable
    log_success "防火墙配置完成，SSH端口22已保护"
    
    # 10. 优化系统配置（针对2G内存）
    log_info "优化系统配置..."
    cat > /etc/sysctl.d/99-kimochi.conf << 'EOF'
# kimochi心晴系统优化配置 (2核2G)
# 内存优化
vm.swappiness=10
vm.dirty_ratio=15
vm.dirty_background_ratio=5
vm.vfs_cache_pressure=50

# 网络优化
net.core.somaxconn=1024
net.core.netdev_max_backlog=5000
net.ipv4.tcp_max_syn_backlog=2048
net.ipv4.tcp_rmem=4096 12582912 16777216
net.ipv4.tcp_wmem=4096 12582912 16777216
net.ipv4.tcp_congestion_control=bbr

# 文件系统优化
fs.file-max=65536
fs.inotify.max_user_watches=524288
EOF
    sysctl -p /etc/sysctl.d/99-kimochi.conf
    
    # 优化文件句柄限制
    cat > /etc/security/limits.conf << 'EOF'
# kimochi心晴文件句柄优化
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF
    
    log_success "系统优化配置完成"
    
    # 11. 配置日志轮转
    log_info "配置日志轮转..."
    cat > /etc/logrotate.d/kimochi << 'EOF'
/opt/kimochi/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs || true
    endscript
}
EOF
    log_success "日志轮转配置完成"
    
    # 12. 创建系统监控脚本
    log_info "创建系统监控脚本..."
    cat > $DEPLOY_PATH/scripts/monitor.sh << 'EOF'
#!/bin/bash
# kimochi心晴系统监控脚本

echo "=== kimochi心晴系统状态监控 ==="
echo "时间: $(date)"
echo "服务器: $(hostname)"
echo

echo "=== 内存使用情况 ==="
free -h
echo

echo "=== 磁盘使用情况 ==="
df -h
echo

echo "=== CPU负载情况 ==="
uptime
echo

echo "=== 网络连接数 ==="
ss -tuln | wc -l
echo

echo "=== PM2进程状态 ==="
pm2 status
echo

echo "=== Nginx状态 ==="
systemctl status nginx --no-pager -l | head -10
echo

echo "=== 应用健康检查 ==="
curl -s -o /dev/null -w "HTTP状态: %{http_code}, 响应时间: %{time_total}s\n" \
     http://localhost:3000/api/health || echo "应用未响应"
echo

echo "=== 最新应用日志 ==="
if [ -f /opt/kimochi/logs/combined.log ]; then
    echo "最近20条日志:"
    tail -20 /opt/kimochi/logs/combined.log
else
    echo "应用日志文件不存在"
fi
EOF
    chmod +x $DEPLOY_PATH/scripts/monitor.sh
    log_success "监控脚本创建完成"
    
    # 13. 创建快速状态检查脚本
    cat > /usr/local/bin/kimochi-status << 'EOF'
#!/bin/bash
echo "=== kimochi心晴快速状态 ==="
echo "时间: $(date)"
echo "服务器: $(hostname -f)"
echo

echo "系统负载: $(uptime | awk -F'load average:' '{print $2}')"
echo "内存使用: $(free | grep Mem | awk '{printf "%.2f%%\n", $3/$2 * 100.0}')"
echo "磁盘使用: $(df / | tail -1 | awk '{print $5}')"

echo
echo "服务状态:"
echo "- PM2: $(pm2 list | grep online | wc -l) 个进程在线"
echo "- Nginx: $(systemctl is-active nginx)"

echo
echo "应用检查:"
curl -s http://localhost:3000/api/health >/dev/null && echo "✓ 应用正常" || echo "✗ 应用异常"

echo
echo "快速操作:"
echo "  查看详细状态: /opt/kimochi/scripts/monitor.sh"
echo "  查看PM2日志: pm2 logs"
echo "  重启应用: pm2 restart kimochi"
EOF
    chmod +x /usr/local/bin/kimochi-status
    log_success "状态检查脚本创建完成: kimochi-status"
    
    # 14. 设置定时任务
    log_info "设置系统维护定时任务..."
    cat > /tmp/kimochi-cron << 'EOF'
# kimochi心晴系统维护任务
# 每日凌晨2点生成监控报告
0 2 * * * /opt/kimochi/scripts/monitor.sh > /opt/kimochi/logs/monitor-$(date +\%Y\%m\%d).log 2>&1

# 每周日凌晨3点清理7天前的日志
0 3 * * 0 find /opt/kimochi/logs -name "*.log" -mtime +7 -delete

# 每日凌晨1:30清理临时文件
30 1 * * * find /tmp -name "*.tmp" -mtime +1 -delete

# PM2日志轮转
0 0 * * * pm2 flush
EOF
    crontab /tmp/kimochi-cron
    rm /tmp/kimochi-cron
    log_success "定时任务设置完成"
    
    # 15. 创建备份脚本
    log_info "创建数据备份脚本..."
    cat > $DEPLOY_PATH/scripts/backup.sh << 'EOF'
#!/bin/bash
# kimochi心晴数据备份脚本

BACKUP_DIR="/opt/kimochi/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="kimochi_backup_$DATE.tar.gz"

echo "开始备份数据库和文件..."

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库和关键文件
cd /opt/kimochi
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    prisma/*.db* \
    uploads \
    .env.* \
    logs/*.log \
    2>/dev/null

echo "备份完成: $BACKUP_DIR/$BACKUP_FILE"

# 清理7天前的备份
find $BACKUP_DIR -name "kimochi_backup_*.tar.gz" -mtime +7 -delete
echo "已清理7天前的旧备份"
EOF
    chmod +x $DEPLOY_PATH/scripts/backup.sh
    log_success "备份脚本创建完成"
    
    # 16. 配置Git (为部署做准备)
    log_info "配置Git环境..."
    if ! command -v git &> /dev/null; then
        apt-get install -y git
    fi
    
    # 创建SSH目录
    mkdir -p /root/.ssh
    chmod 700 /root/.ssh
    
    # 配置Git全局设置
    git config --global user.name "Kimochi Server"
    git config --global user.email "server@kimochi.space"
    git config --global init.defaultBranch main
    
    log_success "Git环境配置完成"
    
    # 17. 最终系统信息检查
    log_info "执行最终系统检查..."
    echo
    echo "=== 系统环境信息 ==="
    echo "操作系统: $(lsb_release -d | cut -f2)"
    echo "内核版本: $(uname -r)"
    echo "Node.js: $(node --version)"
    echo "npm: $(npm --version)"  
    echo "PM2: $(pm2 --version)"
    echo "Nginx: $(nginx -v 2>&1 | head -1)"
    echo "SQLite: $(sqlite3 --version | cut -d' ' -f1)"
    echo "Git: $(git --version)"
    echo
    echo "=== 资源情况 ==="
    echo "CPU核心: $(nproc)"
    echo "总内存: $(free -h | grep Mem | awk '{print $2}')"
    echo "可用内存: $(free -h | grep Mem | awk '{print $7}')"
    echo "交换空间: $(free -h | grep Swap | awk '{print $2}')"
    echo "磁盘空间: $(df -h / | tail -1 | awk '{print $4}') 可用"
    echo
    
    log_success "服务器环境初始化完成！"
    echo
    log_info "部署目录: $DEPLOY_PATH"
    log_info "快速状态检查: kimochi-status"
    log_info "详细监控: /opt/kimochi/scripts/monitor.sh"
    log_info "数据备份: /opt/kimochi/scripts/backup.sh"
    echo
    log_warning "下一步操作："
    echo "1. 将SSH公钥添加到GitHub账户"
    echo "2. 运行部署脚本: ./scripts/deploy.sh"
    echo "3. 配置域名解析到: 47.104.8.84"
    log_info "服务器已准备就绪！"
}

# 错误处理
trap 'log_error "脚本执行失败，请检查错误信息"' ERR

# 检查root权限
if [ "$EUID" -ne 0 ]; then
    log_error "请使用root权限运行此脚本"
    exit 1
fi

# 执行主函数
main "$@"
