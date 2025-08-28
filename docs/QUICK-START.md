# ⚡ kimochi心晴 - 5分钟快速开始

**目标**: 在5分钟内了解项目并开始使用  
**适用**: 所有用户 (开发者、运维、产品经理)

## 🎯 项目简介

**kimochi心晴** 是一个现代化的心理健康平台，提供专业的心理测评、安全的社交环境和AI智能分析功能。

### ✨ 核心功能
- 🧠 **心理测评**: MBTI、九型人格、心理健康评估
- 💬 **社交互动**: 匿名交流、心情墙、私信系统
- 📱 **多端支持**: Web网站 + 微信小程序
- 🤖 **AI分析**: DeepSeek驱动的智能心理分析
- 🌤️ **天气集成**: 实时天气和地理位置服务

## 🌐 立即体验

### 在线访问
**生产环境**: https://47.104.8.84

### 测试账号
- **管理员**: admin@kimochi.space / kimochi@2025
- **普通用户**: 可现场注册或联系管理员创建

## 🚀 快速部署

### 1. 克隆项目
```bash
git clone https://github.com/xuhao2004/kimochi.git
cd kimochi
```

### 2. 本地开发
```bash
# 安装依赖
npm install

# 配置环境
cp .env.example .env.local
# 编辑.env.local填入必要配置

# 启动开发服务器
npm run dev
```

### 3. 生产部署
```bash
# 服务器初始化 (仅首次)
./scripts/deploy.sh init

# 快速部署
./scripts/local-update.sh -m "首次部署" -d
```

## 🛠️ 技术栈一览

### 前端技术
- **框架**: Next.js 15 + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **状态**: React Context + Hooks

### 后端技术
- **API**: Next.js API Routes
- **数据库**: Prisma ORM + SQLite
- **认证**: JWT + bcrypt
- **邮件**: Nodemailer

### 部署技术
- **进程管理**: PM2
- **反向代理**: Nginx
- **HTTPS**: SSL/TLS
- **服务器**: Ubuntu + 中国镜像优化

### 第三方集成
```
📧 SMTP邮件     ✅ QQ邮箱集成
🤖 AI服务       ✅ DeepSeek API  
🌤️ 天气API     ✅ 和风天气
🗺️ 地图服务     ✅ 高德地图 (数字签名)
📱 微信小程序   ✅ 原生开发
```

## 📋 项目结构

```
kimochi/
├── 📁 src/                 # 源代码
│   ├── app/               # Next.js App Router
│   ├── components/        # React组件
│   ├── lib/              # 工具库
│   └── hooks/            # 自定义Hooks
├── 📁 prisma/             # 数据库
├── 📁 public/             # 静态资源
├── 📁 scripts/            # 部署脚本
├── 📁 docs/              # 项目文档
├── 📁 mini-program/       # 微信小程序
└── 📁 config/            # 配置模板
```

## 🔧 常用命令

### 开发命令
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
```

### 数据库命令
```bash
npx prisma generate  # 生成Prisma客户端
npx prisma db push   # 推送数据库变更
npx prisma studio    # 打开数据库管理界面
```

### 部署命令
```bash
./scripts/local-update.sh -d     # 快速部署
./scripts/deploy.sh status       # 检查服务器状态
node scripts/test-apis.js        # 测试API服务
node scripts/create-super-admin.js  # 创建管理员
```

## 🎨 功能演示

### 1. 心理测评系统
- MBTI人格测试 (16型人格)
- 九型人格测评
- 自定义心理量表
- AI智能分析报告

### 2. 社交互动功能
- 匿名心情墙发布
- 私信聊天系统
- 好友关系管理
- 表情贴纸系统

### 3. 智能服务
- 实时天气显示
- 地理位置获取 (Safari兼容)
- AI心理建议
- 邮件通知服务

## 🔍 深入了解

### 📚 详细文档
- [部署指南](./DEPLOYMENT.md) - 完整生产环境部署
- [开发指南](./DEVELOPMENT.md) - 本地开发环境配置  
- [配置指南](./CONFIGURATION.md) - 环境变量和参数
- [API文档](./API-REFERENCE.md) - 接口文档
- [故障排除](./TROUBLESHOOTING.md) - 常见问题解决

### 🎯 使用场景
- **学校心理中心**: 学生心理健康评估和管理
- **企业EAP**: 员工心理关怀和支持服务
- **心理咨询**: 专业心理咨询师工具平台
- **个人使用**: 自我心理健康管理工具

### 🛡️ 隐私安全
- 端到端数据加密
- 匿名化处理选项
- GDPR兼容设计
- 严格的数据权限控制

## 📞 获取帮助

### 技术支持
- **项目仓库**: https://github.com/xuhao2004/kimochi
- **问题反馈**: GitHub Issues
- **管理员**: admin@kimochi.space

### 快速问题排查
1. **部署问题**: 查看 [故障排除文档](./TROUBLESHOOTING.md)
2. **API问题**: 运行 `node scripts/test-apis.js`
3. **权限问题**: 检查环境变量配置
4. **性能问题**: 查看PM2日志 `pm2 logs kimochi`

---

## 🚀 下一步

选择适合您的路径：

- **👩‍💻 开发者**: 阅读 [开发指南](./DEVELOPMENT.md) 开始贡献代码
- **🔧 运维**: 查看 [部署指南](./DEPLOYMENT.md) 部署生产环境  
- **📊 产品**: 体验在线功能并提出需求反馈
- **🎓 研究**: 了解技术架构和实现细节

**立即开始**: https://47.104.8.84 🎉
