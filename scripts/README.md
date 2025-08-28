# kimochi心晴项目 - 脚本工具说明

## 🚀 核心部署脚本

### `deploy.sh`
智能部署脚本，支持本地和GitHub部署
```bash
# 服务器初始化
./deploy.sh init

# 本地部署
./deploy.sh local --backup

# GitHub部署
./deploy.sh github --branch prod

# 检查状态
./deploy.sh status
```

### `server-init.sh`
服务器环境初始化脚本，针对2核2G青岛服务器优化
- 配置中国镜像源
- 安装Node.js、PM2、Nginx
- 系统优化和安全配置

### `local-update.sh`
本地开发更新脚本
```bash
# 快速更新部署
./local-update.sh -m "更新说明" -d

# 仅打包
./local-update.sh -m "更新说明"

# 打包并上传
./local-update.sh -u
```

## 🔧 管理工具脚本

### `setup-environment.sh`
环境配置管理脚本
```bash
# 生成生产环境配置
./setup-environment.sh production

# 生成开发环境配置
./setup-environment.sh development
```

### `create-super-admin.js`
超级管理员账号创建脚本
```bash
node scripts/create-super-admin.js
```

### `generate-jwt-secret.js`
JWT密钥生成工具
```bash
node scripts/generate-jwt-secret.js
```

## 📊 测试和监控脚本

### `test-apis.js`
第三方API服务测试脚本
```bash
node scripts/test-apis.js
```

## 🗄️ 数据初始化脚本

### `init-violation-reasons.js`
初始化系统违规原因数据
```bash
node scripts/init-violation-reasons.js
```

### `create-system-announcement.js`
创建系统公告
```bash
node scripts/create-system-announcement.js
```

## 💡 使用建议

1. **首次部署**：运行 `./deploy.sh init` 初始化服务器环境
2. **日常更新**：使用 `./local-update.sh -m "更新说明" -d` 快速部署
3. **API检测**：定期运行 `test-apis.js` 检查第三方服务状态
4. **环境配置**：使用 `setup-environment.sh` 生成标准化配置文件

## 🔒 安全注意事项

- 所有脚本都包含错误处理和回滚机制
- 敏感信息通过环境变量管理
- 生产部署前会自动创建备份
- 支持一键回滚到前一个版本
