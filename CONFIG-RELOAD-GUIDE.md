# 🔧 环境配置重载指南

## 📋 快速参考

修改环境配置文件后，需要重启应用才能让配置生效：

### 🖥️ 本地开发环境

**配置文件**: `.env.local`

**重载方法**:
```bash
# 如果开发服务器正在运行，先停止 (Ctrl+C)，然后：
npm run dev

# 或者使用脚本 (如果在支持bash的环境)：
./scripts/reload-config.sh local
```

**检查配置是否生效**:
- 查看终端输出中的环境变量加载信息
- 访问 http://localhost:3001 检查功能是否正常

---

### 🌐 服务器生产环境

**配置文件**: `/opt/kimochi/.env.prod.local`

**重载方法**:
```bash
# 方法1: 使用脚本 (推荐)
./scripts/reload-config.sh production

# 方法2: 手动执行
ssh -i kimochi-prod.pem root@47.104.8.84 "cd /opt/kimochi && pm2 restart kimochi"
```

**检查配置是否生效**:
```bash
# 检查PM2状态
ssh -i kimochi-prod.pem root@47.104.8.84 "pm2 status"

# 检查应用健康
curl -k https://47.104.8.84/api/health
```

---

## 📝 详细步骤

### 本地开发环境完整流程

1. **修改配置文件**:
   ```bash
   # 编辑本地环境配置
   vim .env.local  # 或使用其他编辑器
   ```

2. **保存并重启**:
   ```bash
   # 如果开发服务器在运行，按 Ctrl+C 停止
   # 然后重新启动
   npm run dev
   ```

3. **验证配置**:
   - 查看终端启动日志
   - 测试修改的功能是否正常

### 服务器生产环境完整流程

1. **修改配置文件**:
   ```bash
   # 连接服务器编辑配置
   ssh -i kimochi-prod.pem root@47.104.8.84 "nano /opt/kimochi/.env.prod.local"
   ```

2. **重载配置**:
   ```bash
   # 使用重载脚本
   ./scripts/reload-config.sh production
   ```

3. **验证配置**:
   ```bash
   # 检查应用状态
   ssh -i kimochi-prod.pem root@47.104.8.84 "pm2 status"
   
   # 测试API功能
   ssh -i kimochi-prod.pem root@47.104.8.84 "kimochi-test-apis"
   ```

---

## ⚡ 常用命令

### 本地开发
```bash
# 启动开发服务器
npm run dev

# 构建测试
npm run build

# 启动生产模式
npm start
```

### 服务器管理
```bash
# 查看PM2状态  
ssh -i kimochi-prod.pem root@47.104.8.84 "pm2 status"

# 重启应用
ssh -i kimochi-prod.pem root@47.104.8.84 "pm2 restart kimochi"

# 查看应用日志
ssh -i kimochi-prod.pem root@47.104.8.84 "pm2 logs kimochi --lines 20"

# 测试API服务
ssh -i kimochi-prod.pem root@47.104.8.84 "kimochi-test-apis"

# 系统状态
ssh -i kimochi-prod.pem root@47.104.8.84 "kimochi-status"
```

---

## 🚨 故障排除

### 配置不生效
1. **确认重启**: 确保应用已重启
2. **检查语法**: 确认配置文件语法正确
3. **检查权限**: 确保文件可读
4. **查看日志**: 检查启动日志中的错误信息

### 服务器连接问题
1. **检查SSH密钥**: 确认kimochi-prod.pem文件存在
2. **检查网络**: 确认能ping通47.104.8.84
3. **检查防火墙**: 确认22端口可访问

### API功能异常
1. **运行API测试**: `kimochi-test-apis`
2. **检查环境变量**: 确认API密钥配置正确
3. **查看错误日志**: `pm2 logs kimochi`

---

## 💡 小贴士

- **本地开发**: 每次修改.env.local后都需要重启开发服务器
- **生产环境**: 修改.env.prod.local后必须重启PM2进程
- **配置验证**: 使用API测试脚本验证第三方服务是否正常
- **备份配置**: 修改重要配置前建议备份原文件
- **批量修改**: 可以使用scripts/setup-environment.sh重新生成配置文件
