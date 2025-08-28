# kimochi心晴 - 更新日志

> 当前版本：v1.2.1（SSH迁移完成 · CI/CD优化 · 文档完善 · 自动化工具增强）

## [1.2.1] - 2025-01-17

### 📚 文档体系全面审核与优化

这是一个专注于文档质量提升和项目信息一致性的维护版本。

### Changed

#### **📖 文档引用修正**
- 修正 `DEPLOYMENT-GUIDE.md` 中对不存在文档的引用
  - 将 `CLI-USER-GUIDE.md` 引用替换为 `LOCAL-DEVELOPMENT-GUIDE.md`
  - 将 `SSH-SETUP-GUIDE.md` 引用替换为 `CONFIGURATION-GUIDE.md`
- 修正 `DOCKER.md` 中的文档引用
  - 将 `ADVANCED-FEATURES.md` 引用替换为 `CONFIGURATION-GUIDE.md`
  - 将 `CLI-USER-GUIDE.md` 引用替换为 `LOCAL-DEVELOPMENT-GUIDE.md`
- 修正 `TROUBLESHOOTING.md` 中的文档引用
  - 将 `CLI 用户指南` 替换为 `本地开发指南`

#### **🔧 版本信息统一**
- 统一 `package.json` 版本号为 v1.2.1，与 CHANGELOG 保持一致
- 确保项目版本信息的一致性

#### **📋 配置文件完善**
- 验证环境配置模板文件的完整性和注释说明
- 确认 PM2 生态系统配置文件的详细注释
- 检查 Next.js 配置文件的安全头配置

### Fixed

#### **🔗 文档链接准确性**
- 解决文档间交叉引用的准确性问题
- 修复指向不存在文档的链接
- 确保所有文档引用都指向正确的文件

本项目采用 Keep a Changelog 风格，时间为北京时间。遵循语义化描述（Added/Changed/Fixed）。

## [1.2.1] - 2024-08-25

### 🎯 **重大更新：HTTPS到SSH全面迁移 (基于v1.2补丁版本)**

这是一个基于v1.2版本的补丁更新，专注于连接稳定性和开发体验优化。

**版本说明**: 修复了v1.2版本中的SSH连接问题，并完善了文档体系。

### Added

#### **🔑 SSH配置指导**
- 提供详细的SSH配置文档和指南
- 支持Ed25519密钥生成
- SSH代理和钥匙串集成说明
- GitHub连接测试指导
- Git远程URL更新说明

#### **📚 完整文档体系**
- 新增 `docs/SSH-SETUP-GUIDE.md` - 详细的SSH配置指南
- 新增 `docs/LOCAL-DEVELOPMENT-GUIDE.md` - 本地开发环境配置详解
- 新增 `docs/CI-CD-CONFIGURATION.md` - CI/CD配置说明和故障排除
- 新增 `docs/HTTPS-TO-SSH-MIGRATION.md` - 完整的迁移报告
- 新增 `.github/workflows/ci-dev.yml` - 开发阶段优化的CI配置

#### **🔧 CI/CD流程优化**
- 暂时禁用部署步骤，专注代码质量检查
- 增强Docker构建测试
- 添加部署配置提醒和状态报告
- 优化错误处理和故障排除指引

### Changed

#### **🌐 全面SSH迁移**
- 所有Git克隆命令从HTTPS迁移到SSH格式
- 更新12处仓库URL引用
- 智能保留浏览器访问的HTTPS链接
- 部署脚本增加SSH配置检查

#### **📖 文档结构优化**
- README.md增加完整文档导航
- 所有主要文档添加SSH配置说明
- CLI用户指南增加首次使用必读章节
- 部署指南增加SSH配置前置要求

#### **🔄 开发流程改进**
- 优化开发环境启动流程
- 增强故障排除和诊断功能
- 改进用户引导和错误提示
- 统一跨平台脚本体验

### Fixed

#### **🐛 连接稳定性问题**
- 解决HTTP2协议层错误导致的git push失败
- 修复密保邮箱设置后个人邮箱自动同步逻辑
- 优化Edge浏览器位置定位兼容性
- 改进网络连接重试机制

#### **⚙️ 配置和兼容性**
- 修复不同操作系统的SSH配置差异
- 优化剪贴板工具兼容性
- 改进权限检查和错误处理
- 统一文档格式和链接引用

### Security

#### **🔒 安全性提升**
- SSH密钥认证替代密码认证
- 避免HTTPS连接的安全风险
- 增强密钥管理最佳实践指导
- 提供安全配置验证工具

## [1.1.0] - 2024-08-23

### 🎯 **重大更新：服务器部署流程优化**

这是一个专注于部署流程优化和环境兼容性增强的重要版本更新。

### Added

#### **🔧 进程管理优化**
- 改进进程管理和冲突检测
- 优雅停止和强制停止机制
- 进程锁文件防止并发执行
- 端口占用检测和释放

#### **🌍 环境检查增强**
- 增强环境检查功能
- 环境清理和重置选项
- 智能端口释放机制
- 网络连接重试机制（3次重试）
- 全面的环境状态检查

#### **🗄️ 数据库管理优化**
- 优化数据库迁移和管理功能
- 支持数据库初始化和重置
- 智能处理P3005错误（数据库不为空但无迁移历史）
- 自动数据库基线化处理
- 支持数据填充（seed）

#### **📋 部署脚本功能说明**
- 明确定义四个环境：dev(3001)、test(3002)、staging(3003)、prod(3000)
- 详细的脚本功能说明和使用场景
- 纯生产服务器部署流程
- 首次部署 vs 更新部署的区别

### Changed

#### **部署流程优化**
- 部署脚本添加进程锁机制
- 智能依赖安装（npm ci失败时自动切换到npm install）
- 增强的环境预检查
- 改进的错误处理和回退机制

#### **脚本整合**
- 删除14个重叠脚本，保留12个核心脚本
- 功能合并：数据库、环境管理、监控功能
- 脚本数量减少54%，维护复杂度大幅降低
- 保持100%功能完整性

#### **文档更新**
- 更新 `complete-development-guide.md` 环境配置说明
- 新增详细的部署脚本功能说明
- 创建 `troubleshooting-guide-updated.md` 最新故障排除指南
- 删除过时文档，统一文档格式

#### **项目清理**
- 清理所有备份文件（.backups目录）
- 清理日志文件（.deploy-logs、.dev-logs）
- 删除缓存目录（.next、node_modules/.cache）
- 清理临时文件（*.log、*.tmp、*~、.DS_Store）
- 数据库重置，删除所有.db文件
- 脚本精简，从26个脚本精简到20个脚本

### Fixed

- 修复进程冲突导致的"Cannot launch a new waiting process"错误
- 修复端口占用检测和自动释放
- 修复网络连接检查的超时处理
- 修复依赖安装的同步问题处理
- 修复数据库迁移的P3005错误处理

### Security

- 进程锁文件防止并发部署
- 自动备份机制保护数据
- 优雅停止进程避免数据丢失
- 环境检查确保部署安全

---

## [0.1.0] - 2024-12-XX

### Added
- 基础心理健康平台功能
- MBTI、SDS、SCL-90测评工具
- 实时聊天系统
- 用户管理和数据分析
- 管理后台功能
- 隧道自动探测：`scripts/ops.sh` 与 `scripts/devtest.sh` 自动解析 `~/.cloudflared/config.yml` 的 `tunnel:` 引用并显示 `cloudflared tunnel info`
- 管理脚本：新增 `npm run superadmin:create[:dev]` 与 `npm run teacher:create[:dev]`，用于创建超级管理员与老师（管理员）
- 文档与指南：`README.md`、`docs/GUIDE_SUPER_ADMIN.md`、`docs/GUIDE_TEACHER.md`、`docs/GUIDE_OPERATIONS_DEV.md`、`documents/dev/development-workflow-guide.md` 增补脚本使用说明
 - 构建目录分离：Next.js 开发构建目录为 `.next-dev`，生产构建目录为 `.next-prod`；运维与开发脚本的 `--clean`/`--no-build` 已适配
 - weapp-bind 页面可用性：绑定码容器支持自动换行与较小字号，增加“复制”按钮；卡片宽度调整至 `max-w-lg`
 - 流程约束：新增 Dev-first 强制规则（先 `devtest.sh` 验证再执行 `ops.sh` 上线），同步 README 与运维指南

### Changed
- Cloudflare 隧道：推荐 `protocol: quic`；回源统一为 `http://127.0.0.1`
- 文档升级至工作流 v1.7（README、文档中心、运维指南、工作流指南）
- 环境文件：在 `.env.dev.local` 与 `.env.prod.local` 中加入 `SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD` 与老师脚本的占位注释
- 导出报告：离线 HTML 报告页面 `<title>` 与页内 `<h1>` 统一为「kimochi心晴用户数据报告」（下载文件名仍为 `用户数据导出_YYYY-MM-DD.html`）
 - 文档修订：统一将 `.next` 的引用更新为 `.next-dev`/`.next-prod`

### Fixed
- 隧道信息显示：解决了需要手动设置环境变量才能查看隧道状态的问题

### Removed
- 清理重复/无用文件：`.env.production.local`、`.env.development.local`、`.env.local.bak-*`、未用图标（next/vercel/window/globe/file.svg）、`mini-program/sourcemap.zip`、`headers.txt`、`src/app/admin/page.tsx.backup`

## [2025-08-15]
### Added
- Docs: 新增使用指南（运维/超管/学生/老师/自助注册&小程序）；完善文档中心与归档说明；
- Security: Next.js 增加安全头（CSP、XFO、XCTO、Permissions-Policy、Referrer-Policy）。
- Data: `scripts/db-merge.js` 扩展支持 User/Chat* 插入与受限 upsert；保留 ViolationReason 增量合并；
- Docs: README 增补测试与上线指令；
- Ops: 系统上线公告脚本说明补充。

## [2025-08-14]

### Docs
- 标注当前工作流版本：v1.3（单次验收重启 / remote=active / 禁止管道或分页器）。
- `documents/README.md` 顶部加入版本标注与执行约束。
- `documents/dev/development-workflow-guide.md` 升级至 v1.3 并新增“执行约束（强制）”。
- `documents/dev/current-demo-development-plan.md` 增补“管理端可视化：超管页面信息条”。
- `documents/dev/conversation-log.md` 归档 Session 17/18（工作流规则升级与可视化标注）。
 - 超管界面“导出设置”对话框追加兼容性提示；文档弹窗新增“实时归档四件套”清单与“复制重启命令”二级指引。
- Docs: 追加 VS Code 集成终端启动失败（/bin/zsh -l 退出码 1）排查与修复指引（设置复位、工作区路径修正、日志定位）；归档本次会话并同步“四件套”。

### Changed
- `src/app/page.tsx`：为超级管理员显示工作流 v1.3 Banner。
- `src/app/super-admin/page.tsx`：顶部导航新增 v1.3 信息条（md+ 显示）。
 - `src/app/super-admin/page.tsx`：新增“工作流文档”快速入口与“状态自检”指引对话框（复制 `bash scripts/ops.sh status` 命令）。
- `src/app/api/admin/user-management/route.ts`：导出响应头添加 RFC 5987 的 filename* 与 ASCII 回退；ZIP 内条目名改为 ASCII 安全名，增加 DEFLATE 压缩等级。
  - 账号安全与第三方：新增找回密码、账号变更验证码、微信登录/绑定、修改密码后邮件通知；个人资料新增格式校验（电话/邮箱）。

### Ops
- 两次统一重启与自检：最终 local=running，remote=active；根域与子域均 200。
 - 脚本增强：`ops.sh` 新增 DOMAINS 环境变量、`status --compact`、`validate`、`logs`、`urls`、`restart-next`、`restart-tunnel` 等便捷子命令。
  - 统一重启与自检：local=running，remote=active；微信/验证码相关路由已可用。

## [2025-08-13]

### Added
- 独立更新日志 `CHANGELOG.md`。
- 超级管理员创建“自助注册”用户时，支持邮箱或手机号作为登录标识（与未登录注册一致）。
 - 导出功能：
   - 后端 `/api/admin/user-management` 增加 `columns` 与 `groupBy=college` 参数；
   - `format=csv&groupBy=college` 生成 ZIP（分学院多个 CSV）；
   - 单文件 CSV 支持自定义列集。

### Changed
- 个人中心卡片布局与视觉：自适应网格、内容垂直居中；“性别”下拉高度与输入框一致；“联系电话”添加“可多次修改”提示。
- 超管创建用户界面：
  - 自助注册：输入框文案为“账号标识（邮箱或手机号）”。
  - 教师：邮箱字段为个人信息的可选项，非登录账号；文案明确以消除“教师可选”误导。
- 运维脚本建议：不再通过 `| cat` 管道调用；以 “START OK (stabilized)” 作为成功标记。
 - 超管页面新增“导出设置”对话框，支持选择导出列与分组。

### Fixed
- 个人中心保存失败：学生仅修改生日且未填联系邮箱/电话时报“邮箱或手机号已被使用”。现后端清洗空字符串为未填，且仅在值非空且确实变化时更新登录邮箱/手机号，避免误触发唯一约束。

---

## [2025-08-12 ~ 2025-08-13 概览]
- Cloudflare Tunnel（根域/子域）与一键运维脚本上线，自检与单实例隧道保障。
- 通知中心：好友申请/回执纳入统一通知，筛选与图标完善，按钮布局优化。
- 联系人权限与分组纠偏：学生/注册用户不再默认显示“超级管理员”。
- 超管数据看板：累计用户统计改为实时值。

## 2025-08-15
- Mini-Program: Redesigned Home (glass header, feature cards, daily preview, hot posts), Apple-like aesthetics
- Mini-Program: Daily favorites page, poster sharing
- Mini-Program: Wall posting (anonymous, multi-image, tags, selective visibility), likes with count
- Mini-Program: Messages center (filters, mark-all-read, pin with persistence, batch delete), skeletons and windowed lists
- Mini-Program: Avatar editor (zoom, rotate, drag, grayscale, brightness, circular export)
- Backend: /api/upload, /api/daily/favorites, /api/user-messages/pin, /api/message-wall/posts/[postId]/like, wall likes in list
- Cleanup: remove template logs page, drop unsupported requiredPrivateInfos

## [2025-08-17]

### Added
- 运维自动化：为 `scripts/ops.sh` 和 `scripts/devtest.sh` 增加隧道信息自动探测功能
  - 无需手动设置 `TUNNEL_NAME` 环境变量
  - 自动从 `CLOUDFLARED_CFG` 配置文件中解析首个 `tunnel:` 值
  - `status` 命令自动显示 `cloudflared tunnel info` 摘要
  - 保持向后兼容，环境变量设置仍优先

### Changed
- 脚本增强：运维脚本 `status` 输出更加智能，自动识别隧道引用
- 用户体验：运维人员无需额外配置即可看到隧道状态信息

### Fixed
- 隧道信息显示：解决了需要手动设置环境变量才能查看隧道状态的问题

---

**记录时间**: 2025-08-17  
**版本**: v1.5.1  
**维护**: AI开发助手


