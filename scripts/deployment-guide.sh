#!/bin/bash

# kimochi心晴 - 完整部署指南脚本
# 作者: AI工程师助手
# 日期: 2025年8月28日
# 版本: 1.0

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

# 项目配置
SERVER_IP="47.104.8.84"
SSH_KEY="kimochi-prod.pem"
SERVER_USER="root"
DEPLOY_PATH="/opt/kimochi"
PROJECT_NAME="kimochi"

echo
echo "============================================================"
echo "              kimochi心晴 - 部署指南"
echo "============================================================"
echo
echo "本脚本记录了完整的部署过程，帮助你独立完成服务器部署"
echo

show_menu() {
    echo "请选择操作："
    echo "1. 显示部署前准备清单"
    echo "2. 服务器环境初始化"
    echo "3. 应用部署流程"
    echo "4. 常用维护命令"
    echo "5. 故障排除指南"
    echo "6. 完整部署流程（一键执行）"
    echo "0. 退出"
    echo
}

show_preparation() {
    log_step "部署前准备清单"
    echo
    echo "📋 服务器信息："
    echo "   • IP地址: $SERVER_IP"
    echo "   • 用户: $SERVER_USER"
    echo "   • SSH密钥: $SSH_KEY"
    echo "   • 配置: 2核2G (青岛阿里云)"
    echo "   • 系统: Ubuntu 20.04+"
    echo
    echo "📋 本地环境："
    echo "   • Node.js 18+"
    echo "   • npm 或 yarn"
    echo "   • Git"
    echo "   • SSH客户端"
    echo
    echo "📋 必需文件："
    echo "   • $SSH_KEY (SSH密钥文件)"
    echo "   • .env.prod.local (生产环境配置)"
    echo "   • 项目源代码"
    echo
}

show_server_init() {
    log_step "服务器环境初始化步骤"
    echo
    echo "1. 连接服务器："
    echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
    echo
    echo "2. 系统更新："
    echo "   apt update && apt upgrade -y"
    echo
    echo "3. 安装基础软件："
    echo "   apt install -y curl wget git unzip build-essential nginx sqlite3"
    echo
    echo "4. 安装Node.js 20："
    echo "   curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/nodesource/setup_20.x | bash -"
    echo "   apt install -y nodejs"
    echo
    echo "5. 配置npm中国镜像："
    echo "   npm config set registry https://registry.npmmirror.com/"
    echo
    echo "6. 安装PM2："
    echo "   npm install -g pm2@latest"
    echo "   pm2 startup"
    echo
    echo "7. 创建部署目录："
    echo "   mkdir -p $DEPLOY_PATH"
    echo "   chown -R $SERVER_USER:$SERVER_USER $DEPLOY_PATH"
    echo
    echo "8. 配置防火墙："
    echo "   ufw allow 22/tcp"
    echo "   ufw allow 80/tcp"
    echo "   ufw allow 443/tcp"
    echo "   ufw --force enable"
    echo
    log_success "服务器初始化完成后，可以进行应用部署"
}

show_deployment_process() {
    log_step "应用部署流程"
    echo
    echo "1. 准备项目代码："
    echo "   # 创建部署包"
    echo "   tar -czf kimochi-deploy.tar.gz --exclude=node_modules --exclude=.git ."
    echo
    echo "2. 上传到服务器："
    echo "   scp -i $SSH_KEY kimochi-deploy.tar.gz $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/"
    echo
    echo "3. 在服务器上解压并配置："
    echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
    echo "   cd $DEPLOY_PATH"
    echo "   tar -xzf kimochi-deploy.tar.gz"
    echo
    echo "4. 创建生产环境配置："
    echo '   cat > .env.prod.local << "EOF"'
    echo '   NODE_ENV="production"'
    echo '   DATABASE_URL="file:./prisma/production.db"'
    echo '   JWT_SECRET="your-jwt-secret-here"'
    echo '   PORT="3000"'
    echo '   NEXT_PUBLIC_APP_NAME="kimochi心晴"'
    echo '   DOMAIN="47.104.8.84"'
    echo '   # 其他配置项...'
    echo '   EOF'
    echo
    echo "5. 安装依赖："
    echo "   npm ci --registry https://registry.npmmirror.com"
    echo
    echo "6. 构建应用："
    echo "   npx prisma generate"
    echo "   npm run build"
    echo
    echo "7. 配置数据库："
    echo "   npx dotenv -e .env.prod.local -- npx prisma db push"
    echo
    echo "8. 配置Nginx："
    echo "   # 创建简化的nginx配置"
    echo '   cat > /etc/nginx/sites-available/kimochi << "EOF"'
    echo '   server {'
    echo '       listen 80;'
    echo '       server_name 47.104.8.84 kimochi.space;'
    echo '       client_max_body_size 10M;'
    echo '       location / {'
    echo '           proxy_pass http://127.0.0.1:3000;'
    echo '           proxy_set_header Host $host;'
    echo '           proxy_set_header X-Real-IP $remote_addr;'
    echo '       }'
    echo '   }'
    echo '   EOF'
    echo "   ln -sf /etc/nginx/sites-available/kimochi /etc/nginx/sites-enabled/"
    echo "   nginx -t && systemctl reload nginx"
    echo
    echo "9. 启动应用："
    echo "   pm2 start ecosystem.config.js --env production"
    echo "   pm2 save"
    echo
    echo "10. 验证部署："
    echo "    curl http://localhost:3000/api/health"
    echo "    curl http://47.104.8.84/api/health"
    echo
    log_success "部署完成！应用现在可以通过 http://47.104.8.84 访问"
}

show_maintenance() {
    log_step "常用维护命令"
    echo
    echo "📊 查看应用状态："
    echo "   pm2 status                    # PM2进程状态"
    echo "   pm2 logs kimochi             # 查看应用日志"
    echo "   pm2 monit                    # 实时监控"
    echo
    echo "🔄 应用管理："
    echo "   pm2 restart kimochi          # 重启应用"
    echo "   pm2 stop kimochi             # 停止应用"
    echo "   pm2 start kimochi            # 启动应用"
    echo "   pm2 reload kimochi           # 优雅重载"
    echo
    echo "🔧 系统管理："
    echo "   systemctl status nginx       # 检查Nginx状态"
    echo "   systemctl reload nginx       # 重载Nginx配置"
    echo "   nginx -t                     # 测试Nginx配置"
    echo
    echo "📈 系统监控："
    echo "   htop                         # 系统资源监控"
    echo "   df -h                        # 磁盘空间"
    echo "   free -h                      # 内存使用"
    echo
    echo "🗄️ 数据库管理："
    echo "   npx prisma studio            # 数据库管理界面"
    echo "   npx prisma db push           # 同步数据库schema"
    echo
}

show_troubleshooting() {
    log_step "故障排除指南"
    echo
    echo "🔍 应用无法访问："
    echo "   1. 检查PM2状态: pm2 status"
    echo "   2. 查看应用日志: pm2 logs kimochi"
    echo "   3. 检查端口占用: netstat -tlnp | grep 3000"
    echo "   4. 重启应用: pm2 restart kimochi"
    echo
    echo "🔍 Nginx相关问题："
    echo "   1. 测试配置: nginx -t"
    echo "   2. 查看错误日志: tail -f /var/log/nginx/error.log"
    echo "   3. 重载配置: systemctl reload nginx"
    echo
    echo "🔍 数据库问题："
    echo "   1. 检查数据库文件: ls -la $DEPLOY_PATH/prisma/"
    echo "   2. 重新生成客户端: npx prisma generate"
    echo "   3. 同步数据库: npx prisma db push"
    echo
    echo "🔍 内存不足问题："
    echo "   1. 查看内存使用: free -h"
    echo "   2. 清理日志: pm2 flush"
    echo "   3. 重启服务: pm2 restart kimochi"
    echo
    echo "🔍 构建失败："
    echo "   1. 清理缓存: rm -rf node_modules .next*"
    echo "   2. 重新安装: npm ci"
    echo "   3. 重新构建: npm run build"
    echo
}

run_full_deployment() {
    log_step "执行完整部署流程"
    echo
    read -p "确定要执行完整部署吗？这将重新部署整个应用 (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "开始完整部署流程..."
        
        # 检查必要文件
        if [[ ! -f "$SSH_KEY" ]]; then
            log_error "SSH密钥文件不存在: $SSH_KEY"
            exit 1
        fi
        
        # 创建部署包
        log_info "创建部署包..."
        tar -czf kimochi-deploy.tar.gz \
            --exclude=node_modules \
            --exclude=.git \
            --exclude=*.log \
            --exclude=.next-dev \
            .
        
        # 上传到服务器
        log_info "上传到服务器..."
        scp -i "$SSH_KEY" kimochi-deploy.tar.gz "$SERVER_USER@$SERVER_IP:$DEPLOY_PATH/"
        
        # 在服务器上部署
        log_info "在服务器上执行部署..."
        ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
            cd $DEPLOY_PATH
            
            # 停止应用
            pm2 stop kimochi || true
            
            # 解压新版本
            tar -xzf kimochi-deploy.tar.gz
            
            # 安装依赖
            npm ci --registry https://registry.npmmirror.com
            
            # 构建应用
            npx prisma generate
            npm run build
            
            # 数据库迁移
            npx dotenv -e .env.prod.local -- npx prisma db push
            
            # 启动应用
            pm2 start ecosystem.config.js --env production
            pm2 save
            
            echo '部署完成！'
        "
        
        # 清理本地文件
        rm -f kimochi-deploy.tar.gz
        
        log_success "部署完成！应用现在可以通过 http://$SERVER_IP 访问"
    else
        log_info "部署取消"
    fi
}

# 主菜单循环
while true; do
    show_menu
    read -p "请选择 (0-6): " choice
    echo
    
    case $choice in
        1) show_preparation ;;
        2) show_server_init ;;
        3) show_deployment_process ;;
        4) show_maintenance ;;
        5) show_troubleshooting ;;
        6) run_full_deployment ;;
        0) 
            log_info "感谢使用kimochi心晴部署指南！"
            exit 0
            ;;
        *)
            log_warning "无效选择，请重新输入"
            ;;
    esac
    
    echo
    read -p "按回车键继续..." 
    echo
done
