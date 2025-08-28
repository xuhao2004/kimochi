# 本地开发环境配置指南

## 🎯 开发环境 vs 生产部署

### 环境对比

| 环境类型 | 端口 | 用途 | 数据库 | 特点 |
|---------|------|------|--------|------|
| 开发环境 | 3001 | 本地开发 | dev.db | 热重载、调试模式 |
| 测试环境 | 3003 | 自动化测试 | test.db | 独立测试数据 |
| 预发布环境 | 3002 | 发布前验证 | staging.db | 生产配置测试 |
| 生产环境 | 3000 | 正式服务 | prod.db | 性能优化、监控 |

### 局域网访问配置

#### 开发环境局域网访问
```bash
# 启动开发服务器（局域网可访问）
npm run dev

# 或使用Docker
docker-compose --profile dev up
```

**访问地址**：
- 本地：http://127.0.0.1:3001
- 局域网：http://[你的IP]:3001

#### 获取局域网IP
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"
```

## 🚀 快速开始

### 1. 环境准备
```bash
# 克隆项目
git clone git@github.com:xuhao2004/kimochi.git
cd kimochi

# 检查Node.js版本（需要18+）
node --version
```

### 2. 依赖安装
```bash
# 安装Node.js依赖
npm ci

# 生成Prisma客户端
npx prisma generate
```

### 3. 环境配置
```bash
# 创建环境文件
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

### 4. 数据库初始化
```bash
# 推送数据库架构
npm run db:push

# 生成Prisma客户端
npx prisma generate
```

### 5. 启动开发服务器
```bash
# 方式1：直接启动
npm run dev

# 方式2：使用Docker
docker-compose --profile dev up

# 访问应用
# 浏览器打开: http://localhost:3000
```

## 🔧 开发工具

### 代码质量检查
```bash
# 代码风格检查
npm run lint

# 构建测试
npm run build

# 完整测试套件
npm run test
```

### 数据库管理
```bash
# 查看数据库状态
npm run db:status

# 重置数据库
npx prisma migrate reset

# 数据库迁移
npm run db:deploy
```

### 系统诊断
```bash
# 检查构建状态
npm run build

# 端口占用检查
lsof -ti :3000

# 清理缓存
npm run cache:clear
```

## 🐳 Docker开发环境

### 启动开发环境
```bash
# 启动开发服务
docker-compose --profile dev up

# 后台运行
docker-compose --profile dev up -d

# 查看日志
docker-compose logs -f kimochi-dev
```

### 多环境测试
```bash
# 启动测试环境
docker-compose --profile test up

# 启动预发布环境
docker-compose --profile staging up

# 启动完整生产环境（本地测试）
docker-compose --profile prod up
```

### Docker管理命令
```bash
# 重建镜像
docker-compose build kimochi-dev

# 清理容器
docker-compose down

# 清理数据卷
docker-compose down -v

# 查看容器状态
docker-compose ps
```

## 📊 监控和调试

### 健康检查
```bash
# 检查应用健康状态
curl http://localhost:3001/api/health

# 检查数据库连接
curl http://localhost:3001/api/health | jq '.checks.database'
```

### 性能监控
```bash
# 启动监控服务
docker-compose --profile monitoring up

# 访问监控面板
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

### 日志查看
```bash
# 应用日志
docker-compose logs kimochi-dev

# 数据库日志
docker-compose logs -f kimochi-dev | grep "prisma"

# 系统日志
tail -f .deploy-logs/kimochi.log
```

## 🔍 故障排除

### 常见问题

#### 端口占用
```bash
# 查找占用进程
lsof -ti :3001

# 终止进程
kill -9 $(lsof -ti :3001)
```

#### 数据库问题
```bash
# 重置数据库
npm run system:reset

# 重新生成Prisma客户端
npx prisma generate

# 检查数据库文件
ls -la prisma/*.db
```

#### 依赖问题
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 清理缓存
npm run cache:clear
```

#### Docker问题
```bash
# 重建所有镜像
docker-compose build --no-cache

# 清理Docker缓存
docker system prune -a

# 重置Docker环境
docker-compose down -v && docker-compose up --build
```

## 📝 开发最佳实践

### 代码提交前检查
```bash
# 运行完整测试套件
npm test

# 代码格式化
npm run lint

# 构建验证
npm run build
```

### 分支管理
- `main`: 生产环境代码
- `develop`: 开发环境代码
- `staging`: 预发布环境代码
- `feature/*`: 功能分支

### 环境变量管理
- `.env.dev.local`: 开发环境
- `.env.staging.local`: 预发布环境
- `.env.prod.local`: 生产环境

---

**更新时间**: 2024-08-25  
**版本**: 1.0.0
