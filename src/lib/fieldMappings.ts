/**
 * 字段映射和标签工具函数
 */

// 功能特性标签映射
const FEATURE_LABELS: Record<string, string> = {
  'weather_query': '天气查询',
  'daily_message': '每日心语',
  'assessment': '心理测评',
  'profile_update': '资料更新',
  'friend_request': '好友申请',
  'chat_message': '聊天消息',
  'post_create': '发布动态',
  'post_comment': '评论动态',
  'location_update': '位置更新',
  'security_email': '密保邮箱',
  'password_change': '密码修改',
  'account_change': '账号变更',
  'admin_operation': '管理操作',
  'system_announcement': '系统公告',
  'user_report': '用户举报',
  'violation_review': '违规审核'
};

// 账户类型标签映射
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  'self': '自助注册',
  'student': '学生',
  'teacher': '教师',
  'admin': '管理员',
  'super_admin': '超级管理员',
  'weapp': '微信用户'
};

// 创建来源标签映射
const CREATED_BY_TYPE_LABELS: Record<string, string> = {
  'email_register': '邮箱注册',
  'phone_register': '手机注册',
  'weapp_oauth': '微信小程序',
  'wechat_oauth': '微信网页',
  'super_admin': '超管创建',
  'admin_created': '管理员创建'
};

// 性别标签映射
const GENDER_LABELS: Record<string, string> = {
  'male': '男',
  'female': '女',
  'other': '其他',
  'prefer_not_to_say': '不愿透露'
};

// 星座标签映射
const ZODIAC_LABELS: Record<string, string> = {
  'aries': '白羊座',
  'taurus': '金牛座',
  'gemini': '双子座',
  'cancer': '巨蟹座',
  'leo': '狮子座',
  'virgo': '处女座',
  'libra': '天秤座',
  'scorpio': '天蝎座',
  'sagittarius': '射手座',
  'capricorn': '摩羯座',
  'aquarius': '水瓶座',
  'pisces': '双鱼座'
};

/**
 * 获取功能特性的中文标签
 */
export function getFeatureLabel(feature: string): string {
  return FEATURE_LABELS[feature] || feature;
}

/**
 * 获取账户类型的中文标签
 */
export function getAccountTypeLabel(accountType: string): string {
  return ACCOUNT_TYPE_LABELS[accountType] || accountType;
}

/**
 * 获取创建来源的中文标签
 */
export function getCreatedByTypeLabel(createdByType: string): string {
  return CREATED_BY_TYPE_LABELS[createdByType] || createdByType;
}

/**
 * 获取性别的中文标签
 */
export function getGenderLabel(gender: string): string {
  return GENDER_LABELS[gender] || gender;
}

/**
 * 获取星座的中文标签
 */
export function getZodiacLabel(zodiac: string): string {
  return ZODIAC_LABELS[zodiac] || zodiac;
}

/**
 * 获取所有功能特性选项
 */
export function getFeatureOptions() {
  return Object.entries(FEATURE_LABELS).map(([value, label]) => ({ value, label }));
}

/**
 * 获取所有账户类型选项
 */
export function getAccountTypeOptions() {
  return Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
}

/**
 * 获取所有创建来源选项
 */
export function getCreatedByTypeOptions() {
  return Object.entries(CREATED_BY_TYPE_LABELS).map(([value, label]) => ({ value, label }));
}

/**
 * 获取所有性别选项
 */
export function getGenderOptions() {
  return Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }));
}

/**
 * 获取所有星座选项
 */
export function getZodiacOptions() {
  return Object.entries(ZODIAC_LABELS).map(([value, label]) => ({ value, label }));
}