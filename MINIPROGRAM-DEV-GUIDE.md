# 📱 小程序开发环境配置指南

## 🎯 **开发环境问题**

### **问题描述**
- 本地开发服务器运行在 `http://localhost:3001`
- 微信小程序只能访问 HTTPS 或 localhost/127.0.0.1
- 本地机器在局域网内，没有公网IP
- 小程序需要调用后端API进行数据交互

### **解决方案概览**
```
方案1: 环境切换 (推荐) ✅
方案2: 内网穿透工具 ⭐
方案3: 本地HTTPS配置 🔧
方案4: Mock数据开发 🧪
```

---

## 🔧 **方案1: 智能环境切换 (推荐)**

### **✅ 已实现功能**

#### **1. 自动环境检测**
```javascript
// 在 utils/api.js 中
const ENVIRONMENT = {
  development: {
    baseURL: 'http://localhost:3001', // 本地开发服务器
    name: '开发环境'
  },
  production: {
    baseURL: 'https://47.104.8.84', // 生产服务器
    name: '生产环境'  
  }
};
```

#### **2. 环境管理工具**
- `EnvManager.switchToDevelopment()` - 切换到开发环境
- `EnvManager.switchToProduction()` - 切换到生产环境
- `EnvManager.showEnvInfo()` - 显示当前环境信息
- `EnvManager.getCurrentEnv()` - 获取环境配置

#### **3. 小程序内切换**
在个人中心 → 开发者工具 → 环境切换

### **🚀 使用步骤**

#### **步骤1: 启动本地开发服务器**
```bash
cd /Users/douhao/Desktop/kimochi-dev/kimochi
npm run dev
```
确保服务器运行在 `http://localhost:3001`

#### **步骤2: 配置微信开发者工具**
1. 打开微信开发者工具
2. 导入小程序项目: `kimochi/mini-program/`
3. 在项目设置中：
   - ✅ 开启"不校验合法域名"
   - ✅ 开启"不校验web-view域名"  
   - ✅ 开启"不校验TLS版本"

#### **步骤3: 切换到开发环境**
1. 在小程序中进入"个人中心"
2. 点击"开发者工具"
3. 选择"切换到开发环境"
4. 重启小程序让配置生效

#### **步骤4: 测试连接**
在开发者工具中选择"测试API连接"验证配置

### **📊 开发环境状态指示**
- 🟢 开发环境：控制台显示 `🔧 小程序运行在开发环境: http://localhost:3001`
- 🔵 生产环境：控制台显示生产环境信息

---

## ⭐ **方案2: 内网穿透工具**

### **选择内网穿透工具**

#### **选项1: ngrok (推荐)**
```bash
# 安装 ngrok
brew install ngrok

# 获取HTTPS隧道
ngrok http 3001

# 会得到类似地址: https://abc123.ngrok.io
```

#### **选项2: 花生壳**
- 下载花生壳客户端
- 创建隧道映射 localhost:3001

#### **选项3: natapp** 
```bash
# 下载natapp客户端
./natapp -authtoken=你的token -subdomain=kimochi 3001
```

### **使用内网穿透**

#### **1. 启动隧道**
```bash
# 启动本地服务器
npm run dev

# 启动ngrok隧道
ngrok http 3001
```

#### **2. 更新API配置**
```javascript
// 临时修改 mini-program/utils/api.js
const ENVIRONMENT = {
  development: {
    baseURL: 'https://abc123.ngrok.io', // 使用ngrok地址
    name: '开发环境(ngrok)'
  }
  // ...
};
```

#### **3. 测试连接**
访问 `https://abc123.ngrok.io/api/health` 确认可访问

### **⚠️ 注意事项**
- ngrok免费版链接每次重启会变化
- 需要每次更新API配置中的地址
- 建议使用方案1的环境切换功能

---

## 🔧 **方案3: 本地HTTPS配置**

### **为开发服务器配置SSL**

#### **1. 生成本地证书**
```bash
# 创建SSL目录
mkdir ssl && cd ssl

# 生成私钥
openssl genrsa -out localhost.key 2048

# 生成证书签名请求
openssl req -new -key localhost.key -out localhost.csr

# 生成自签名证书
openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt
```

#### **2. 修改Next.js配置**
```javascript
// next.config.ts
const nextConfig = {
  // 开发环境HTTPS配置
  ...(process.env.NODE_ENV === 'development' && {
    server: {
      https: {
        key: fs.readFileSync('./ssl/localhost.key'),
        cert: fs.readFileSync('./ssl/localhost.crt')
      }
    }
  })
};
```

#### **3. 更新启动脚本**
```json
// package.json
{
  "scripts": {
    "dev:https": "next dev -p 3001 --experimental-https"
  }
}
```

### **使用HTTPS开发**
```bash
# 启动HTTPS开发服务器
npm run dev:https

# 服务器将运行在: https://localhost:3001
```

---

## 🧪 **方案4: Mock数据开发**

### **创建Mock API服务**

#### **1. 创建Mock数据**
```javascript
// mini-program/mock/api.js
const MockData = {
  userInfo: {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    avatar: '/assets/default/avatar.png'
  },
  
  assessments: [
    { id: 1, title: 'MBTI测试', type: 'personality' },
    { id: 2, title: '情绪测评', type: 'emotion' }
  ]
  // ...
};
```

#### **2. 修改API类**
```javascript
// 在 utils/api.js 中添加Mock模式
const API_MODE = 'mock'; // 'real' | 'mock'

if (API_MODE === 'mock') {
  // 返回Mock数据而不是真实API调用
}
```

### **优点**
- 无需网络连接
- 数据可控，方便测试边界情况
- 开发速度快

### **缺点**
- 无法测试真实的网络交互
- 需要手动维护Mock数据

---

## 📋 **开发流程推荐**

### **日常开发流程**

#### **1. 启动开发环境**
```bash
# 终端1: 启动后端服务器
cd kimochi
npm run dev

# 终端2: 如果需要内网穿透
ngrok http 3001
```

#### **2. 配置小程序**
1. 打开微信开发者工具
2. 导入 `kimochi/mini-program/` 项目
3. 个人中心 → 开发者工具 → 切换到开发环境

#### **3. 开发测试**
- 在开发者工具中实时预览
- 使用真机预览测试移动端体验
- 使用开发者工具调试网络请求

#### **4. 发布前测试**
1. 切换到生产环境
2. 测试完整功能
3. 上传代码到微信后台

### **调试技巧**

#### **网络调试**
```javascript
// 在小程序中查看网络请求
console.log('API请求:', url, data);
console.log('API响应:', response);

// 查看当前环境
const env = EnvManager.getCurrentEnv();
console.log('当前环境:', env);
```

#### **开发者工具调试**
- 个人中心 → 开发者工具 → 查看网络日志
- 个人中心 → 开发者工具 → 测试API连接
- 个人中心 → 开发者工具 → 环境信息

---

## 🔍 **故障排除**

### **常见问题**

#### **1. 无法连接到本地服务器**
```
❌ 错误: request:fail 
💡 解决: 
- 确认服务器正在运行: http://localhost:3001
- 检查微信开发者工具域名校验设置
- 使用开发者工具测试API连接功能
```

#### **2. 接口返回404**
```
❌ 错误: 404 Not Found
💡 解决:
- 检查API路径是否正确
- 确认后端路由已正确配置
- 查看开发服务器控制台日志
```

#### **3. 跨域问题**
```
❌ 错误: CORS policy
💡 解决:
- Next.js默认支持同域请求
- 检查next.config.ts中的域名配置
```

#### **4. 切换环境后无效**
```
❌ 问题: 环境切换后仍使用旧配置
💡 解决:
- 完全关闭小程序重新进入
- 清除缓存: 开发者工具 → 清除缓存
```

### **调试命令**
```javascript
// 在小程序控制台执行
const app = getApp();

// 查看当前环境
console.log(EnvManager.getCurrentEnv());

// 手动切换环境
EnvManager.switchToDevelopment();

// 清除所有缓存
wx.clearStorageSync();
```

---

## ⚡ **性能优化建议**

### **开发环境优化**
1. **使用本地Mock数据**减少网络请求
2. **启用热重载**快速看到代码变更
3. **使用开发者工具性能面板**监控性能

### **网络优化**
1. **合并API请求**减少请求数量
2. **使用缓存策略**避免重复请求
3. **启用压缩**减少数据传输量

---

## 📚 **相关文档**

- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [Next.js开发环境配置](https://nextjs.org/docs/advanced-features/custom-server)
- [ngrok使用指南](https://ngrok.com/docs)
- [本项目API文档](./docs/API.md)

---

## 💡 **小贴士**

### **开发效率提升**
- 使用代码片段快速创建页面模板
- 配置ESLint和Prettier保持代码风格
- 使用Git钩子确保代码质量

### **测试建议**
- 优先在开发环境测试基本功能
- 定期在生产环境验证完整流程
- 使用真机预览测试移动端体验
- 关注不同微信版本的兼容性

---

**🎉 现在您可以在开发环境中愉快地开发和测试小程序了！**

如有问题，请：
1. 查看控制台错误日志
2. 使用开发者工具中的调试功能
3. 参考本文档的故障排除部分
