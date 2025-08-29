# 📱 小程序资源文件说明

## 📂 目录结构

```
assets/
├── tab/           # TabBar图标
├── default/       # 默认头像等
└── share/         # 分享图片
```

## 🎨 TabBar图标要求

每个TabBar需要两个图标文件：
- 未选中状态：尺寸 81px × 81px
- 选中状态：尺寸 81px × 81px

### 需要的图标文件：

1. **首页**
   - `tab/home.png` - 未选中
   - `tab/home-active.png` - 选中

2. **测评** 
   - `tab/assessment.png` - 未选中
   - `tab/assessment-active.png` - 选中

3. **心情墙**
   - `tab/wall.png` - 未选中
   - `tab/wall-active.png` - 选中

4. **消息**
   - `tab/message.png` - 未选中
   - `tab/message-active.png` - 选中

5. **我的**
   - `tab/profile.png` - 未选中  
   - `tab/profile-active.png` - 选中

## 💡 开发提示

暂时使用文本图标进行开发测试，正式发布前请替换为设计的图标文件。

图标设计建议：
- 使用简洁的线条风格
- 未选中状态使用浅色（#8e8e93）
- 选中状态使用蓝色（#007AFF）
- 背景透明PNG格式
