# 🍎 Apple Design System 组件库

## 概述

这是一套基于苹果设计语言的React组件库，为项目提供统一的UI风格和用户体验。所有组件都遵循苹果的设计原则，包括圆角、磨砂效果、微交互和优雅的动画。

## 🎨 设计原则

### 视觉风格
- **圆角设计**: 统一使用 `rounded-2xl` (16px) 作为主要圆角
- **磨砂效果**: 使用 `backdrop-blur-xl` 和半透明背景
- **渐变色彩**: 采用从浅到深的渐变效果
- **阴影层次**: 使用 `shadow-2xl` 创建层次感

### 交互体验
- **微动画**: 200-300ms 的过渡动画
- **反馈机制**: hover、active、focus 状态的视觉反馈
- **缩放效果**: 按钮点击时的轻微缩放 (`scale-95`)
- **色彩变化**: 渐进的颜色过渡

## 📦 组件列表

### 1. AppleButton 按钮组件

#### 功能特性
- 5种变体：primary、secondary、destructive、ghost、outline
- 4种尺寸：sm、md、lg、xl
- 支持加载状态和图标
- 完整的键盘访问性

#### 使用示例
```tsx
import AppleButton from '@/components/AppleButton';

// 基础用法
<AppleButton variant="primary" size="lg">
  保存设置
</AppleButton>

// 带图标和加载状态
<AppleButton 
  variant="destructive"
  leftIcon={<TrashIcon />}
  isLoading={isDeleting}
  loadingText="删除中..."
>
  删除项目
</AppleButton>
```

#### 属性说明
- `variant`: 按钮样式变体
- `size`: 按钮尺寸
- `isLoading`: 加载状态
- `leftIcon/rightIcon`: 左右图标
- `fullWidth`: 全宽度显示

### 2. AppleInput 输入框组件

#### 功能特性
- 支持多种输入类型
- 左右图标支持
- 错误状态和帮助文本
- 完整的表单验证

#### 使用示例
```tsx
import AppleInput from '@/components/AppleInput';

<AppleInput
  label="用户名"
  placeholder="请输入用户名"
  leftIcon={<UserIcon />}
  error={errors.username}
  required
/>
```

### 3. AppleTextarea 文本域组件

#### 功能特性
- 自动字符计数
- 可调整大小选项
- 错误状态显示
- 最大长度限制

#### 使用示例
```tsx
import AppleTextarea from '@/components/AppleTextarea';

<AppleTextarea
  label="描述"
  placeholder="请输入详细描述..."
  maxLength={500}
  rows={4}
  helperText="详细的描述有助于其他人理解"
/>
```

### 4. AppleSelect 选择器组件

#### 功能特性
- 自定义下拉样式
- 图标支持
- 键盘导航
- 搜索功能

#### 使用示例
```tsx
import AppleSelect from '@/components/AppleSelect';

const options = [
  { value: 'happy', label: '开心', icon: '😊' },
  { value: 'sad', label: '难过', icon: '😢' }
];

<AppleSelect
  value={selectedMood}
  onChange={setSelectedMood}
  options={options}
  placeholder="选择心情"
/>
```

### 5. AppleConfirmDialog 确认对话框

#### 功能特性
- 磨砂背景效果
- 优雅的动画进场
- 键盘快捷键支持
- 加载状态显示

#### 使用示例
```tsx
import AppleConfirmDialog from '@/components/AppleConfirmDialog';

<AppleConfirmDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={handleConfirm}
  title="删除确认"
  message="确定要删除这个项目吗？此操作无法撤销。"
  variant="destructive"
  isLoading={isDeleting}
/>
```

## 🎯 使用指南

### 颜色系统
```tsx
// 主色调
primary: 'from-blue-500 to-indigo-500'
secondary: 'from-gray-100 to-gray-200'  
destructive: 'from-red-500 to-red-600'

// 状态色
success: 'text-green-600 bg-green-50'
warning: 'text-orange-600 bg-orange-50'
error: 'text-red-600 bg-red-50'
```

### 间距系统
```tsx
// 组件内部间距
padding: 'p-4 py-3 px-6'

// 组件间距
margin: 'space-y-4 space-x-3'

// 圆角
borderRadius: 'rounded-2xl rounded-xl'
```

### 动画系统
```tsx
// 标准过渡
transition: 'transition-all duration-200'

// 缩放效果
scale: 'hover:scale-105 active:scale-95'

// 模糊效果
backdrop: 'backdrop-blur-xl backdrop-blur-md'
```

## 🔧 开发规范

### 组件命名
- 所有组件以 `Apple` 前缀命名
- 使用 PascalCase 命名方式
- 文件名与组件名保持一致

### 属性设计
- 优先使用语义化属性名
- 提供合理的默认值
- 支持完整的TypeScript类型

### 样式约定
- 使用 Tailwind CSS 类名
- 避免内联样式
- 保持样式一致性

### 可访问性
- 支持键盘导航
- 提供适当的ARIA属性
- 考虑屏幕阅读器支持

## 📱 响应式设计

所有组件都考虑了移动端适配：

```tsx
// 响应式间距
className="px-4 sm:px-6 lg:px-8"

// 响应式文字
className="text-sm sm:text-base lg:text-lg"

// 响应式布局
className="flex-col sm:flex-row"
```

## 🚀 最佳实践

### 1. 组件组合
```tsx
// 推荐：组合使用
<div className="space-y-4">
  <AppleInput label="标题" />
  <AppleTextarea label="内容" />
  <AppleButton variant="primary" fullWidth>
    提交
  </AppleButton>
</div>
```

### 2. 状态管理
```tsx
// 推荐：统一的状态管理
const [formState, setFormState] = useState({
  loading: false,
  errors: {},
  data: {}
});
```

### 3. 错误处理
```tsx
// 推荐：优雅的错误显示
<AppleInput
  error={errors.email}
  helperText="请输入有效的邮箱地址"
/>
```

## 🎭 主题定制

### 自定义颜色
```tsx
// 在 tailwind.config.js 中扩展
module.exports = {
  theme: {
    extend: {
      colors: {
        'apple-blue': '#007AFF',
        'apple-gray': '#8E8E93'
      }
    }
  }
}
```

### 自定义动画
```tsx
// 添加自定义动画
animation: {
  'slide-up': 'slideUp 0.2s ease-out',
  'fade-in': 'fadeIn 0.3s ease-in-out'
}
```

## 📋 组件检查清单

每个新组件都应该满足：

- [ ] 遵循苹果设计语言
- [ ] 支持 TypeScript
- [ ] 包含完整的属性类型
- [ ] 提供使用示例
- [ ] 支持键盘访问
- [ ] 响应式设计
- [ ] 错误处理
- [ ] 加载状态
- [ ] 动画过渡
- [ ] 单元测试

## 🔄 更新日志

### v1.0.0 (当前版本)
- ✅ AppleButton 按钮组件
- ✅ AppleInput 输入框组件  
- ✅ AppleTextarea 文本域组件
- ✅ AppleSelect 选择器组件
- ✅ AppleConfirmDialog 确认对话框

### 计划中的组件
- [ ] AppleModal 模态框
- [ ] AppleToast 通知组件
- [ ] AppleTable 表格组件
- [ ] AppleCard 卡片组件
- [ ] AppleNavigation 导航组件

---

💡 **提示**: 这套组件库持续更新中，欢迎提出改进建议！
