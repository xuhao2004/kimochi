/**
 * 苹果风格头像生成工具
 * 采用苹果设计语言的配色方案和样式
 */

// 苹果风格的配色方案
const APPLE_COLORS = [
  // 蓝色系
  { from: 'from-blue-400', to: 'to-blue-600', text: 'text-white' },
  { from: 'from-indigo-400', to: 'to-indigo-600', text: 'text-white' },
  { from: 'from-cyan-400', to: 'to-cyan-600', text: 'text-white' },
  
  // 绿色系
  { from: 'from-green-400', to: 'to-green-600', text: 'text-white' },
  { from: 'from-emerald-400', to: 'to-emerald-600', text: 'text-white' },
  { from: 'from-teal-400', to: 'to-teal-600', text: 'text-white' },
  
  // 紫色系
  { from: 'from-purple-400', to: 'to-purple-600', text: 'text-white' },
  { from: 'from-violet-400', to: 'to-violet-600', text: 'text-white' },
  { from: 'from-fuchsia-400', to: 'to-fuchsia-600', text: 'text-white' },
  
  // 橙红色系
  { from: 'from-orange-400', to: 'to-orange-600', text: 'text-white' },
  { from: 'from-red-400', to: 'to-red-600', text: 'text-white' },
  { from: 'from-pink-400', to: 'to-pink-600', text: 'text-white' },
  
  // 暖色系
  { from: 'from-amber-400', to: 'to-amber-600', text: 'text-white' },
  { from: 'from-yellow-400', to: 'to-yellow-600', text: 'text-gray-800' },
  { from: 'from-lime-400', to: 'to-lime-600', text: 'text-white' },
];

// 根据用户ID生成一致的颜色
export function generateAvatarColor(userId: string): { from: string; to: string; text: string } {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  const index = Math.abs(hash) % APPLE_COLORS.length;
  return APPLE_COLORS[index];
}

// 根据姓名生成缩写
export function generateAvatarInitials(name: string): string {
  if (!name) return '用';
  
  const trimmedName = name.trim();
  if (trimmedName.length === 0) return '用';
  
  // 中文名取最后两个字符（姓名）
  if (/[\u4e00-\u9fa5]/.test(trimmedName)) {
    return trimmedName.length >= 2 
      ? trimmedName.slice(-2) 
      : trimmedName;
  }
  
  // 英文名取首字母
  const words = trimmedName.split(' ').filter(word => word.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  
  return '用';
}

// 生成完整的头像样式类名
export function generateAvatarStyles(userId: string): {
  background: string;
  textColor: string;
  initials: string;
} {
  const color = generateAvatarColor(userId);
  return {
    background: `bg-gradient-to-br ${color.from} ${color.to}`,
    textColor: color.text,
    initials: generateAvatarInitials(userId)
  };
}

// 苹果风格的头像组件属性
export interface AppleAvatarProps {
  userId: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  profileImage?: string | null;
  className?: string;
}

// 尺寸映射
export const AVATAR_SIZES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

// 生成头像样式
export function getAvatarClasses(userId: string, name: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): {
  containerClass: string;
  textClass: string;
  initials: string;
} {
  const color = generateAvatarColor(userId);
  const initials = generateAvatarInitials(name);
  const sizeClass = AVATAR_SIZES[size];
  
  return {
    containerClass: `${sizeClass} rounded-full flex items-center justify-center bg-gradient-to-br ${color.from} ${color.to} shadow-sm ring-2 ring-white/20`,
    textClass: `font-semibold ${color.text}`,
    initials
  };
}
