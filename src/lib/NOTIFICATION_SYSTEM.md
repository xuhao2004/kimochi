# 统一通知系统

## 概述

本系统实现了一个完整的通知管理解决方案，包括系统警报、用户消息和实时通知功能。所有界面均采用苹果设计美学 [[memory:5785378]]，提供优雅的用户体验。

## 主要功能

### 1. 系统警报分级

系统自动监测以下问题并生成分级警报：

- **密码过期警报** (60天未修改)
  - 针对超级管理员和老师
  - 自动检测并发送个人化警报
  - 超级管理员可查看所有老师的密码状态

- **个人信息不完整警报**
  - 检测必填字段：联系电话、办公室、个人邮箱
  - 针对超级管理员和老师
  - 分级提醒（创建超过30天为高优先级）

- **API失败监控**
  - 自动捕获天气API、DeepSeek AI等服务失败
  - 根据错误类型自动分级（配额限制、密钥错误、一般错误）
  - 实时通知技术人员

- **系统异常监控**
  - 捕获系统运行时异常
  - 自动生成技术支持警报

### 2. 警报严重程度

| 级别 | 标识 | 用途 | 处理优先级 |
|------|------|------|------------|
| 低 (Low) | 🔵 | 一般提醒 | 7天后自动处理 |
| 中 (Medium) | 🟡 | 需要关注 | 手动处理 |
| 高 (High) | 🟠 | 重要警报 | 优先处理 |
| 紧急 (Critical) | 🔴 | 严重问题 | 立即处理 |

### 3. 基于角色的可见性控制

- **超级管理员**: 查看所有通知，包括老师的密码和个人信息警报
- **老师/管理员**: 仅查看针对自己的通知和系统异常警报
- **学生**: 不接收系统管理通知，仅接收个人相关消息

### 4. 统一通知中心

#### 铃铛组件功能
- **悬浮预览**: 鼠标悬停800ms显示最新未读消息
- **实时计数**: 动态显示未读数量徽章
- **视觉效果**: 有未读消息时的动画和声波效果
- **可交互预览**: 支持在悬浮窗内直接处理消息

#### 完整通知面板
- **高级过滤**: 按严重程度、状态、类型、时间范围筛选
- **批量操作**: 支持多选、批量标记已读/已处理/删除
- **双视图模式**: 紧凑视图和详细视图切换
- **实时更新**: 30秒自动刷新，支持手动刷新

### 5. 独立通知中心页面

位于 `/notification-center`，提供完整的通知管理功能：

- **统计仪表板**: 未读、未处理、高优先级、系统警报数量
- **高级筛选器**: 多维度过滤和排序
- **批量处理**: 选择多条通知进行批量操作
- **系统检查**: 超级管理员可手动触发系统检查

## 技术实现

### 核心服务类

```typescript
// src/lib/notificationService.ts
export class NotificationService {
  // 创建系统警报
  static async createSystemAlert(alert: SystemAlert): Promise<string>
  
  // 定期检查
  static async runPeriodicChecks(): Promise<void>
  static async checkPasswordExpiry(): Promise<void>
  static async checkProfileCompletion(): Promise<void>
  
  // API失败记录
  static async recordAPIFailure(apiName: string, error: string, severity: AlertSeverity): Promise<void>
  static async recordSystemError(component: string, error: string, severity: AlertSeverity): Promise<void>
  
  // 清理和维护
  static async cleanupExpiredAlerts(): Promise<void>
  
  // 用户可见通知
  static async getUserVisibleNotifications(userId: string, userRole: string): Promise<any[]>
}
```

### 主要组件

1. **UnifiedNotificationCenter** (`src/components/UnifiedNotificationCenter.tsx`)
   - 统一通知入口组件
   - 悬浮预览和完整面板
   - 苹果设计风格界面

2. **NotificationCenterPage** (`src/app/notification-center/page.tsx`)
   - 独立通知管理页面
   - 完整的过滤和批量操作功能

### API 端点

- `GET /api/admin/messages` - 获取管理员消息（已增强过滤）
- `PUT /api/admin/messages` - 标记消息已读
- `PATCH /api/admin/messages` - 标记消息已处理
- `DELETE /api/admin/messages` - 删除消息
- `POST /api/admin/system-checks` - 手动触发系统检查
- `GET /api/admin/system-checks` - 获取系统状态

## 自动化运维

### 定期检查脚本

```bash
# 手动运行系统检查
node scripts/run-notification-checks.js

# 设置 cron 任务（每小时运行）
0 * * * * cd /path/to/kimochi && node scripts/run-notification-checks.js
```

### 自动清理规则

- **过期已处理警报**: 30天后自动删除
- **过期低优先级警报**: 7天后自动标记为已处理
- **API失败重复警报**: 避免短时间内重复通知

## 集成指南

### 在现有API中添加失败监控

```typescript
import { NotificationService } from '@/lib/notificationService';

try {
  // API 调用
} catch (error) {
  await NotificationService.recordAPIFailure(
    'API名称',
    error.message,
    'medium' // 根据错误严重程度选择
  );
  throw error;
}
```

### 添加系统异常监控

```typescript
try {
  // 系统操作
} catch (error) {
  await NotificationService.recordSystemError(
    '组件名称',
    error.message,
    'high'
  );
  throw error;
}
```

## 用户界面特性

### 苹果设计美学
- **圆角设计**: 统一使用2xl圆角 (16px)
- **毛玻璃效果**: backdrop-blur-xl 效果
- **渐变背景**: 优雅的渐变色彩搭配
- **动画过渡**: 流畅的进入/退出动画
- **阴影层次**: 适度的阴影增强层次感

### 交互体验
- **悬停反馈**: 鼠标悬停时的微妙状态变化
- **加载状态**: 优雅的加载动画
- **空状态**: 友好的空状态界面
- **错误处理**: 清晰的错误提示

## 最佳实践

1. **性能优化**
   - 分页加载大量通知
   - 定期清理过期数据
   - 避免频繁的数据库查询

2. **用户体验**
   - 合理的通知分级
   - 避免通知疲劳
   - 提供一键清除功能

3. **安全考虑**
   - 基于角色的访问控制
   - 敏感信息脱敏
   - 审计日志记录

4. **维护策略**
   - 定期运行系统检查
   - 监控通知系统健康状态
   - 及时清理过期数据

## 故障排除

### 常见问题

1. **通知不显示**
   - 检查用户权限设置
   - 确认 API 端点正常工作
   - 验证数据库连接

2. **系统检查失败**
   - 查看脚本运行日志
   - 检查数据库权限
   - 确认 cron 任务配置

3. **性能问题**
   - 检查通知数量是否过多
   - 考虑增加分页限制
   - 清理过期数据

### 调试命令

```bash
# 查看最近的通知
npx prisma studio

# 手动运行系统检查
node scripts/run-notification-checks.js

# 检查数据库连接
npx prisma db pull
```

## 更新日志

### 版本 2.0.0
- ✅ 实现统一通知中心
- ✅ 添加苹果设计美学界面
- ✅ 支持悬浮窗交互
- ✅ 基于角色的可见性控制
- ✅ 自动系统检查和警报
- ✅ 批量操作和高级过滤
- ✅ 独立通知中心页面

### 计划功能
- 🔄 邮件通知集成
- 🔄 移动端推送通知
- 🔄 通知偏好设置
- 🔄 通知模板自定义
