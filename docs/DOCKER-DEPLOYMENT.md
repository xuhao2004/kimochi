# Docker 容器化部署指南

## 概述

本项目提供了完整的Docker容器化解决方案，支持开发环境和生产环境的快速部署。

## 文件结构

```
├── Dockerfile              # 生产环境镜像
├── Dockerfile.dev          # 开发环境镜像
├── docker-compose.yml      # Docker Compose 配置
└── docs/DOCKER-DEPLOYMENT.md # 本文档
```

## 快速开始

### 开发环境

```bash
# 构建并启动开发环境
docker-compose up kimochi-dev

# 后台运行
docker-compose up -d kimochi-dev

# 查看日志
docker-compose logs -f kimochi-dev
```

访问地址：http://localhost:3001

### 生产环境

```bash
# 构建并启动生产环境
docker-compose --profile production up kimochi-prod

# 后台运行
docker-compose --profile production up -d kimochi-prod
```

访问地址：http://localhost:3000

### 数据库管理界面

```bash
# 启动 Prisma Studio
docker-compose --profile dev-tools up prisma-studio
```

访问地址：http://localhost:5555

## 环境配置

### 开发环境变量

创建 `.env.local` 文件：

```env
NODE_ENV=development
DATABASE_URL=file:./dev.db
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-dev-secret-key
```

### 生产环境变量

创建 `.env.production` 文件：

```env
NODE_ENV=production
DATABASE_URL=file:./prod.db
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret-key
```

## 常用命令

### 构建镜像

```bash
# 构建开发环境镜像
docker build -f Dockerfile.dev -t kimochi:dev .

# 构建生产环境镜像
docker build -f Dockerfile -t kimochi:prod .
```

### 运行容器

```bash
# 运行开发环境
docker run -p 3001:3000 -v $(pwd):/app kimochi:dev

# 运行生产环境
docker run -p 3000:3000 kimochi:prod
```

### 数据库操作

```bash
# 进入容器执行数据库迁移
docker-compose exec kimochi-dev npx prisma migrate dev

# 推送数据库模式
docker-compose exec kimochi-dev npx prisma db push

# 查看数据库状态
docker-compose exec kimochi-dev npx prisma migrate status
```

### 日志管理

```bash
# 查看实时日志
docker-compose logs -f kimochi-dev

# 查看最近100行日志
docker-compose logs --tail=100 kimochi-dev
```

## 生产部署最佳实践

### 1. 使用反向代理

推荐使用 Nginx 作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
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

### 2. 数据持久化

```bash
# 创建数据卷
docker volume create kimochi-data

# 运行时挂载数据卷
docker run -v kimochi-data:/app/data kimochi:prod
```

### 3. 健康检查

容器内置健康检查，可以通过以下命令查看：

```bash
# 查看容器健康状态
docker ps

# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' container_name
```

### 4. 资源限制

```bash
# 限制内存和CPU使用
docker run --memory=1g --cpus=1.0 kimochi:prod
```

## 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 查看端口占用
   lsof -i :3000
   
   # 修改端口映射
   docker run -p 3002:3000 kimochi:dev
   ```

2. **权限问题**
   ```bash
   # 修复文件权限
   sudo chown -R $USER:$USER .
   ```

3. **数据库连接问题**
   ```bash
   # 重新生成 Prisma 客户端
   docker-compose exec kimochi-dev npx prisma generate
   ```

4. **构建失败**
   ```bash
   # 清理 Docker 缓存
   docker system prune -a
   
   # 重新构建
   docker-compose build --no-cache
   ```

### 日志调试

```bash
# 查看构建日志
docker-compose build kimochi-dev 2>&1 | tee build.log

# 查看运行时日志
docker-compose logs kimochi-dev > runtime.log
```

## 监控和维护

### 容器监控

```bash
# 查看容器资源使用情况
docker stats

# 查看容器详细信息
docker inspect kimochi-dev
```

### 定期维护

```bash
# 清理未使用的镜像
docker image prune

# 清理未使用的容器
docker container prune

# 清理未使用的网络
docker network prune
```

## 安全建议

1. **使用非root用户运行容器**
2. **定期更新基础镜像**
3. **使用多阶段构建减少攻击面**
4. **配置适当的网络策略**
5. **定期备份数据**

## 扩展部署

### 使用 Docker Swarm

```bash
# 初始化 Swarm
docker swarm init

# 部署服务栈
docker stack deploy -c docker-compose.yml kimochi
```

### 使用 Kubernetes

参考 `k8s/` 目录下的 Kubernetes 配置文件（如果有的话）。

---

更多详细信息请参考：
- [配置指南](CONFIGURATION-GUIDE.md)
- [部署指南](DEPLOYMENT-GUIDE.md)
- [故障排除指南](TROUBLESHOOTING.md)