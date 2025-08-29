# 📱 小程序开发环境 - 快速开始

## 🚀 **一键配置 (推荐)**

### **自动配置脚本**
```bash
# 进入项目目录
cd /Users/douhao/Desktop/kimochi-dev/kimochi

# 运行自动配置脚本
./scripts/setup-miniprogram-dev.sh
```
脚本将自动完成所有配置，包括依赖检查、环境配置、项目验证等。

---

## ⚡ **快速启动**

### **1. 启动开发环境**
```bash
# 启动后端开发服务器
./scripts/miniprogram-dev.sh start
```
服务器将运行在: `http://localhost:3001`

### **2. 配置微信开发者工具**
1. 打开微信开发者工具
2. 导入项目: `/Users/douhao/Desktop/kimochi-dev/kimochi/mini-program/`
3. 在「详情」→「本地设置」中：
   - ✅ **不校验合法域名**
   - ✅ **不校验TLS版本**
   - ✅ **不校验HTTPS证书**

### **3. 切换到开发环境**
在小程序中：
1. 进入「个人中心」
2. 点击「开发者工具」
3. 选择「切换到开发环境」
4. 重启小程序

### **4. 测试连接**
在「开发者工具」中点击「测试API连接」验证配置

---

## 🛠️ **常用命令**

| 命令 | 功能 | 说明 |
|------|------|------|
| `./scripts/miniprogram-dev.sh start` | 启动开发环境 | 启动后端服务器 |
| `./scripts/miniprogram-dev.sh check` | 检查环境状态 | 验证配置和依赖 |
| `./scripts/miniprogram-dev.sh ngrok` | 启动内网穿透 | 提供HTTPS访问 |
| `./scripts/miniprogram-dev.sh open` | 打开开发者工具 | 自动打开微信工具 |

---

## 🔄 **环境切换**

### **在小程序中切换** (推荐)
1. 个人中心 → 开发者工具 → 环境切换
2. 选择目标环境
3. 重启小程序生效

### **编程方式切换**
```javascript
// 在小程序控制台执行
const { EnvManager } = require('./utils/api');

// 切换到开发环境
EnvManager.switchToDevelopment();

// 切换到生产环境  
EnvManager.switchToProduction();

// 查看当前环境
console.log(EnvManager.getCurrentEnv());
```

---

## 🌐 **HTTPS访问方案**

### **方案1: 内网穿透 (ngrok)**
```bash
# 安装ngrok
brew install ngrok

# 启动穿透
./scripts/miniprogram-dev.sh ngrok
```
获得的HTTPS链接可直接在小程序中使用。

### **方案2: 本地开发** (默认)
使用 `http://localhost:3001`，需要在微信开发者工具中关闭域名校验。

---

## 🔍 **故障排除**

### **常见问题**

#### **1. 无法连接到localhost**
```bash
# 检查开发服务器状态
./scripts/miniprogram-dev.sh check

# 确认服务器运行
curl http://localhost:3001/api/health
```

#### **2. 端口被占用**
```bash
# 查看端口占用
lsof -i :3001

# 终止进程
pkill -f "next.*dev"
```

#### **3. 环境切换无效**
1. 完全关闭小程序
2. 重新进入小程序
3. 或清除缓存：开发者工具 → 清除缓存

#### **4. API请求失败**
1. 确认微信开发者工具已关闭域名校验
2. 检查API地址配置
3. 查看网络请求日志

---

## 📊 **开发环境对比**

| 环境 | API地址 | 用途 | 优势 |
|------|---------|------|------|
| **开发环境** | `http://localhost:3001` | 本地开发测试 | 快速调试、实时热更新 |
| **生产环境** | `https://47.104.8.84` | 完整功能测试 | 真实数据、完整体验 |

---

## 💡 **开发技巧**

### **调试技巧**
```javascript
// 查看当前环境
console.log('当前环境:', EnvManager.getCurrentEnv());

// 查看API请求
console.log('API请求:', url, data);

// 查看用户信息
console.log('用户信息:', getApp().getUserInfo());
```

### **性能优化**
1. 使用图片懒加载
2. 合并API请求
3. 启用本地缓存
4. 使用Mock数据减少网络请求

### **代码规范**
1. 使用ES6+语法
2. 遵循小程序命名规范
3. 添加错误处理
4. 编写注释说明

---

## 📚 **相关文档**

- **详细开发指南**: [MINIPROGRAM-DEV-GUIDE.md](./MINIPROGRAM-DEV-GUIDE.md)
- **环境配置说明**: [CONFIG-RELOAD-GUIDE.md](./CONFIG-RELOAD-GUIDE.md)
- **项目部署文档**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **API接口文档**: [docs/API.md](./docs/API.md)

---

## ⚠️ **重要提醒**

### **开发注意事项**
1. **域名校验**: 开发时必须关闭域名校验
2. **环境隔离**: 开发和生产数据完全隔离
3. **数据同步**: 小程序与网站数据实时同步
4. **权限控制**: 某些功能需要登录才能使用

### **发布前检查**
1. 切换到生产环境测试
2. 验证所有功能正常
3. 检查图片和资源加载
4. 测试不同设备兼容性

---

## 🎯 **开发流程**

### **典型开发流程**
```bash
# 1. 启动开发环境
./scripts/miniprogram-dev.sh start

# 2. 打开开发者工具
./scripts/miniprogram-dev.sh open

# 3. 在小程序中切换到开发环境

# 4. 开始开发...

# 5. 测试功能
# 在开发者工具中测试基本功能

# 6. 生产测试  
# 切换到生产环境进行完整测试

# 7. 代码提交
git add -A
git commit -m "功能开发完成"
git push origin main
```

---

**🎉 现在您已经可以愉快地开发小程序了！**

有任何问题，请参考详细文档或使用开发者工具中的调试功能。

**Happy Coding! 🚀**
