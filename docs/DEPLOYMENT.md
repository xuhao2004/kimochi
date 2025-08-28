# 🚀 kimochi心晴 - 生产环境部署指南

**版本**: v2.0.0  
**最后更新**: 2025-08-28  
**验证环境**: 青岛阿里云 2核2G Ubuntu

## 📋 部署概览

本指南基于实际生产环境部署经验，涵盖从零开始到完整上线的全过程。

### 🎯 部署目标
- ✅ 青岛阿里云轻量应用服务器 (47.104.8.84)
- ✅ 2核2G配置优化
- ✅ HTTPS安全访问
- ✅ 100%第三方API服务可用
- ✅ Safari地理位置权限兼容
- ✅ 自动化更新系统

## 🏗️ 服务器环境要求

### 基础配置
- **系统**: Ubuntu 22.04+
- **配置**: 最低2核2G (已优化)
- **网络**: 支持22、80、443端口
- **权限**: root访问权限

### 关键端口配置
```bash
22   - SSH访问
80   - HTTP (自动重定向到HTTPS)
443  - HTTPS (主要访问端口)
3000 - 应用端口 (内网)
```

## 🔑 第一步：SSH密钥配置

### 1. 使用项目提供的SSH密钥
```bash
# 密钥文件位置
./kimochi-prod.pem

# 连接服务器
ssh -i kimochi-prod.pem root@47.104.8.84
```

### 2. 验证连接
```bash
# 测试连接
ssh -i kimochi-prod.pem root@47.104.8.84 "echo '连接成功'"
```

## 🛠️ 第二步：服务器初始化

### 自动初始化 (推荐)
```bash
# 运行初始化脚本
./scripts/deploy.sh init
```

### 手动初始化
```bash
# 连接服务器
ssh -i kimochi-prod.pem root@47.104.8.84

# 运行服务器初始化脚本
/tmp/server-init.sh
```

### 初始化内容
- ✅ 配置阿里云镜像源
- ✅ 安装Node.js 20.x
- ✅ 安装PM2进程管理器
- ✅ 安装Nginx反向代理
- ✅ 配置防火墙 (保护SSH)
- ✅ 系统性能优化 (2核2G)
- ✅ 创建项目目录结构

## 🚀 第三步：应用部署

### 快速部署 (一键)
```bash
# 从本地直接部署
./scripts/local-update.sh -m "首次部署" -d
```

### 分步部署
```bash
# 1. 本地准备
./scripts/local-update.sh -m "生产部署"

# 2. 上传到服务器
./scripts/local-update.sh -u

# 3. 服务器端构建部署
ssh -i kimochi-prod.pem root@47.104.8.84
cd /opt/kimochi
kimochi-rebuild
```

## 🔒 第四步：HTTPS配置

### 自签名证书 (快速方案)
```bash
# 在服务器上执行
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/kimochi.key \
  -out /etc/nginx/ssl/kimochi.crt \
  -subj '/C=CN/ST=Beijing/L=Beijing/O=Kimochi/OU=IT/CN=47.104.8.84'

# 重启nginx
systemctl reload nginx
```

### Let's Encrypt证书 (生产推荐)
```bash
# 安装certbot
apt-get update && apt-get install -y certbot python3-certbot-nginx

# 申请证书 (需要域名)
certbot --nginx -d your-domain.com

# 自动续期
crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 第五步：环境配置

### 1. 第三方API配置
在服务器上编辑环境配置：
```bash
cd /opt/kimochi
nano .env.prod.local
```

必需配置项：
```env
# 基础配置
NODE_ENV="production"
DATABASE_URL="file:./prisma/production.db"
JWT_SECRET="your-jwt-secret-64-chars"
DOMAIN="47.104.8.84"

# SMTP邮件服务 (QQ邮箱示例)
SMTP_HOST="smtp.qq.com"
SMTP_PORT="465"
SMTP_USER="your-email@qq.com"
SMTP_PASS="your-smtp-password"

# AI服务 (DeepSeek)
DEEPSEEK_API_KEY="your-deepseek-api-key"

# 天气服务 (和风天气)
HEWEATHER_API_KEY="your-heweather-key"
QWEATHER_GATEWAY_BASE="your-gateway-base"

# 地图服务 (高德地图)
AMAP_API_KEY="your-amap-key"
AMAP_SECRET_KEY="your-amap-secret"  # 如果启用数字签名

# 微信小程序
WEAPP_APP_ID="your-weapp-id"
WEAPP_APP_SECRET="your-weapp-secret"
```

### 2. 重启应用加载配置
```bash
pm2 restart kimochi
```

## 📊 第六步：功能验证

### 1. 系统健康检查
```bash
# 连接服务器
ssh -i kimochi-prod.pem root@47.104.8.84

# 快速状态检查
kimochi-status

# 详细应用状态
pm2 status
pm2 logs kimochi
```

### 2. API服务测试
```bash
# 运行API测试脚本
kimochi-test-apis

# 或手动测试
node /opt/kimochi/scripts/test-apis.js
```

### 3. 功能测试
- ✅ 访问 https://47.104.8.84
- ✅ 用户注册/登录
- ✅ 地理位置权限 (包括Safari)
- ✅ 天气信息显示
- ✅ 心理测评功能
- ✅ 邮件发送功能

## 🔄 第七步：日常运维

### 更新部署
```bash
# 本地修改后快速更新
./scripts/local-update.sh -m "修复bug" -d

# 查看部署历史
ssh -i kimochi-prod.pem root@47.104.8.84
ls -la /opt/kimochi-backup-*
```

### 监控命令
```bash
# 系统状态
kimochi-status

# 应用日志
pm2 logs kimochi

# 系统资源
htop

# 磁盘空间
df -h

# 内存使用
free -h
```

### 故障恢复
```bash
# 重启应用
pm2 restart kimochi

# 重启Nginx
systemctl restart nginx

# 回滚到上一版本
cd /opt/kimochi-backup-YYYYMMDD_HHMMSS
kimochi-rebuild
```

## ⚠️ 重要提醒

### Safari地理位置兼容性
- **必须使用HTTPS访问**
- Safari对HTTP环境会拒绝地理位置请求
- 已针对Safari优化配置选项

### 性能优化 (2核2G)
- ✅ 已配置Swap分区 (1GB)
- ✅ PM2单实例运行 (避免内存溢出)
- ✅ Nginx静态文件缓存
- ✅ 数据库连接池优化

### 安全配置
- ✅ 防火墙已配置 (仅开放必要端口)
- ✅ SSH密钥认证
- ✅ SSL/TLS加密
- ✅ 安全头配置

### 网络优化 (中国环境)
- ✅ 阿里云镜像源
- ✅ npmmirror镜像源
- ✅ 第三方API已验证

## 🆘 故障排除

常见问题请参考：[故障排除文档](./TROUBLESHOOTING.md)

### 快速问题诊断
```bash
# 应用状态
curl https://47.104.8.84/api/health

# 端口监听
netstat -tlnp | grep :3000
netstat -tlnp | grep :443

# 进程状态
pm2 status
systemctl status nginx

# 错误日志
pm2 logs kimochi --lines 50
tail -f /var/log/nginx/error.log
```

---

## 🎉 部署完成

恭喜！您已成功部署kimochi心晴到生产环境。

**访问地址**: https://47.104.8.84  
**管理员账号**: admin@kimochi.space  
**默认密码**: kimochi@2025  

**下一步**: 
1. 登录系统并修改管理员密码
2. 配置域名DNS解析 (可选)
3. 设置Let's Encrypt证书 (推荐)
4. 配置定期备份
5. 监控系统运行状态
