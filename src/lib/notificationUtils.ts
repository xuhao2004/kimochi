// 客户端通知工具函数
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export const notificationUtils = {
  /**
   * 获取警报严重程度的显示信息
   */
  getSeverityDisplay(severity: AlertSeverity): { label: string; color: string; bgColor: string } {
    const severityMap = {
      low: { label: '低', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      medium: { label: '中', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      high: { label: '高', color: 'text-orange-600', bgColor: 'bg-orange-100' },
      critical: { label: '紧急', color: 'text-red-600', bgColor: 'bg-red-100' }
    };
    return severityMap[severity] || severityMap.medium;
  },

  /**
   * 获取警报类型的显示信息
   */
  getTypeDisplay(type: string): { label: string; icon: string } {
    const typeMap: Record<string, { label: string; icon: string }> = {
      'system_password_expired': { label: '密码过期', icon: '🔒' },
      'system_profile_incomplete': { label: '信息不完整', icon: '📝' },
      'system_api_failure': { label: 'API失败', icon: '🔌' },
      'system_system_error': { label: '系统异常', icon: '⚠️' },
      'system_security_email_required': { label: '设置密保邮箱', icon: '🛡️' },
      'system_error': { label: '系统检查', icon: '✅' },
      // 分层广播类（仅管理员/老师端用于汇总）
      'teacher_password_required': { label: '老师默认密码', icon: '🔒' },
      'teacher_password_expired': { label: '老师密码过期', icon: '🔒' },
      'teacher_profile_incomplete': { label: '老师资料不全', icon: '📝' },
      'student_password_required': { label: '学生默认密码', icon: '🔑' },
      'student_password_expired': { label: '学生密码过期', icon: '🔑' },
      'student_profile_incomplete': { label: '学生资料不全', icon: '🧑🏻‍🎓' },
      'deepseek_quota_limit': { label: 'AI配额限制', icon: '🤖' },
      'weather_api_limit': { label: '天气API限制', icon: '🌤️' },
      // 好友与社交
      'friend_request': { label: '好友申请', icon: '🫱🏻‍🫲🏻' },
      'friend_request_receipt': { label: '好友回执', icon: '📨' },
      'password_reminder': { label: '密码安全提醒', icon: '🔑' },
      'profile_reminder': { label: '完善个人信息', icon: '👤' },
      'general': { label: '一般通知', icon: '📢' }
    };
    return typeMap[type] || { label: '系统通知', icon: '📋' };
  },

  /**
   * 获取优先级的显示信息
   */
  getPriorityDisplay(priority: string): { label: string; color: string; bgColor: string } {
    const priorityMap: Record<string, { label: string; color: string; bgColor: string }> = {
      low: { label: '低', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      normal: { label: '普通', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      high: { label: '高', color: 'text-orange-600', bgColor: 'bg-orange-100' },
      urgent: { label: '紧急', color: 'text-red-600', bgColor: 'bg-red-100' }
    };
    return priorityMap[priority] || priorityMap.normal;
  },

  /**
   * 格式化时间显示
   */
  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  }
};
