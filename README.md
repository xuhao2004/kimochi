# kimochi心晴 🌸

一个现代化的心理健康平台，集成心理测评、社交互动和专业支持功能。

## 🚀 项目简介

kimochi心晴是一个基于Next.js构建的全栈心理健康应用，旨在为用户提供：

- 🧠 **专业心理测评** - MBTI、九型人格、心理健康评估
- 💬 **安全社交环境** - 匿名交流、情感支持社区
- 📱 **多端支持** - Web端 + 微信小程序
- 🔒 **隐私保护** - 端到端加密，严格数据保护
- 👨‍⚕️ **专业支持** - 心理咨询师在线服务

## 🛠️ 技术栈

### 前端
- **Next.js 15** - React全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS v4** - 现代化样式框架
- **React 19** - 最新React特性

### 后端
- **Prisma** - 现代数据库ORM
- **SQLite** - 轻量级数据库
- **JWT** - 身份认证
- **Nodemailer** - 邮件服务

### 部署
- **Docker** - 容器化部署
- **Nginx** - 反向代理
- **PM2** - 进程管理
- **阿里云** - 云服务器

### 小程序
- **微信小程序** - 原生小程序开发
- **微信授权** - 一键登录

## 📦 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn
- Git

### 本地开发

```bash
# 克隆项目
git clone https://github.com/xuhao2004/kimochi.git
cd kimochi

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入必要的配置

# 生成JWT密钥
node scripts/generate-jwt-secret.js

# 初始化数据库
npx prisma generate
npx prisma db push

# 启动开发服务器
npm run dev
```

访问 http://localhost:3001 查看应用

### 生产部署

#### 方式1：一键部署脚本

```bash
# 初始化服务器环境
./scripts/deploy.sh init

# 从GitHub部署 (推荐)
./scripts/deploy.sh github

# 或从本地部署
./scripts/deploy.sh local
```

#### 方式2：Docker部署

```bash
# 构建并启动生产环境
docker-compose --profile prod up -d

# 查看服务状态
docker-compose ps
```

## 🔧 配置说明

### 环境变量

创建 `.env.local` (开发) 或 `.env.prod.local` (生产) 文件：

```env
# 基本配置
NODE_ENV="production"
PORT="3000"
DATABASE_URL="file:./prisma/production.db"
JWT_SECRET="your-jwt-secret-here"

# 应用信息
NEXT_PUBLIC_APP_NAME="kimochi心晴"
DOMAIN="yourdomain.com"

# 邮件服务 (可选)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""

# AI服务 (可选)
DEEPSEEK_API_KEY=""

# 微信小程序 (可选)
WEAPP_APP_ID=""
WEAPP_APP_SECRET=""
```

### 服务器要求

**最低配置：**
- CPU: 2核
- 内存: 2GB
- 存储: 20GB SSD
- 带宽: 1Mbps
- 系统: Ubuntu 20.04+

**推荐配置：**
- CPU: 4核
- 内存: 4GB
- 存储: 40GB SSD
- 带宽: 5Mbps

## 📱 小程序开发

小程序代码位于 `mini-program/` 目录：

```bash
# 进入小程序目录
cd mini-program

# 使用微信开发者工具打开此目录
# 配置 AppID 和服务器地址
```

## 🚀 部署指南

### 服务器初始化

```bash
# 连接服务器
ssh -i kimochi-prod.pem root@your-server-ip

# 运行初始化脚本
curl -fsSL https://raw.githubusercontent.com/xuhao2004/kimochi/main/scripts/server-init.sh | bash
```

### 应用部署

```bash
# 部署最新版本
./scripts/deploy.sh github --backup

# 检查部署状态
./scripts/deploy.sh status

# 查看应用日志
./scripts/deploy.sh logs

# 重启应用
./scripts/deploy.sh restart
```

### 域名配置

1. 将域名解析指向服务器IP
2. 配置SSL证书（可选）
3. 更新nginx配置

## 📊 监控维护

### 服务器监控

```bash
# 快速状态检查
kimochi-status

# 详细监控信息
/opt/kimochi/scripts/monitor.sh

# 创建数据备份
./scripts/deploy.sh backup
```

### 常用命令

```bash
# PM2进程管理
pm2 status           # 查看进程状态
pm2 logs kimochi     # 查看应用日志
pm2 restart kimochi  # 重启应用
pm2 monit           # 实时监控

# 数据库操作
npx prisma studio    # 数据库可视化界面
npx prisma db push   # 同步数据库schema
```

## 🔒 安全特性

- JWT身份认证
- 密码加密存储
- XSS防护
- CSRF保护
- 速率限制
- 输入验证
- 敏感数据脱敏

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看 [问题列表](https://github.com/xuhao2004/kimochi/issues)
2. 提交 Issue
3. 加入讨论群

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户！

---

**kimochi心晴** - 让心灵找到宁静的港湾 🌸