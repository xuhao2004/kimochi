# 故障排除指南

## 环境配置问题

### 1. 环境文件缺失
**现象**: 运行命令时提示环境配置文件缺失
```
[WARN] 未找到环境文件: .env.local
```

**解决方案**:
```bash
# 手动复制模板
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

### 2. JWT_SECRET 为空或无效
**现象**: 登录失败，JWT 相关错误
```
Error: JWT_SECRET is required
```

**解决方案**:
```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 手动设置到环境文件
echo 'JWT_SECRET="your-generated-secret-here"' >> .env.local
```

### 3. 数据库连接失败
**现象**: Prisma 连接错误
```
Error: Can't reach database server
```

**解决方案**:
```bash
# 检查 DATABASE_URL 配置
cat .env.local | grep DATABASE_URL

# 重新初始化数据库
npx prisma migrate reset

# 检查文件权限
ls -la prisma/
```

## 端口与网络问题

### 4. 端口被占用
**现象**: 启动失败，端口冲突
```
Error: listen EADDRINUSE :::3001
```

**解决方案**:
```bash
# 方案1: 查找并杀死占用进程
lsof -ti :3000 | xargs kill -9

# 方案2: 使用其他端口
PORT=3005 npm run dev

# 方案3: 检查所有Node.js进程
ps aux | grep node
```

### 5. 网络连接失败
**现象**: 无法访问外部服务
```
Error: getaddrinfo ENOTFOUND
```

**解决方案**:
```bash
# 检查网络连接
ping 8.8.8.8

# 检查 DNS 解析
nslookup google.com

# 使用代理（如需要）
export HTTP_PROXY=http://proxy.example.com:8080
```

## 依赖安装问题

### 6. npm 安装失败
**现象**: 依赖安装报错
```
npm ERR! code EACCES
npm ERR! permission denied
```

**解决方案**:
```bash
# 方案1: 使用项目本地缓存
NPM_CONFIG_CACHE=./.npm-cache npm install

# 方案2: 修复 npm 权限
sudo chown -R $(whoami) ~/.npm

# 方案3: 清理缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 7. PM2 全局安装失败
**现象**: PM2 命令不可用
```
pm2: command not found
```

**解决方案**:
```bash
# 使用npm脚本启动生产环境
npm run start

# 如需全局安装PM2
npm install -g pm2

# 或使用本地版本
npx pm2 list
```

## Git 操作问题

### 8. Git 推送失败
**现象**: 推送时认证失败
```
Permission denied (publickey)
```

**解决方案**:
```bash
# 生成SSH密钥
ssh-keygen -t ed25519 -C "your-email@example.com"

# 手动添加到 GitHub
cat ~/.ssh/id_ed25519.pub
# 复制内容到 GitHub → Settings → SSH and GPG keys

# 测试连接
ssh -T git@github.com
```

### 9. 提交失败
**现象**: Git 提交被拒绝
```
error: failed to push some refs
```

**解决方案**:
```bash
# 拉取最新代码
git pull origin main

# 解决冲突后重新提交
git add .
git commit -m "fix: 解决冲突"
git push

# 强制推送（谨慎使用）
git push --force-with-lease
```

## Cloudflare 隧道问题

### 10. Cloudflared 未安装
**现象**: 命令不存在
```
cloudflared: command not found
```

**解决方案**:
```bash
# macOS
brew install cloudflared

# Ubuntu/Debian
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install cloudflared

# CentOS/RHEL
sudo yum install cloudflared
```

### 11. 隧道登录失败
**现象**: 浏览器认证失败
```
Error: failed to login
```

**解决方案**:
```bash
# 重新登录
./scripts/kimochi.sh cf setup

# 手动登录
cloudflared tunnel login

# 检查凭据文件
ls -la ~/.cloudflared/
```

### 12. 域名解析失败
**现象**: 域名无法访问
```
This site can't be reached
```

**解决方案**:
```bash
# 测试隧道连通性
./scripts/kimochi.sh cf test

# 检查 DNS 设置
nslookup dev.kimochi.space

# 重启隧道
./scripts/kimochi.sh cf start
```

## 数据库问题

### 13. 数据库迁移失败
**现象**: Prisma 迁移错误
```
Error: Migration failed
```

**解决方案**:
```bash
# 重置数据库（开发环境）
rm prisma/dev.db
./scripts/kimochi.sh db init development

# 强制推送 Schema（谨慎使用）
npx prisma db push --accept-data-loss

# 检查迁移状态
npx prisma migrate status
```

### 14. 数据库锁定
**现象**: 数据库被锁定
```
Error: database is locked
```

**解决方案**:
```bash
# 查找占用进程
lsof prisma/dev.db

# 杀死占用进程
pkill -f "prisma\|node"

# 重启应用
./scripts/kimochi.sh stop --force
./scripts/kimochi.sh oneclick dev
```

### 15. 数据合并冲突
**现象**: 数据库合并失败
```
Error: UNIQUE constraint failed
```

**解决方案**:
```bash
# 使用覆盖策略
./scripts/kimochi.sh db merge production backup.db overwrite

# 手动处理冲突
sqlite3 prisma/prod.db
.schema
# 检查冲突数据并手动清理
```

## 系统兼容性问题

### 16. Windows 路径问题
**现象**: 路径分隔符错误
```
Error: ENOENT: no such file or directory
```

**解决方案**:
```powershell
# 使用 PowerShell 入口
.\scripts\kimochi.ps1 setup

# 检查路径格式
Get-Location
```

### 17. macOS 权限问题
**现象**: 操作被拒绝
```
Operation not permitted
```

**解决方案**:
```bash
# 修复目录权限
sudo chown -R $(whoami) .

# 允许终端完全磁盘访问
# 系统偏好设置 → 安全性与隐私 → 隐私 → 完全磁盘访问

# 使用 sudo（谨慎）
sudo ./scripts/kimochi.sh setup
```

### 18. Linux 依赖缺失
**现象**: 系统工具不可用
```
bash: lsof: command not found
```

**解决方案**:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install lsof sqlite3 curl git

# CentOS/RHEL
sudo yum install lsof sqlite curl git

# Alpine Linux
apk add lsof sqlite curl git
```

## 性能问题

### 19. 启动缓慢
**现象**: 应用启动时间过长

**解决方案**:
```bash
# 清理缓存
rm -rf .next node_modules/.cache

# 使用更快的包管理器
npm install -g pnpm
pnpm install

# 检查磁盘空间
df -h
```

### 20. 内存不足
**现象**: 构建或运行时内存溢出
```
JavaScript heap out of memory
```

**解决方案**:
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 或在 package.json 中设置
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
}
```

## 高级功能问题

### 21. 系统诊断问题

#### doctor 命令执行失败
**现象**: `./scripts/kimochi.sh doctor` 报错
**原因**: 缺少必要的系统工具或权限不足
**解决方案**:
```bash
# 确保有必要的系统工具
# macOS/Linux
which lsof df sqlite3

# 如果缺少工具，安装它们
# macOS
brew install sqlite

# Ubuntu/Debian
sudo apt-get install sqlite3 lsof

# 检查权限
chmod +x tools/cli/kimochi.js
```

#### 数据库连接检查失败
**现象**: doctor 报告数据库连接失败
**原因**: 环境变量未设置或数据库文件不存在
**解决方案**:
```bash
# 检查环境变量
./scripts/kimochi.sh env jwt --gen

# 初始化数据库
./scripts/kimochi.sh db init development

# 重新运行诊断
./scripts/kimochi.sh doctor --fix
```

### 22. 性能优化问题

#### optimize 命令权限错误
**现象**: 优化过程中出现权限错误
**原因**: 无法访问某些目录或文件
**解决方案**:
```bash
# 检查项目目录权限
ls -la .

# 修复权限（谨慎使用）
chmod -R 755 .
chown -R $USER:$USER .

# 或者使用 sudo 运行
sudo ./scripts/kimochi.sh optimize --fix
```

#### 缓存清理失败
**现象**: 缓存清理过程中报错
**原因**: 文件被占用或权限不足
**解决方案**:
```bash
# 停止所有相关进程
./scripts/kimochi.sh stop --force

# 手动清理缓存
rm -rf .next/cache node_modules/.cache

# 重新运行优化
./scripts/kimochi.sh optimize
```

### 23. 监控与备份问题

#### 监控命令无法获取系统信息
**现象**: `monitor` 命令显示信息不完整
**原因**: 缺少系统监控工具
**解决方案**:
```bash
# macOS
brew install coreutils

# Ubuntu/Debian
sudo apt-get install sysstat

# 检查工具是否可用
df -h
lsof -v
```

#### 备份创建失败
**现象**: `backup` 命令报错
**原因**: 磁盘空间不足或权限问题
**解决方案**:
```bash
# 检查磁盘空间
df -h

# 检查备份目录权限
ls -la .backups/

# 创建备份目录
mkdir -p .backups
chmod 755 .backups

# 清理旧备份释放空间
find .backups -name "backup-*" -mtime +7 -delete
```

#### 日志查看失败
**现象**: `logs` 命令无法显示日志
**原因**: 日志文件不存在或权限问题
**解决方案**:
```bash
# 检查日志目录
ls -la .deploy-logs/

# 创建日志目录
mkdir -p .deploy-logs
chmod 755 .deploy-logs

# 检查日志文件
ls -la .deploy-logs/*.log

# 如果没有日志，先运行一些命令生成日志
./scripts/kimochi.sh doctor
./scripts/kimochi.sh logs general
```

### 24. CI/CD 相关问题

#### GitHub Actions 构建失败
**现象**: CI/CD 流水线失败
**原因**: 环境配置或依赖问题
**解决方案**:
1. 检查 `.github/workflows/` 配置文件
2. 确保所有必要的 secrets 已配置
3. 本地测试构建过程：
```bash
# 本地测试构建
npm ci
npm run build
npm test

# 检查 Docker 构建
docker build -t kimochi-test .
```

#### Docker 容器启动失败
**现象**: 容器化部署失败
**原因**: 配置错误或端口冲突
**解决方案**:
```bash
# 检查端口占用
./scripts/kimochi.sh monitor

# 停止冲突的服务
./scripts/kimochi.sh stop --force

# 重新构建镜像
docker-compose build --no-cache

# 启动服务
docker-compose up -d
```

## 调试技巧

### 系统诊断
```bash
# 全面健康检查（新版本）
./scripts/kimochi.sh doctor

# 性能监控
./scripts/kimochi.sh monitor

# 系统信息
./scripts/kimochi.sh system

# 传统健康检查
./scripts/kimochi.sh health

# 检查进程状态
ps aux | grep node

# 检查端口占用
netstat -tulpn | grep :300

# 检查磁盘空间
df -h

# 检查内存使用
free -h
```

### 日志查看
```bash
# 查看应用日志
tail -f .deploy-logs/*.log

# 查看系统日志
journalctl -f

# 查看 PM2 日志
npx pm2 logs
```

### 网络诊断
```bash
# 测试本地端口
curl http://localhost:3001

# 测试域名解析
dig dev.kimochi.space

# 测试 HTTPS 连接
curl -I https://dev.kimochi.space
```

## 获取帮助

### 社区支持
- GitHub Issues: 报告 Bug 和功能请求
- 讨论区: 技术交流和问题讨论

### 联系方式
- 邮箱: support@kimochi.space
- 文档: [本地开发指南](LOCAL-DEVELOPMENT-GUIDE.md)

### 紧急情况
如果遇到严重问题无法解决：
1. 备份重要数据
2. 记录错误信息和操作步骤
3. 提交详细的 Issue 报告
4. 考虑回滚到上一个稳定版本
