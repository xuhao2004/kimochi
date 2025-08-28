# ⚙️ kimochi心晴 - 配置指南

**版本**: v2.0.0  
**最后更新**: 2025-08-28  
**适用环境**: 开发/测试/生产

## 📋 配置概览

kimochi心晴使用环境变量进行配置管理，支持多环境部署。所有敏感信息通过环境变量管理，确保安全性。

### 配置文件结构
```
config/
├── environments/
│   ├── env.development    # 开发环境模板
│   └── env.production     # 生产环境模板
├── .env.example          # 配置示例
├── .env.local            # 本地开发配置
└── .env.prod.local       # 生产环境配置
```

## 🔧 基础配置

### 核心系统配置
```env
# 环境标识
NODE_ENV="production"              # development | production
PORT="3000"                       # 应用端口

# 数据库配置
DATABASE_URL="file:./prisma/production.db"

# JWT密钥 (必须64字符)
JWT_SECRET="your-jwt-secret-key-64-characters-long"

# 应用信息
NEXT_PUBLIC_APP_NAME="kimochi心晴"
DOMAIN="47.104.8.84"              # 主域名
DOMAINS="47.104.8.84,kimochi.space" # 支持的域名列表
```

### 安全配置
```env
# 超级管理员账号 (系统初始化)
SUPER_ADMIN_EMAIL="admin@kimochi.space"
SUPER_ADMIN_PASSWORD="kimochi@2025"
SUPER_ADMIN_NAME="超级管理员"

# 功能开关 (开发/调试用)
NEXT_PUBLIC_DISABLE_VERIFICATION_CODE="1"  # 禁用验证码
DISABLE_VERIFICATION_CODE="1"
DISABLE_WECHAT_WEB_OAUTH="1"               # 禁用微信网页授权
NEXT_PUBLIC_ENABLE_OLD_EMAIL_UNAVAILABLE="1"
```

## 📧 邮件服务配置

### SMTP配置 (QQ邮箱示例)
```env
# SMTP服务器配置
SMTP_HOST="smtp.qq.com"
SMTP_PORT="465"
SMTP_USER="your-email@qq.com"
SMTP_PASS="your-smtp-password"      # QQ邮箱授权码，非登录密码
SMTP_FROM="kimochi心晴 <your-email@qq.com>"

# SMTP安全配置
SMTP_REQUIRE_TLS="true"
SMTP_TLS_MIN_VERSION="TLS1.2"
SMTP_DEBUG="false"                  # 开发时可设为true
SMTP_FATAL_ON_ERROR="false"
```

### 获取QQ邮箱SMTP授权码
1. 登录QQ邮箱
2. 设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务
3. 开启"POP3/SMTP服务"
4. 生成授权码，使用此授权码作为SMTP_PASS

### 其他邮件服务商配置
```env
# 163邮箱
SMTP_HOST="smtp.163.com"
SMTP_PORT="465"

# Gmail
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"

# 阿里云邮件推送
SMTP_HOST="smtpdm.aliyun.com"
SMTP_PORT="465"
```

## 🤖 AI服务配置

### DeepSeek API配置
```env
# DeepSeek API密钥
DEEPSEEK_API_KEY="sk-your-deepseek-api-key"

# API基础URL (通常不需要修改)
DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

### 获取DeepSeek API密钥
1. 注册 [DeepSeek开放平台](https://platform.deepseek.com/)
2. 创建API密钥
3. 配置使用额度和权限

## 🌤️ 天气服务配置

### 和风天气API配置
```env
# 和风天气API密钥
HEWEATHER_API_KEY="your-heweather-api-key"

# 和风天气网关配置
QWEATHER_GATEWAY_BASE="your-gateway-base.re.qweatherapi.com"
QWEATHER_GEO_BASE="your-gateway-base.re.qweatherapi.com"
QWEATHER_WEATHER_BASE="your-gateway-base.re.qweatherapi.com"
```

### 获取和风天气API
1. 注册 [和风天气开发平台](https://dev.qweather.com/)
2. 创建应用获取API Key
3. 如果使用私有网关，配置相应的网关地址

### 配置说明
- **免费版**: 使用官方API地址，每日1000次调用
- **付费版**: 可配置私有网关，提高访问速度和稳定性
- **企业版**: 支持更高的并发和调用量

## 🗺️ 地图服务配置

### 高德地图API配置
```env
# 高德地图API密钥
AMAP_API_KEY="your-amap-api-key"

# 如果开启数字签名，需要配置私钥
AMAP_SECRET_KEY="your-amap-secret-key"
```

### 高德地图配置步骤
1. 注册 [高德开放平台](https://console.amap.com/)
2. 创建应用，选择"Web服务API"
3. 获取API Key和私钥(如果开启数字签名)

### 数字签名配置
- **建议**: 关闭数字签名（简化配置）
- **如果必须开启**: 确保AMAP_SECRET_KEY配置正确
- **错误排查**: 参考故障排除文档的高德API部分

## 📱 微信小程序配置

### 微信小程序API配置
```env
# 微信小程序AppID和密钥
WEAPP_APP_ID="wx-your-weapp-appid"
WEAPP_APP_SECRET="your-weapp-secret"

# 微信网页OAuth配置 (暂时停用)
WECHAT_APP_ID="wx-your-web-appid"
WECHAT_APP_SECRET="your-web-secret"
WECHAT_REDIRECT_URI="https://your-domain.com/wechat-callback"
WECHAT_SCOPE="snsapi_userinfo"
```

### 微信小程序配置步骤
1. 注册微信小程序账号
2. 获取AppID和AppSecret
3. 配置服务器域名白名单
4. 上传小程序代码并审核发布

## 🚀 环境配置管理

### 1. 使用配置模板生成
```bash
# 生成生产环境配置
./scripts/setup-environment.sh production

# 生成开发环境配置  
./scripts/setup-environment.sh development
```

### 2. 手动配置步骤
```bash
# 复制配置模板
cp config/environments/env.production .env.prod.local

# 编辑配置文件
nano .env.prod.local

# 生成JWT密钥
node scripts/generate-jwt-secret.js

# 验证配置
node scripts/test-apis.js
```

### 3. 配置验证
```bash
# 检查所有必需配置项
grep -E "JWT_SECRET|DATABASE_URL|SMTP_" .env.prod.local

# 测试第三方API服务
node scripts/test-apis.js

# 健康检查
curl https://47.104.8.84/api/health
```

## 🔐 安全最佳实践

### 1. 密钥管理
- **JWT_SECRET**: 必须64字符，生产环境使用随机生成
- **API密钥**: 定期轮换，避免硬编码
- **数据库**: 使用强密码，限制访问权限
- **SMTP密码**: 使用专用授权码，非登录密码

### 2. 环境隔离
```bash
# 开发环境
.env.local              # 本地开发配置
config/env.development  # 开发环境模板

# 生产环境  
.env.prod.local         # 生产环境配置
config/env.production   # 生产环境模板
```

### 3. 敏感信息保护
```bash
# 确保敏感文件不被提交
echo ".env.local" >> .gitignore
echo ".env.prod.local" >> .gitignore

# 设置文件权限
chmod 600 .env.prod.local
```

## 🌍 多环境部署

### 开发环境配置
```env
NODE_ENV="development"
DATABASE_URL="file:./prisma/dev.db"
NEXT_PUBLIC_DISABLE_VERIFICATION_CODE="1"
# 使用测试API密钥
```

### 测试环境配置
```env
NODE_ENV="production"
DATABASE_URL="file:./prisma/test.db"  
DOMAIN="test.kimochi.space"
# 使用测试API密钥
```

### 生产环境配置
```env
NODE_ENV="production"
DATABASE_URL="file:./prisma/production.db"
DOMAIN="47.104.8.84"
# 使用正式API密钥
```

## 🎯 配置优化建议

### 性能优化配置
```env
# PM2进程配置
PM2_INSTANCES="1"           # 2核2G服务器建议单实例
PM2_MAX_MEMORY="400M"       # 内存限制
PM2_AUTO_RESTART="true"     # 自动重启
```

### 缓存配置
```env
# Redis缓存 (可选)
REDIS_URL="redis://localhost:6379"

# 文件缓存
CACHE_DIR="./cache"
CACHE_TTL="3600"            # 缓存时间(秒)
```

### 日志配置
```env
# 日志级别
LOG_LEVEL="info"            # debug | info | warn | error
LOG_FILE="./logs/app.log"
LOG_MAX_SIZE="10M"
LOG_MAX_FILES="5"
```

## 🔧 故障排除

### 常见配置问题
1. **环境变量未生效**: 重启PM2进程
2. **API密钥错误**: 检查配置格式和有效期
3. **数据库连接失败**: 检查DATABASE_URL路径
4. **HTTPS证书问题**: 重新生成SSL证书

### 配置验证命令
```bash
# 检查环境变量加载
pm2 env 0

# 测试数据库连接
npx prisma db push

# 验证API配置
node scripts/test-apis.js

# 健康检查
curl https://47.104.8.84/api/health
```

## 📋 配置检查清单

部署前请确保以下配置正确：

- [ ] JWT_SECRET已配置且为64字符
- [ ] DATABASE_URL路径正确
- [ ] SMTP邮件服务配置并测试通过
- [ ] 至少一个第三方API服务配置正确
- [ ] DOMAIN和DOMAINS配置正确
- [ ] 超级管理员账号信息正确
- [ ] 安全开关配置符合环境要求
- [ ] SSL证书配置正确
- [ ] 文件权限设置正确

---

## 📞 获取帮助

- **配置问题**: 查看 [故障排除文档](./TROUBLESHOOTING.md)
- **API测试**: 运行 `node scripts/test-apis.js`
- **技术支持**: admin@kimochi.space

**记住**: 所有配置更改后都需要重启应用才能生效！ 🚀
