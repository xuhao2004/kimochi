# 🚀 Kimochi 心晴 - 完整部署教程

**版本**: v1.2.1
**更新时间**: 2024-08-25

## 📋 环境规划

### 环境概览表
| 环境 | 位置 | 域名 | 端口 | 用途 |
|------|------|------|------|------|
| **开发环境** | 本地机器 | localhost:3001 | 3001 | 日常开发 |
| **测试环境** | 本地 Docker | localhost:3002 | 3002 | 功能测试 |
| **预生产环境** | 云服务器 | staging.kimochi.space | 80/443 | 发布前验证 |
| **生产环境** | 云服务器 | app.kimochi.space | 80/443 | 最终用户 |

### 推荐的环境分布
```
开发环境 (dev)       → 本地开发机器 (MacBook/PC)
测试环境 (test)      → 本地开发机器 (Docker)
预生产环境 (staging) → 云服务器 (与生产环境相同配置)
生产环境 (production) → 云服务器 (独立服务器)
```

## ⚡ 快速开始

### 🖥️ 本地开发环境

```bash
# 1. 克隆项目
git clone git@github.com:xuhao2004/kimochi.git
cd kimochi

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local

# 4. 启动开发环境
npm run dev

# 4. 访问应用
# 浏览器打开: http://localhost:3001
```

### 🧪 本地测试环境

```bash
# 构建项目
npm run build

# 启动生产模式
npm run start

# 或使用Docker
docker-compose --profile test up
```

### 🌐 服务器部署

#### 推荐方式：使用增强部署脚本
```bash
# 1. 安装依赖
npm install

# 2. 使用增强部署脚本（推荐）
./scripts/deploy-with-checks.sh

# 3. 手动部署（备选）
npm run build && npm run start
```

#### 增强部署脚本功能
- ✅ 自动检查配置文件完整性
- ✅ 验证 Tailwind CSS v4 配置
- ✅ 构建后 CSS 文件大小验证
- ✅ 部署后健康检查
- ✅ 生成详细部署报告

### 服务器配置要求

#### 预生产服务器
- **CPU**: 2 核心
- **内存**: 4GB
- **存储**: 40GB SSD
- **系统**: Ubuntu 22.04 LTS
- **域名**: staging.kimochi.space

#### 生产服务器
- **CPU**: 4 核心  
- **内存**: 8GB
- **存储**: 80GB SSD
- **系统**: Ubuntu 22.04 LTS
- **域名**: app.kimochi.space

## 🎨 Tailwind CSS v4 部署注意事项

**重要提示**：本项目使用 Tailwind CSS v4，与之前版本的配置方式有所不同。

### 必需的配置文件

#### 1. PostCSS 配置 (`postcss.config.mjs`)
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

#### 2. 全局样式文件 (`src/app/globals.css`)
```css
@import "tailwindcss";

/* 其他全局样式 */
:root {
  --background: #ffffff;
  --foreground: #111111;
  /* ... */
}
```

### 部署检查要点

- ✅ 确保 `postcss.config.mjs` 文件存在于项目根目录
- ✅ 确保 `globals.css` 第一行包含 `@import "tailwindcss";`
- ✅ 确保 `package.json` 中 `tailwindcss` 版本为 `^4`
- ✅ 构建后 CSS 文件大小应 > 100KB (表明 Tailwind 正确编译)
- ❌ **不要**创建 `tailwind.config.js` 文件 (v4 不需要)

### 常见问题排查

**问题**: CSS 文件很小 (< 10KB) 或样式不生效
**解决方案**:
1. 检查 `postcss.config.mjs` 是否存在
2. 检查 `globals.css` 是否包含正确的导入语句
3. 重新运行 `npm run build`
4. 使用增强部署脚本: `./scripts/deploy-with-checks.sh`

## 🔑 首次使用必读：SSH配置

**重要提示**：本项目已迁移到SSH连接以提高稳定性和避免HTTPS连接问题。

### 快速SSH配置

**手动配置**：
详细步骤请参考 [配置指南](CONFIGURATION-GUIDE.md) 中的SSH配置部分

### 验证SSH配置
```bash
# 测试GitHub连接
ssh -T git@github.com

# 应该看到类似输出：
# Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

## 🖥️ 第一部分：本地开发环境配置

### 1. 获取项目代码

#### 在新位置克隆项目
```bash
# 选择一个新的工作目录
cd ~/Projects  # 或者你想要的任何位置

# 克隆项目
git clone git@github.com:xuhao2004/kimochi.git
cd kimochi

# 查看项目状态
npm run build
```

### 2. 环境初始化

#### 设置开发环境
```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev
```

#### 手动设置（如果一键设置失败）
```bash
# 1. 检查系统要求
node --version  # 需要 18+
npm --version
git --version

# 2. 安装项目依赖
npm install

# 3. 环境配置
cp config/environments/env.development .env.local
# 编辑 .env.local 配置开发环境变量

# 4. 数据库初始化
npm run db:setup

# 5. 启动开发服务器
npm run dev
```

### 3. 验证开发环境

```bash
# 运行测试
npm run test

# 检查代码质量
npm run lint

# 构建测试
npm run build

# 启动开发服务器
npm run dev

# 访问应用
# 浏览器打开: http://localhost:3000
```

### 4. 开发环境配置文件

#### .env.local 示例
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/kimochi_dev
REDIS_URL=redis://localhost:6379
DEBUG=true
HOT_RELOAD=true
```

## 🧪 第二部分：本地构建测试配置

### 1. 使用 Docker 运行构建测试

```bash
# 构建测试环境
docker-compose --profile build-test up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止测试环境
docker-compose --profile build-test down
```

### 2. 构建测试验证

```bash
# 运行完整测试套件
npm run test

# 运行构建测试
npm run build

# 检查代码质量
npm run lint

# 安全扫描
npm audit

# 启动生产模式
npm run start
```

### 3. 测试数据管理

```bash
# 重置开发数据库
npx prisma migrate reset

# 推送数据库模式
npx prisma db push

# 生成 Prisma 客户端
npx prisma generate
```

## ☁️ 第三部分：云服务器环境配置

### 1. 服务器准备

#### 连接服务器
```bash
# 连接到服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 创建应用用户
useradd -m -s /bin/bash kimochi
usermod -aG sudo kimochi

# 设置密钥登录（推荐）
mkdir -p /home/kimochi/.ssh
cp ~/.ssh/authorized_keys /home/kimochi/.ssh/
chown -R kimochi:kimochi /home/kimochi/.ssh
chmod 700 /home/kimochi/.ssh
chmod 600 /home/kimochi/.ssh/authorized_keys

# 切换到应用用户
su - kimochi
```

### 2. 安装基础环境

```bash
# 安装 Node.js (使用 NodeSource 仓库)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装其他依赖
sudo apt-get install -y git nginx postgresql redis-server

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker kimochi

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以应用 Docker 组权限
exit
ssh kimochi@your-server-ip
```

### 3. 配置数据库

```bash
# 配置 PostgreSQL
sudo -u postgres psql

-- 在 PostgreSQL 中执行
CREATE USER kimochi WITH PASSWORD 'secure_password';
CREATE DATABASE kimochi_staging OWNER kimochi;
CREATE DATABASE kimochi_production OWNER kimochi;
GRANT ALL PRIVILEGES ON DATABASE kimochi_staging TO kimochi;
GRANT ALL PRIVILEGES ON DATABASE kimochi_production TO kimochi;
\q

# 配置 Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 4. 部署项目代码

```bash
# 克隆项目
git clone git@github.com:xuhao2004/kimochi.git
cd kimochi

# 检查项目状态
npm run build

# 安装生产依赖
npm ci --production
```

## 🎯 第四部分：预生产环境部署

### 1. 配置预生产环境

```bash
# 在预生产服务器上
cd ~/kimochi

# 创建预生产环境配置
cp config/environments/env.production .env.staging

# 编辑预生产环境变量
nano .env.staging
```

#### .env.staging 配置示例
```bash
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://kimochi:secure_password@localhost:5432/kimochi_staging
REDIS_URL=redis://localhost:6379
DOMAIN=staging.kimochi.space
SSL_ENABLED=true
LOG_LEVEL=info
BACKUP_ENABLED=true
```

### 2. 启动预生产环境

```bash
# 使用 Docker Compose 启动
docker-compose --profile staging up -d

# 或者使用 CLI 工具
./scripts/kimochi.sh oneclick staging

# 验证服务状态
./scripts/kimochi.sh health

# 查看服务日志
docker-compose logs -f app
```

### 3. 配置 Nginx 反向代理

```bash
# 创建 Nginx 配置
sudo nano /etc/nginx/sites-available/kimochi-staging
```

#### Nginx 配置内容
```nginx
server {
    listen 80;
    server_name staging.kimochi.space;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.kimochi.space;
    
    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/staging.kimochi.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.kimochi.space/privkey.pem;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/kimochi-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 配置 SSL 证书

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d staging.kimochi.space

# 设置自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet

## 🏭 第五部分：生产环境部署

### 1. 配置生产环境

```bash
# 在生产服务器上
cd ~/kimochi

# 创建生产环境配置
cp config/environments/env.production .env.production

# 编辑生产环境变量
nano .env.production
```

#### .env.production 配置示例
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://kimochi:very_secure_password@localhost:5432/kimochi_production
REDIS_URL=redis://localhost:6379
DOMAIN=app.kimochi.space
SSL_ENABLED=true
LOG_LEVEL=warn
BACKUP_ENABLED=true
MONITORING_ENABLED=true
RATE_LIMIT_ENABLED=true
SECURITY_HEADERS=true
```

### 2. 启动生产环境

```bash
# 使用生产配置启动
docker-compose --profile prod up -d

# 或者使用 CLI 工具
./scripts/kimochi.sh oneclick production

# 启用监控
docker-compose --profile monitoring up -d

# 验证所有服务
./scripts/kimochi.sh health --verbose
```

### 3. 配置生产级 Nginx

```bash
# 创建生产 Nginx 配置
sudo nano /etc/nginx/sites-available/kimochi-production
```

#### 生产 Nginx 配置
```nginx
# 限制请求速率
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

server {
    listen 80;
    server_name app.kimochi.space;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.kimochi.space;

    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/app.kimochi.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.kimochi.space/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API 限流
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 登录限流
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }

    # 默认代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/kimochi-production /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 获取生产环境 SSL 证书
sudo certbot --nginx -d app.kimochi.space
```

### 4. 配置防火墙

```bash
# 配置 UFW 防火墙
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## 🔄 第六部分：CI/CD 自动部署

### 1. GitHub Actions 自动部署

你的 CI/CD 流水线已经配置好，会自动：

```bash
# 推送到 main 分支 → 自动部署到生产环境
git push origin main

# 推送到 staging 分支 → 自动部署到预生产环境
git push origin staging

# 创建版本标签 → 创建 Release 并部署
git tag v1.1.3
git push origin --tags
```

### 2. 手动部署命令

如果需要手动部署：

```bash
# 在服务器上更新代码
cd ~/kimochi
git pull origin main

# 重新构建和部署
./scripts/kimochi.sh deploy production

# 或者使用 Docker
docker-compose --profile prod down
docker-compose --profile prod up -d --build

# 验证部署
./scripts/kimochi.sh health
```

### 3. 部署回滚

```bash
# 查看部署历史
git log --oneline -10

# 回滚到指定版本
git checkout <commit-hash>
./scripts/kimochi.sh deploy production

# 或者回滚 Docker 镜像
docker-compose --profile prod down
docker-compose --profile prod up -d
```

## 📊 第七部分：监控和维护

### 1. 设置监控

```bash
# 启动监控服务
docker-compose --profile monitoring up -d

# 访问监控面板
# Grafana: https://your-server:3001
# Prometheus: https://your-server:9090

# 配置监控告警
./scripts/kimochi.sh monitor setup
```

### 2. 日常维护命令

```bash
# 系统健康检查
./scripts/kimochi.sh health

# 性能监控
./scripts/kimochi.sh monitor

# 创建备份
./scripts/kimochi.sh backup full

# 查看日志
./scripts/kimochi.sh logs app

# 系统诊断
./scripts/kimochi.sh doctor

# 清理系统
./scripts/kimochi.sh cleanup
```

### 3. 自动化维护

```bash
# 设置定时任务
crontab -e

# 添加以下任务
# 每天凌晨 2 点备份
0 2 * * * cd ~/kimochi && ./scripts/kimochi.sh backup full

# 每周日凌晨 3 点清理日志
0 3 * * 0 cd ~/kimochi && ./scripts/kimochi.sh cleanup logs

# 每天检查系统健康
0 */6 * * * cd ~/kimochi && ./scripts/kimochi.sh health --quiet

## 🚨 第八部分：故障排除

### 1. 常见问题解决

#### 服务无法启动
```bash
# 查看服务日志
docker-compose logs app

# 检查端口占用
sudo netstat -tulpn | grep :3000

# 检查系统资源
htop
df -h

# 重启服务
docker-compose restart app
```

#### 数据库连接问题
```bash
# 检查数据库状态
sudo systemctl status postgresql

# 测试数据库连接
psql -h localhost -U kimochi -d kimochi_production

# 重置数据库连接
./scripts/kimochi.sh doctor --fix

# 查看数据库日志
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### 内存不足问题
```bash
# 检查内存使用
free -h
docker stats

# 清理 Docker 缓存
docker system prune -f

# 重启服务释放内存
docker-compose restart
```

#### SSL 证书问题
```bash
# 检查证书状态
sudo certbot certificates

# 手动续期证书
sudo certbot renew

# 测试 SSL 配置
sudo nginx -t
openssl s_client -connect app.kimochi.space:443
```

### 2. 性能优化

#### 数据库优化
```bash
# 数据库性能分析
./scripts/kimochi.sh analyze db

# 重建索引
./scripts/kimochi.sh optimize db

# 清理过期数据
./scripts/kimochi.sh cleanup db
```

#### 应用优化
```bash
# 性能分析
./scripts/kimochi.sh performance

# 内存优化
./scripts/kimochi.sh optimize memory

# 缓存优化
./scripts/kimochi.sh optimize cache
```

### 3. 紧急恢复

#### 从备份恢复
```bash
# 列出可用备份
./scripts/kimochi.sh backup list

# 恢复数据库
./scripts/kimochi.sh restore db backup-2024-01-01.sql

# 恢复完整系统
./scripts/kimochi.sh restore full backup-2024-01-01.tar.gz
```

#### 快速重部署
```bash
# 停止所有服务
docker-compose down

# 清理并重新部署
docker system prune -f
git pull origin main
docker-compose --profile prod up -d --build

# 验证服务
./scripts/kimochi.sh health
```

## 📋 第九部分：部署检查清单

### 开发环境 ✅
- [ ] 克隆项目代码到新位置
- [ ] 运行 `./scripts/kimochi.sh setup`
- [ ] 运行 `./scripts/kimochi.sh oneclick dev`
- [ ] 验证 http://localhost:3000 可访问
- [ ] 运行测试套件确保功能正常
- [ ] 配置 IDE 和开发工具

### 测试环境 ✅
- [ ] 运行 `docker-compose --profile test up -d`
- [ ] 运行完整测试套件
- [ ] 验证所有测试通过
- [ ] 测试数据导入和重置功能
- [ ] 验证 http://localhost:3001 可访问

### 预生产环境 ✅
- [ ] 服务器基础环境安装完成
- [ ] 克隆项目并配置 .env.staging
- [ ] 配置数据库和 Redis
- [ ] 运行 `docker-compose --profile staging up -d`
- [ ] 配置 Nginx 反向代理
- [ ] 获取并配置 SSL 证书
- [ ] 验证 https://staging.kimochi.space 可访问
- [ ] 测试所有核心功能
- [ ] 配置监控和日志

### 生产环境 ✅
- [ ] 服务器基础环境安装完成
- [ ] 克隆项目并配置 .env.production
- [ ] 配置生产级数据库和 Redis
- [ ] 运行 `docker-compose --profile prod up -d`
- [ ] 配置生产级 Nginx 和安全设置
- [ ] 获取并配置 SSL 证书
- [ ] 配置防火墙规则
- [ ] 启动监控服务
- [ ] 验证 https://app.kimochi.space 可访问
- [ ] 设置自动备份
- [ ] 配置告警通知
- [ ] 性能测试和优化
- [ ] 安全扫描和加固

### CI/CD 流水线 ✅
- [ ] GitHub 环境已创建 (staging, production)
- [ ] 工作流文件验证通过
- [ ] 测试自动部署到预生产环境
- [ ] 测试自动部署到生产环境
- [ ] 验证版本发布流程
- [ ] 测试回滚机制

## 🎯 第十部分：最佳实践

### 1. 安全最佳实践

```bash
# 定期更新系统
sudo apt update && sudo apt upgrade

# 定期更新依赖
npm audit fix

# 定期轮换密钥
# 更新数据库密码、API 密钥等

# 监控安全日志
sudo tail -f /var/log/auth.log
```

### 2. 性能最佳实践

```bash
# 定期清理日志
./scripts/kimochi.sh cleanup logs

# 监控资源使用
./scripts/kimochi.sh monitor resources

# 优化数据库
./scripts/kimochi.sh optimize db

# 更新缓存策略
./scripts/kimochi.sh optimize cache
```

### 3. 备份最佳实践

```bash
# 每日自动备份
./scripts/kimochi.sh backup daily

# 每周完整备份
./scripts/kimochi.sh backup weekly

# 测试备份恢复
./scripts/kimochi.sh test restore

# 异地备份存储
# 配置云存储备份
```

## 📞 支持与帮助

### 获取帮助
- 📖 查看 [本地开发指南](LOCAL-DEVELOPMENT-GUIDE.md)
- 🔧 查看 [故障排除指南](TROUBLESHOOTING.md)
- ⚙️ 查看 [配置指南](CONFIGURATION-GUIDE.md)
- 🔧 查看 [开发指南](DEVELOPMENT-GUIDE.md)

### 报告问题
- 🐛 在 GitHub Issues 中报告 Bug
- 💡 在 GitHub Discussions 中提出建议
- 📧 通过项目邮箱联系维护者

### 紧急联系
如果遇到生产环境紧急问题：
1. 立即运行 `./scripts/kimochi.sh doctor`
2. 查看 [故障排除指南](TROUBLESHOOTING.md)
3. 如需要，执行紧急回滚
4. 联系技术支持

---

**部署完成！** 🎉

现在你拥有了完整的四环境部署方案，从本地开发到生产环境，所有环境都通过 CI/CD 流水线自动化管理，确保代码质量和部署一致性！
```
```
