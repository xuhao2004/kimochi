# 🔧 Kimochi 开发指南

**版本**: v1.2.1  
**更新时间**: 2024-08-25

## 📋 开发环境概览

Kimochi是一个基于Next.js的现代化心理健康服务平台，采用TypeScript、Prisma、Tailwind CSS等技术栈。

## 🏗️ 技术架构

### 核心技术栈
- **前端框架**: Next.js 15.4.6 + React 19
- **类型系统**: TypeScript 5.7.2
- **数据库**: SQLite + Prisma ORM
- **样式系统**: Tailwind CSS 3.4.17
- **状态管理**: React Context + Hooks
- **认证系统**: JWT + 自定义认证
- **部署**: Docker + PM2

### 项目结构
```
kimochi/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # 可复用组件
│   ├── contexts/           # React Context
│   ├── hooks/              # 自定义Hooks
│   └── lib/                # 工具库和配置
├── prisma/                 # 数据库架构和迁移
├── public/                 # 静态资源
├── scripts/                # 自动化脚本
├── tools/                  # 开发工具
└── docs/                   # 项目文档
```

## 🚀 快速开始

### 1. 环境准备
```bash
# 克隆项目
git clone git@github.com:xuhao2004/kimochi.git
cd kimochi

# 安装依赖
npm ci

# 配置SSH (首次使用)
./scripts/kimochi.sh ssh setup your-email@example.com
```

### 2. 环境配置
```bash
# 一键环境设置
./scripts/kimochi.sh setup development

# 或手动配置
cp config/environments/env.development .env.local
# 编辑 .env.local 文件
```

### 3. 数据库初始化
```bash
# 生成Prisma客户端
npx prisma generate

# 推送数据库架构
npm run db:push

# 创建超级管理员 (可选)
npm run superadmin:create:dev
```

### 4. 启动开发服务器
```bash
# 方式1: 直接启动
npm run dev

# 方式2: 使用统一CLI
./scripts/kimochi.sh oneclick dev

# 方式3: 使用Docker
docker-compose --profile dev up
```

访问 http://localhost:3001 查看应用。

## 🔄 开发工作流程

### Git工作流程

#### 分支策略
```
develop (开发) → staging (预发布) → main (生产) → test (测试)
```

#### 功能开发流程
```bash
# 1. 创建功能分支
./scripts/kimochi.sh git feature user-login

# 2. 开发功能...
# 编辑代码、测试等

# 3. 提交功能 (自动合并到develop)
./scripts/kimochi.sh git commit "完成用户登录功能"

# 4. 查看分支状态
./scripts/kimochi.sh git status
```

#### 版本发布流程
```bash
# 1. 同步所有分支
./scripts/kimochi.sh git sync

# 2. 运行测试
npm test

# 3. 发布版本 (自动更新版本文件、创建标签、同步分支)
./scripts/kimochi.sh git release 1.2.5
```

### 代码质量保证

#### 代码检查
```bash
# 代码风格检查
npm run lint

# 类型检查
npm run test:type

# 构建测试
npm run test:build

# 完整测试套件
npm test
```

#### 自动化检查
项目配置了GitHub Actions，每次推送都会自动执行：
- ESLint代码风格检查
- TypeScript类型检查
- 构建验证
- 安全扫描

### 避免GitHub PR弹出

#### 问题说明
GitHub会在分支领先时自动显示"Compare & pull request"按钮，对于个人开发项目，这通常不是必需的。

#### 推荐工作流程
```bash
# ❌ 避免这样做 (会触发PR按钮)
git commit -m "新功能"
git push origin develop  # ← 触发PR按钮

# ✅ 推荐这样做 (避免PR按钮)
./scripts/kimochi.sh git commit "新功能"  # 自动处理合并
```

#### 何时使用PR
- **团队协作**: 多人开发时的代码审查
- **重大功能**: 需要讨论和审查的大型功能
- **外部贡献**: 开源项目的外部贡献者

## 🧪 测试和调试

### 测试策略
```bash
# 单元测试 (待完善)
npm run test:unit

# 集成测试
npm run test:integration

# 端到端测试
npm run test:e2e

# 性能测试
npm run test:performance
```

### 调试工具
```bash
# 系统诊断
./scripts/kimochi.sh doctor

# 健康检查
./scripts/kimochi.sh health

# 查看日志
./scripts/kimochi.sh logs

# 性能监控
./scripts/kimochi.sh monitor
```

### 数据库管理
```bash
# 查看数据库状态
npm run db:status

# 数据库迁移
npm run db:deploy

# 重置数据库
npm run system:reset

# 数据库备份
./scripts/kimochi.sh backup full
```

## 🎨 UI/UX开发

### 设计系统
项目采用Apple Design System风格：
- **颜色系统**: 基于Apple Human Interface Guidelines
- **组件库**: 统一的可复用组件
- **图标系统**: SF Symbols风格图标
- **动画**: 流畅的过渡动画

### 组件开发
```bash
# 查看组件库文档
cat src/components/README.md

# 组件开发最佳实践
# 1. 使用TypeScript定义Props
# 2. 遵循命名规范
# 3. 添加适当的注释
# 4. 考虑可访问性
```

### 样式开发
```bash
# Tailwind CSS配置
# 配置文件: tailwind.config.js
# 自定义样式: src/app/globals.css

# 响应式设计
# 移动优先: sm: md: lg: xl: 2xl:
# 暗色模式: dark:
```

## 📱 多端开发

### Web端开发
- **主应用**: Next.js应用 (端口3001)
- **落地页**: 静态页面 (端口3002)
- **管理后台**: 集成在主应用中

### 小程序开发
```bash
# 小程序代码位置
cd mini-program/

# 开发工具
# 使用微信开发者工具打开mini-program目录
```

## 🔧 开发工具配置

### VSCode配置
推荐扩展：
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma"
  ]
}
```

### 开发脚本
```bash
# 查看所有可用命令
./scripts/kimochi.sh --help

# 开发相关命令
./scripts/kimochi.sh oneclick dev     # 一键启动开发环境
./scripts/kimochi.sh stop --force     # 强制停止服务
./scripts/kimochi.sh system           # 查看系统信息
./scripts/kimochi.sh cache:clear      # 清理缓存
```

## 🚀 部署和发布

### 本地部署测试
```bash
# 构建应用
npm run build

# 启动生产模式
npm start

# 或使用Docker测试
docker-compose --profile prod up
```

### 版本管理
```bash
# 查看当前版本
cat package.json | grep version

# 发布新版本
./scripts/kimochi.sh git release 1.2.5

# 查看版本历史
git tag -l | sort -V
```

## 📚 开发资源

### 文档链接
- [配置指南](CONFIGURATION-GUIDE.md) - SSH、GitHub、CI/CD配置
- [部署指南](DEPLOYMENT-GUIDE.md) - 完整的部署教程
- [本地开发指南](LOCAL-DEVELOPMENT-GUIDE.md) - 本地开发环境配置
- [故障排除指南](TROUBLESHOOTING.md) - 常见问题解决

### 外部资源
- [Next.js文档](https://nextjs.org/docs)
- [Prisma文档](https://www.prisma.io/docs)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [TypeScript文档](https://www.typescriptlang.org/docs)

## 🤝 贡献指南

### 代码规范
- 使用TypeScript进行类型安全开发
- 遵循ESLint配置的代码风格
- 组件和函数添加适当的注释
- 提交信息遵循约定式提交规范

### 提交规范
```bash
# 提交类型
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

### 开发最佳实践
1. **小而频繁的提交**: 保持提交粒度适中
2. **功能分支开发**: 使用feature分支进行功能开发
3. **代码审查**: 重要功能进行代码审查
4. **测试覆盖**: 为新功能添加适当的测试
5. **文档更新**: 及时更新相关文档

---

**下一步**: 查看[配置指南](CONFIGURATION-GUIDE.md)完成环境配置，或查看[本地开发指南](LOCAL-DEVELOPMENT-GUIDE.md)了解本地开发环境配置。
