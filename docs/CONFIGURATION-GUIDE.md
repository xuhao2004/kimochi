# ⚙️ Kimochi 配置指南

**版本**: v1.2.1  
**更新时间**: 2024-08-25

## 📋 配置概览

本指南涵盖Kimochi项目的所有配置需求，包括GitHub设置、SSH配置、CI/CD配置等。

## 🔑 SSH配置

### 为什么使用SSH？
- **稳定性更好**: 避免HTTPS连接的HTTP2协议层错误
- **安全性更高**: 使用密钥认证，无需密码
- **速度更快**: 减少认证开销

### 推荐配置方式
```bash
# 手动配置SSH密钥（推荐）
ssh-keygen -t ed25519 -C "your-email@example.com"
```

### 手动配置步骤

#### 1. 生成SSH密钥
```bash
# 生成Ed25519密钥 (推荐)
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/id_ed25519 -N ""

# 或生成RSA密钥 (兼容性更好)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com" -f ~/.ssh/id_rsa -N ""
```

#### 2. 添加到SSH Agent
```bash
# macOS
ssh-add --apple-use-keychain ~/.ssh/id_ed25519

# Linux/Windows
ssh-add ~/.ssh/id_ed25519
```

#### 3. 复制公钥到GitHub
```bash
# macOS
pbcopy < ~/.ssh/id_ed25519.pub

# Linux
xclip -selection clipboard < ~/.ssh/id_ed25519.pub

# Windows
clip < ~/.ssh/id_ed25519.pub
```

然后在GitHub设置中添加SSH密钥：
1. 访问 https://github.com/settings/ssh/new
2. 粘贴公钥内容
3. 点击 "Add SSH key"

#### 4. 测试连接
```bash
ssh -T git@github.com
```

### SSH配置文件优化
创建或编辑 `~/.ssh/config`：
```
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    AddKeysToAgent yes
    UseKeychain yes  # macOS only
```

## 🐙 GitHub仓库配置

### 必须完成的配置

#### 1. 仓库设置
- **默认分支**: main
- **分支保护**: 启用main分支保护
- **合并策略**: 允许merge commits和squash merging

#### 2. Secrets配置
在 `Settings > Secrets and variables > Actions` 中添加：

```yaml
# 服务器连接 (生产环境需要)
SERVER_HOST: "your-server-ip"
SERVER_USER: "deploy-user"  
SERVER_SSH_KEY: "-----BEGIN PRIVATE KEY-----..."

# 域名配置
STAGING_DOMAIN: "staging.kimochi.space"
PRODUCTION_DOMAIN: "app.kimochi.space"

# 数据库配置
DATABASE_URL: "file:./prisma/prod.db"
JWT_SECRET: "your-super-secret-jwt-key"

# 邮件配置 (可选)
SMTP_HOST: "smtp.gmail.com"
SMTP_USER: "your-email@gmail.com"
SMTP_PASS: "your-app-password"

# 云存储配置 (可选)
AWS_ACCESS_KEY_ID: "your-aws-key"
AWS_SECRET_ACCESS_KEY: "your-aws-secret"
AWS_S3_BUCKET: "kimochi-backups"
```

#### 3. 环境配置
在 `Settings > Environments` 中创建：
- **staging**: 预发布环境
- **production**: 生产环境

每个环境配置相应的保护规则和变量。

### GitHub Pages配置 (可选)
如果需要部署静态页面：
1. 在 `Settings > Pages` 中启用
2. 选择源分支 (通常是main)
3. 配置自定义域名 (如果有)

## 🔄 CI/CD配置

### 当前配置状态
- ✅ **代码质量检查**: ESLint、TypeScript类型检查
- ✅ **安全扫描**: npm audit、依赖漏洞检查  
- ✅ **构建验证**: Next.js构建测试
- ✅ **多版本测试**: Node.js 18.x, 20.x, 22.x
- ✅ **Docker构建测试**: 镜像构建验证
- ⏸️ **部署步骤**: 暂时禁用，等待服务器配置

### 工作流文件说明

#### `.github/workflows/ci-cd.yml`
主要的CI/CD流程：
- **触发条件**: push到dev/prod分支，PR到dev/prod
- **执行步骤**: 测试与代码检查 → 构建 → 部署到开发/生产环境
- **部署**: 自动部署到对应环境

#### `.github/workflows/release.yml`  
版本发布流程：
- **触发条件**: 推送版本标签 (v*)
- **执行步骤**: 创建GitHub Release、构建Docker镜像、生成变更日志

#### `.github/workflows/version-management.yml`
版本管理：
- **触发条件**: main分支推送
- **执行步骤**: 自动递增patch版本、创建标签

### 启用生产部署
当服务器准备就绪时，修改 `ci-cd.yml` 中的部署脚本：
```yaml
# 在 deploy-dev 和 deploy-prod 作业中添加实际的部署命令
- name: Deploy to Development Server
  run: |
    # 添加实际的开发环境部署脚本
    
- name: Deploy to Production Server
  run: |
    # 添加实际的生产环境部署脚本
```

## 🌍 环境变量配置

### 环境文件结构
```
config/environments/
├── env.development  # 开发环境模板
└── env.production   # 生产环境模板

.env.local           # 本地开发环境
.env.production.local # 生产环境
```

### 核心环境变量

#### 数据库配置
```bash
DATABASE_URL="file:./prisma/dev.db"
```

#### JWT配置
```bash
JWT_SECRET="your-super-secret-jwt-key"
# 生成命令: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 邮件配置 (可选)
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

#### 云存储配置 (可选)
```bash
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET="kimochi-backups"
AWS_REGION="us-east-1"
```

### 环境变量管理
```bash
# 生成JWT密钥
./scripts/kimochi.sh env jwt --gen

# 设置开发环境
./scripts/kimochi.sh setup development

# 验证配置
./scripts/kimochi.sh health
```

## 🐳 Docker配置

### 基础配置
项目使用多阶段Docker构建：
- **deps**: 依赖安装阶段
- **builder**: 应用构建阶段
- **runner**: 运行时阶段

### 环境配置
```bash
# 开发环境
docker-compose --profile dev up

# 测试环境  
docker-compose --profile test up

# 预发布环境
docker-compose --profile staging up

# 生产环境
docker-compose --profile prod up
```

### 服务配置
- **kimochi**: 主应用服务
- **nginx**: 反向代理 (生产环境)
- **redis**: 缓存服务 (可选)
- **prometheus**: 监控服务 (可选)
- **grafana**: 可视化监控 (可选)

## 🔧 开发工具配置

### VSCode配置
推荐的扩展：
- ESLint
- Prettier
- TypeScript
- Tailwind CSS IntelliSense
- Prisma

### Git配置
```bash
# 设置用户信息
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# 设置默认分支
git config --global init.defaultBranch main

# 设置推送策略
git config --global push.default simple
```

## 🆘 配置故障排除

### SSH连接问题
```bash
# 检查SSH密钥
./scripts/kimochi.sh ssh check

# 测试GitHub连接
./scripts/kimochi.sh ssh test

# 重新配置SSH
./scripts/kimochi.sh ssh setup your-email@example.com
```

### 环境配置问题
```bash
# 系统诊断
./scripts/kimochi.sh doctor

# 健康检查
./scripts/kimochi.sh health

# 查看系统信息
./scripts/kimochi.sh system
```

### CI/CD问题
- 检查GitHub Secrets是否正确配置
- 验证工作流文件语法
- 查看Actions执行日志
- 确认分支保护规则设置

---

**相关文档**:
- [部署指南](DEPLOYMENT-GUIDE.md) - 完整的部署教程
- [开发指南](DEVELOPMENT-GUIDE.md) - 开发环境和工作流程
- [本地开发指南](LOCAL-DEVELOPMENT-GUIDE.md) - 本地开发环境配置
- [故障排除指南](TROUBLESHOOTING.md) - 常见问题解决
