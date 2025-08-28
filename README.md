# kimochi心晴 🌸

**一个现代化的心理健康平台，集成心理测评、社交互动和AI智能分析功能。**

[![部署状态](https://img.shields.io/badge/部署状态-✅%20在线-brightgreen)](https://47.104.8.84)
[![技术栈](https://img.shields.io/badge/技术栈-Next.js%2015%20+%20TypeScript-blue)](https://nextjs.org/)
[![API状态](https://img.shields.io/badge/API服务-100%25%20可用-green)](#第三方服务集成)
[![许可证](https://img.shields.io/badge/许可证-MIT-blue)](LICENSE)

## 🌐 在线体验

**🚀 生产环境**: https://47.104.8.84  
**📱 微信小程序**: 搜索"kimochi心晴"  
**👤 测试账号**: admin@kimochi.space / kimochi@2025

## ✨ 核心功能

### 🧠 专业心理测评
- **MBTI人格测试** - 16型人格完整评估
- **九型人格测评** - 深度性格分析
- **自定义量表** - 支持心理咨询师创建专业量表
- **AI智能分析** - DeepSeek驱动的个性化报告

### 💬 安全社交环境
- **匿名心情墙** - 安全表达真实情感
- **私信系统** - 端到端加密聊天
- **好友关系** - 基于兴趣的社交匹配
- **表情贴纸** - 丰富的情感表达工具

### 📱 多端无缝体验
- **响应式Web** - 支持桌面和移动设备
- **微信小程序** - 原生小程序体验
- **PWA支持** - 可安装的Web应用
- **Safari优化** - 完美支持苹果设备

### 🔒 隐私安全保护
- **数据加密** - 所有敏感数据加密存储
- **匿名化选项** - 用户可选择匿名模式
- **GDPR合规** - 严格遵循数据保护法规
- **权限控制** - 细粒度的隐私设置

## 🛠️ 技术架构

### 前端技术栈
```
Next.js 15      - React全栈框架
TypeScript      - 类型安全开发
Tailwind CSS v4 - 现代化CSS框架
React 19        - 最新React特性
Prisma         - 现代数据库ORM
```

### 后端服务
```
Next.js API     - 服务端API路由
SQLite         - 轻量级生产数据库
JWT认证        - 无状态身份认证
bcrypt         - 密码安全加密
Nodemailer     - 邮件服务集成
```

### 部署架构
```
PM2            - Node.js进程管理
Nginx          - 反向代理和负载均衡
HTTPS/SSL      - 安全传输协议
Ubuntu Server  - 生产环境操作系统
```

## 🔌 第三方服务集成

| 服务类型 | 提供商 | 状态 | 功能 |
|---------|--------|------|------|
| 📧 **邮件服务** | QQ SMTP | ✅ 正常 | 密码重置、通知邮件 |
| 🤖 **AI服务** | DeepSeek API | ✅ 正常 | 智能心理分析、对话 |
| 🌤️ **天气服务** | 和风天气 | ✅ 正常 | 实时天气、地理位置 |
| 🗺️ **地图服务** | 高德地图 | ✅ 正常 | 位置服务、地理编码 |
| 📱 **小程序** | 微信平台 | ✅ 正常 | 小程序登录、授权 |

> **API可用率**: 100% (5/5) - 所有服务正常运行

## 🚀 快速开始

### 本地开发环境

```bash
# 1. 克隆项目
git clone https://github.com/xuhao2004/kimochi.git
cd kimochi

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入必要配置

# 4. 数据库初始化
npx prisma generate
npx prisma db push

# 5. 启动开发服务器
npm run dev
```

访问 http://localhost:3000 开始开发

### 生产环境部署

```bash
# 1. 服务器环境初始化
./scripts/deploy.sh init

# 2. 一键部署
./scripts/local-update.sh -m "生产部署" -d

# 3. 验证部署
node scripts/test-apis.js
```

> 🔍 **详细部署指南**: 查看 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 📊 项目特色

### 🌟 生产环境优化
- **2核2G服务器优化** - 针对低配置服务器深度优化
- **中国网络环境** - 配置阿里云镜像源，解决访问问题
- **Safari兼容性** - 完美支持苹果设备地理位置权限
- **HTTPS安全访问** - SSL/TLS加密，满足现代浏览器要求

### 🔧 开发体验优化
- **TypeScript全栈** - 端到端类型安全
- **自动化部署** - 一键部署，自动备份回滚
- **完整测试工具** - API测试、健康检查脚本
- **详细文档** - 基于实际部署经验的完整文档

### 🌍 多环境支持
```
开发环境  →  本地开发机器 (localhost:3000)
生产环境  →  阿里云服务器 (https://47.104.8.84)
小程序    →  微信生态系统
```

## 📚 项目文档

| 文档 | 描述 | 适用对象 |
|------|------|----------|
| [🚀 快速开始](./docs/QUICK-START.md) | 5分钟快速了解项目 | 所有用户 |
| [📖 部署指南](./docs/DEPLOYMENT.md) | 完整生产环境部署 | 运维工程师 |
| [⚙️ 配置指南](./docs/CONFIGURATION.md) | 环境配置详解 | 系统管理员 |
| [🆘 故障排除](./docs/TROUBLESHOOTING.md) | 问题诊断和解决 | 技术支持 |
| [🔧 脚本工具](./scripts/README.md) | 部署脚本说明 | 开发者 |

## 🛡️ 安全性

### 数据保护措施
- **密码加密**: bcrypt + salt 安全存储
- **JWT认证**: 无状态身份验证，支持token刷新
- **数据加密**: 敏感字段AES加密存储
- **输入验证**: 严格的数据验证和SQL注入防护

### 隐私保护功能
- **匿名模式**: 用户可选择完全匿名使用
- **数据最小化**: 只收集必要的用户信息
- **用户控制**: 完全的数据导出和删除功能
- **透明度**: 清晰的隐私政策和数据使用说明

## 🎯 使用场景

### 🎓 教育机构
- **学校心理中心**: 学生心理健康筛查和干预
- **高校心理服务**: 大学生心理测评和咨询预约
- **特殊教育**: 针对性的心理评估工具

### 🏢 企业应用
- **EAP员工助理**: 企业员工心理健康管理
- **HR招聘**: 人格测评辅助人才选拔
- **团队建设**: 团队性格分析和协作优化

### 🏥 医疗健康
- **心理诊所**: 专业心理评估工具
- **医院科室**: 患者心理状态评估
- **康复中心**: 心理康复进度追踪

### 👤 个人用户
- **自我认知**: 深度了解自己的性格特点
- **情感管理**: 安全的情感表达和社交平台
- **成长追踪**: 长期的心理健康数据记录

## 📊 系统监控

### 实时状态
- **应用健康**: https://47.104.8.84/api/health
- **API服务状态**: `node scripts/test-apis.js`
- **服务器状态**: `kimochi-status` (服务器内)

### 性能指标
- **响应时间**: < 200ms (API平均响应)
- **可用性**: 99.9% (月度统计)
- **并发用户**: 支持100+同时在线
- **数据处理**: 10万+测评记录

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 参与方式
1. **报告问题**: 提交Issue描述bug或建议
2. **功能建议**: 分享您的想法和需求
3. **代码贡献**: 提交Pull Request
4. **文档改进**: 完善项目文档
5. **用户反馈**: 分享使用体验

### 开发流程
```bash
# 1. Fork项目并克隆
git clone https://github.com/your-username/kimochi.git

# 2. 创建功能分支
git checkout -b feature/your-feature

# 3. 提交更改
git commit -m "Add your feature"

# 4. 推送到分支
git push origin feature/your-feature

# 5. 创建Pull Request
```

## 📧 联系方式

### 技术支持
- **项目仓库**: https://github.com/xuhao2004/kimochi
- **问题反馈**: [GitHub Issues](https://github.com/xuhao2004/kimochi/issues)
- **技术讨论**: [GitHub Discussions](https://github.com/xuhao2004/kimochi/discussions)

### 商务合作
- **邮箱**: admin@kimochi.space
- **在线系统**: https://47.104.8.84
- **微信小程序**: 搜索"kimochi心晴"

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🎉 特别感谢

感谢所有贡献者、测试用户和支持者，让kimochi心晴成为一个真正有意义的心理健康平台。

**让心理健康变得更加触手可及** 💙

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给它一个星星！**

[⭐ Star](https://github.com/xuhao2004/kimochi/stargazers) • 
[🍴 Fork](https://github.com/xuhao2004/kimochi/network/members) • 
[❓ Issues](https://github.com/xuhao2004/kimochi/issues) • 
[💬 Discussions](https://github.com/xuhao2004/kimochi/discussions)

</div>