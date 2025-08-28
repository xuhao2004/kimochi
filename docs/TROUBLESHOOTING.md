# 🆘 kimochi心晴 - 故障排除指南

**版本**: v2.0.0  
**最后更新**: 2025-08-28  
**基于**: 实际生产环境问题解决经验

## 🎯 快速诊断

### 系统健康检查
```bash
# 连接服务器
ssh -i kimochi-prod.pem root@47.104.8.84

# 快速状态检查
kimochi-status

# 详细检查
pm2 status
systemctl status nginx
curl -k https://localhost/api/health
```

### 常见错误代码
| 错误码 | 含义 | 快速解决方案 |
|--------|------|--------------|
| 500 | 服务器内部错误 | 检查PM2日志 |
| 502 | 网关错误 | 重启应用/Nginx |
| 503 | 服务不可用 | 检查应用是否运行 |
| SSL证书错误 | HTTPS证书问题 | 重新生成证书 |

## 🌍 Safari地理位置权限问题

### 问题现象
- ❌ Safari不请求地理位置权限
- ❌ iPhone/Mac上定位功能不工作
- ✅ Android和第三方浏览器正常

### 根本原因
Safari要求HTTPS环境才能使用地理位置API

### 解决方案 ✅
1. **确保HTTPS访问**
   ```bash
   # 检查HTTPS是否正常
   curl -I https://47.104.8.84
   
   # 检查证书状态
   openssl s_client -connect 47.104.8.84:443 -servername 47.104.8.84
   ```

2. **重新生成SSL证书**
   ```bash
   # 生成自签名证书
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout /etc/nginx/ssl/kimochi.key \
     -out /etc/nginx/ssl/kimochi.crt \
     -subj '/C=CN/ST=Beijing/L=Beijing/O=Kimochi/CN=47.104.8.84'
   
   # 重启nginx
   systemctl reload nginx
   ```

3. **验证修复**
   - 访问 https://47.104.8.84
   - 在Safari中测试地理位置功能
   - 应该会正常弹出权限询问

## 🔌 第三方API服务问题

### API测试工具
```bash
# 运行完整API测试
node scripts/test-apis.js

# 或使用服务器便捷命令
kimochi-test-apis
```

### 1. SMTP邮件服务问题

#### 问题现象
- ❌ 密码重置邮件发送失败
- ❌ 验证码邮件不发送

#### 常见原因
1. **环境变量配置错误**
2. **SMTP密码过期**
3. **QQ邮箱安全设置**

#### 解决方案
```bash
# 检查SMTP配置
grep SMTP /opt/kimochi/.env.prod.local

# 测试邮件发送
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: 'your-email@qq.com',
    pass: 'your-smtp-password'
  }
});
transporter.verify().then(console.log).catch(console.error);
"
```

### 2. 天气API问题

#### 问题现象
- ❌ 天气信息不显示
- ❌ API返回"未配置和风天气密钥"

#### 解决方案
```bash
# 检查天气API配置
grep HEWEATHER /opt/kimochi/.env.prod.local

# 测试天气API
curl "https://devapi.qweather.com/v7/weather/now?location=101010100&key=YOUR_KEY"
```

### 3. 高德地图API数字签名问题

#### 问题现象
- ❌ 错误：INVALID_USER_SIGNATURE
- ❌ 错误码：10007

#### 根本原因
高德开放平台开启了数字签名验证

#### 解决方案 ✅
1. **关闭数字签名** (推荐)
   - 登录高德开放平台
   - 找到应用设置
   - 关闭"数字签名"开关

2. **或配置数字签名**
   ```bash
   # 确保环境变量包含私钥
   grep AMAP_SECRET_KEY /opt/kimochi/.env.prod.local
   ```

### 4. AI服务问题

#### 问题现象
- ❌ AI分析功能不可用
- ❌ DeepSeek API调用失败

#### 解决方案
```bash
# 检查DeepSeek配置
grep DEEPSEEK /opt/kimochi/.env.prod.local

# 测试DeepSeek API
curl -X POST "https://api.deepseek.com/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"测试"}]}'
```

## 📊 应用性能问题

### 内存不足问题 (2核2G服务器)

#### 问题现象
- 🐌 应用响应缓慢
- 💥 PM2进程意外重启
- 📊 内存使用率>90%

#### 解决方案
```bash
# 检查内存使用
free -h
htop

# 检查Swap分区
swapon --show

# 重启应用释放内存
pm2 restart kimochi

# 如果需要，清理系统缓存
sync && echo 3 > /proc/sys/vm/drop_caches
```

### 数据库性能问题

#### 问题现象
- 🐌 API响应时间长
- 💾 数据库查询缓慢

#### 解决方案
```bash
# 检查数据库文件大小
ls -lh /opt/kimochi/prisma/production.db

# 如果数据库过大，可以清理日志表
cd /opt/kimochi
npx prisma db push
```

## 🔧 部署相关问题

### 1. 环境变量未加载

#### 问题现象
- ❌ API返回"未配置XXX密钥"
- ✅ 环境文件中配置正确

#### 根本原因
PM2没有正确加载环境变量

#### 解决方案 ✅
```bash
# 检查ecosystem.config.js配置
cat /opt/kimochi/ecosystem.config.js | grep -A5 env_production

# 重启应用确保加载环境变量
pm2 delete kimochi
pm2 start ecosystem.config.js --env production
```

### 2. Nginx配置问题

#### 问题现象
- ❌ 显示Nginx默认页面
- ❌ 502 Bad Gateway错误

#### 解决方案
```bash
# 检查nginx配置
nginx -t

# 查看nginx错误日志
tail -f /var/log/nginx/error.log

# 重启nginx
systemctl restart nginx
```

### 3. 权限问题

#### 问题现象
- ❌ 文件无法写入
- ❌ PM2无法启动

#### 解决方案
```bash
# 修复文件权限
chown -R root:root /opt/kimochi
chmod -R 755 /opt/kimochi

# 修复日志目录权限
mkdir -p /opt/kimochi/logs
chmod 755 /opt/kimochi/logs
```

## 🌐 网络连接问题

### GitHub访问受限

#### 问题现象
- ❌ 无法从GitHub拉取代码
- ❌ npm安装失败

#### 根本原因
中国网络环境限制

#### 解决方案 ✅ (已实现)
1. **使用镜像源**
   ```bash
   # npm镜像源
   npm config set registry https://registry.npmmirror.com/
   
   # 检查配置
   npm config list
   ```

2. **本地上传部署**
   ```bash
   # 使用本地更新脚本
   ./scripts/local-update.sh -d
   ```

## 📱 浏览器兼容性问题

### Safari特殊问题

#### 1. 地理位置API问题
**解决方案**: 参考上面的HTTPS配置

#### 2. 其他Safari特殊行为
```javascript
// 前端代码已包含Safari特殊处理
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
if (isSafari) {
  // Safari特殊处理逻辑
}
```

## 🔄 数据恢复

### 备份恢复
```bash
# 查看可用备份
ls -la /opt/kimochi-backup-*

# 恢复到指定备份
cd /opt/kimochi-backup-20250828_120000
cp -r . /opt/kimochi/
cd /opt/kimochi
pm2 restart kimochi
```

### 数据库恢复
```bash
# 如果数据库损坏
cd /opt/kimochi
cp prisma/production.db prisma/production.db.broken
# 从备份恢复或重新初始化
npx prisma db push
```

## 🚨 紧急恢复流程

### 完全系统故障
1. **连接服务器**
   ```bash
   ssh -i kimochi-prod.pem root@47.104.8.84
   ```

2. **检查系统状态**
   ```bash
   systemctl status nginx
   pm2 status
   df -h
   free -h
   ```

3. **重启所有服务**
   ```bash
   systemctl restart nginx
   pm2 restart all
   ```

4. **如果仍有问题，完全重新部署**
   ```bash
   # 从本地重新部署
   ./scripts/local-update.sh -d
   ```

## 📞 获取更多帮助

### 日志位置
```bash
# PM2应用日志
pm2 logs kimochi

# Nginx日志
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# 系统日志
journalctl -u nginx
```

### 联系支持
- **GitHub Issues**: https://github.com/xuhao2004/kimochi/issues
- **管理员邮箱**: admin@kimochi.space
- **在线系统**: https://47.104.8.84

---

## ✅ 问题解决检查清单

解决问题后，请执行以下检查：

- [ ] 应用正常启动 (`pm2 status`)
- [ ] 网站可正常访问 (https://47.104.8.84)
- [ ] API健康检查通过 (`curl https://47.104.8.84/api/health`)
- [ ] 第三方API服务正常 (`kimochi-test-apis`)
- [ ] Safari地理位置功能正常
- [ ] 邮件发送功能正常
- [ ] 系统资源使用合理 (`kimochi-status`)

**记住**: 所有解决方案都基于实际生产环境验证，确保可靠性！ 🚀
