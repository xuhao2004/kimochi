// TabBar 图标创建脚本 - 为开发使用
// 这个脚本将创建临时的文本图标，实际项目中建议使用专业设计的图标

const icons = {
  home: {
    normal: '🏠',
    active: '🏠'
  },
  assessment: {
    normal: '📊', 
    active: '📊'
  },
  wall: {
    normal: '💭',
    active: '💭'
  },
  message: {
    normal: '💬',
    active: '💬'
  },
  profile: {
    normal: '👤',
    active: '👤'
  }
};

// 图标规范说明
console.log('TabBar 图标规范：');
console.log('- 尺寸：81px × 81px');
console.log('- 格式：PNG');
console.log('- 未选中色彩：#8e8e93');
console.log('- 选中色彩：#007AFF');
console.log('- 背景：透明');

module.exports = icons;
