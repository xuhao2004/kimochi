import { prisma } from '@/lib/prisma';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 
  | 'password_expired' 
  | 'profile_incomplete' 
  | 'api_failure' 
  | 'system_error'
  | 'quota_limit'
  | 'service_outage'
  | 'security_issue';

export interface SystemAlert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  content: string;
  targetUserId?: string; // 特定用户的警报
  targetRole?: 'superAdmin' | 'admin' | 'teacher'; // 角色级别的警报
  metadata?: Record<string, any>;
  autoResolve?: boolean; // 是否自动解决
  expireAt?: Date; // 警报过期时间
}

export class NotificationService {
  /**
   * 创建系统警报通知
   */
  static async createSystemAlert(alert: SystemAlert): Promise<string> {
    try {
      const priorityMap: Record<AlertSeverity, string> = {
        low: 'low',
        medium: 'normal',
        high: 'high',
        critical: 'urgent'
      };

      const message = await prisma.adminMessage.create({
        data: {
          type: `system_${alert.type}`,
          title: alert.title,
          content: alert.content,
          userId: alert.targetUserId,
          priority: priorityMap[alert.severity],
          isRead: false,
          isProcessed: false,
          createdAt: new Date()
        }
      });

      return message.id;
    } catch (error) {
      console.error('Failed to create system alert:', error);
      throw error;
    }
  }

  /**
   * 检查密码过期情况（超过60天未修改）
   * 注意：个人密码过期通知由 userReminders.ts 处理，这里只做系统级汇总统计
   */
  static async checkPasswordExpiry(): Promise<{ issuesFound: number }> {
    try {
      // 统计密码过期用户数量，但不创建个人通知（避免重复）
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const expiredPasswordUsers = await prisma.user.count({
        where: {
          OR: [
            { isSuperAdmin: true },
            { accountType: 'admin' },
            { accountType: 'teacher' }
          ],
          updatedAt: {
            lt: sixtyDaysAgo
          }
        }
      });
      
      // 只在密码过期用户较多时发送汇总通知给超级管理员
      if (expiredPasswordUsers >= 5) {
        const existingSummaryAlert = await prisma.adminMessage.findFirst({
          where: {
            type: 'system_password_expired',
            title: { contains: '密码过期汇总' },
            isProcessed: false,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时内
            }
          }
        });
        
        if (!existingSummaryAlert) {
          await this.createSystemAlert({
            type: 'password_expired',
            severity: expiredPasswordUsers > 20 ? 'high' : 'medium',
            title: '密码过期汇总',
            content: `系统检测到 ${expiredPasswordUsers} 位用户的密码已超过60天未修改。\n\n建议督促相关用户及时修改密码以确保账户安全。个人用户已收到单独的提醒通知。`,
            targetRole: 'superAdmin',
            metadata: {
              expiredCount: expiredPasswordUsers,
              checkTime: new Date().toISOString()
            }
          });
        }
      }
      
      console.log(`[NotificationService] 密码过期统计: ${expiredPasswordUsers} 位用户`);
      return { issuesFound: expiredPasswordUsers };
    } catch (error) {
      console.error('Failed to check password expiry:', error);
      return { issuesFound: 0 };
    }
  }

  /**
   * 检查个人信息完成度 - 只处理汇总统计，个人用户提醒由 userReminders.ts 处理
   */
  static async checkProfileCompletion(): Promise<{ issuesFound: number }> {
    try {
      // 拉取相关用户并用与 userReminders 同口径进行字段级判定，避免仅依赖 hasUpdatedProfile 带来的误差
      const candidates = await prisma.user.findMany({
        where: {
          OR: [
            { isSuperAdmin: true },
            { accountType: 'admin' },
            { accountType: 'teacher' }
          ]
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
          studentId: true,
          accountType: true,
          isSuperAdmin: true,
          phone: true,
          office: true,
          personalEmail: true,
          securityEmail: true,
          securityEmailExempt: true,
          birthDate: true,
          gender: true,
          createdAt: true
        }
      });

      const isIncomplete = (u: any): boolean => {
        const missing: string[] = [];
        if (!u.nickname) missing.push('昵称');
        if (!u.gender) missing.push('性别');
        if (!u.birthDate) missing.push('生日');
        if (!u.personalEmail) missing.push('个人邮箱');
        if (!u.securityEmail && !u.securityEmailExempt) missing.push('密保邮箱');
        if (u.accountType === 'teacher' || u.accountType === 'admin' || u.isSuperAdmin) {
          if (!u.office) missing.push('办公室');
          if (!u.phone) missing.push('联系电话');
        }
        return missing.length > 0;
      };

      const incompleteUsers = candidates.filter(isIncomplete);

      // 只给超级管理员发送汇总统计，不给个人用户发送重复通知
      // 个人用户的提醒完全由 userReminders.ts 处理，避免重复
      if (incompleteUsers.length > 0) {
        const existingSummaryAlert = await prisma.adminMessage.findFirst({
          where: {
            type: 'system_profile_incomplete',
            title: { contains: '个人信息完成度汇总' },
            isProcessed: false,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时内
            }
          }
        });

        // 只在没有近期汇总通知时才发送新的汇总
        if (!existingSummaryAlert && incompleteUsers.length >= 3) {
          const teacherCount = incompleteUsers.filter(u => u.accountType === 'teacher').length;
          const adminCount = incompleteUsers.filter(u => u.accountType === 'admin').length;
          const superAdminCount = incompleteUsers.filter(u => u.isSuperAdmin).length;
          
          await this.createSystemAlert({
            type: 'profile_incomplete',
            severity: incompleteUsers.length > 10 ? 'high' : 'medium',
            title: '个人信息完成度汇总',
            content: `系统检测到 ${incompleteUsers.length} 位用户的个人信息不完整：\n\n` +
                    `- 教师：${teacherCount} 人\n` +
                    `- 管理员：${adminCount} 人\n` +
                    `- 超级管理员：${superAdminCount} 人\n\n` +
                    `建议提醒相关用户完善个人信息。个人用户已收到单独的提醒通知。`,
            targetRole: 'superAdmin',
            metadata: {
              totalIncomplete: incompleteUsers.length,
              teacherCount,
              adminCount,
              superAdminCount,
              checkTime: new Date().toISOString()
            }
          });
        }
      }
      
      return { issuesFound: incompleteUsers.length };
    } catch (error) {
      console.error('Failed to check profile completion:', error);
      await this.createSystemAlert({
        type: 'system_error',
        severity: 'medium',
        title: '系统检查失败',
        content: '个人信息完成度检查服务运行失败，请检查系统状态。',
        targetRole: 'superAdmin'
      });
      return { issuesFound: 0 };
    }
  }

  /**
   * 记录API调用失败
   */
  static async recordAPIFailure(
    apiName: string, 
    error: string, 
    severity: AlertSeverity = 'medium'
  ): Promise<void> {
    try {
      await this.createSystemAlert({
        type: 'api_failure',
        severity,
        title: `API调用失败：${apiName}`,
        content: `${apiName} API调用失败，请检查服务状态和配置。\n\n错误信息：${error}\n\n时间：${new Date().toLocaleString('zh-CN')}\n\n建议联系技术人员进行调试。`,
        targetRole: 'superAdmin',
        metadata: {
          apiName,
          error,
          timestamp: new Date().toISOString()
        }
      });
    } catch (dbError) {
      console.error('Failed to record API failure:', dbError);
    }
  }

  /**
   * 记录系统异常
   */
  static async recordSystemError(
    component: string,
    error: string,
    severity: AlertSeverity = 'high'
  ): Promise<void> {
    try {
      await this.createSystemAlert({
        type: 'system_error',
        severity,
        title: `系统异常：${component}`,
        content: `系统组件 ${component} 发生异常，可能影响正常服务。\n\n错误详情：${error}\n\n时间：${new Date().toLocaleString('zh-CN')}\n\n请立即联系技术人员进行排查和修复。`,
        targetRole: 'superAdmin',
        metadata: {
          component,
          error,
          timestamp: new Date().toISOString()
        }
      });
    } catch (dbError) {
      console.error('Failed to record system error:', dbError);
    }
  }

  /**
   * 记录用户遇到的实时错误（用户使用功能时的错误）
   */
  static async recordUserFacingError(
    userId: string,
    userInfo: { name: string; accountType: string },
    feature: string,
    error: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      const severity: AlertSeverity = this.determineSeverityFromError(error);
      
      await this.createSystemAlert({
        type: 'system_error',
        severity,
        title: `用户功能异常：${feature}`,
        content: `用户 ${userInfo.name} (${userInfo.accountType}) 在使用 ${feature} 功能时遇到错误。\n\n错误详情：${error}\n\n时间：${new Date().toLocaleString('zh-CN')}\n\n用户ID：${userId}\n\n请尽快检查该功能状态，避免影响其他用户。`,
        targetRole: 'superAdmin',
        metadata: {
          userId,
          userInfo,
          feature,
          error,
          context,
          timestamp: new Date().toISOString(),
          type: 'user_facing_error'
        }
      });

      // 如果是高优先级错误，也通知老师
      if (severity === 'high' || severity === 'critical') {
        await this.createSystemAlert({
          type: 'system_error',
          severity: 'medium',
          title: `功能异常警告：${feature}`,
          content: `检测到 ${feature} 功能出现异常，可能影响正常使用。技术人员已收到通知并正在处理。\n\n如果您也遇到类似问题，请暂时避免使用该功能。`,
          targetRole: 'teacher'
        });
      }
    } catch (dbError) {
      console.error('Failed to record user facing error:', dbError);
    }
  }

  /**
   * 根据错误信息判断严重程度
   */
  private static determineSeverityFromError(error: string): AlertSeverity {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('database') || errorLower.includes('数据库') || 
        errorLower.includes('connection') || errorLower.includes('连接失败')) {
      return 'critical';
    }
    
    if (errorLower.includes('timeout') || errorLower.includes('超时') ||
        errorLower.includes('network') || errorLower.includes('网络')) {
      return 'high';
    }
    
    if (errorLower.includes('unauthorized') || errorLower.includes('forbidden') ||
        errorLower.includes('未授权') || errorLower.includes('权限')) {
      return 'medium';
    }
    
    return 'medium'; // 默认中等严重程度
  }

  /**
   * 清理过期的警报
   */
  static async cleanupExpiredAlerts(): Promise<void> {
    try {
      const now = new Date();
      
      // 删除过期的已处理警报（超过30天）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await prisma.adminMessage.deleteMany({
        where: {
          isProcessed: true,
          processedAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      // 自动处理过期的警报（超过7天未处理的低优先级警报）
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      await prisma.adminMessage.updateMany({
        where: {
          isProcessed: false,
          priority: 'low',
          createdAt: {
            lt: sevenDaysAgo
          }
        },
        data: {
          isProcessed: true,
          processedAt: now
        }
      });
    } catch (error) {
      console.error('Failed to cleanup expired alerts:', error);
    }
  }

  /**
   * 运行定期检查任务
   */
  static async runPeriodicChecks(): Promise<void> {
    console.log('Running periodic notification checks...');
    const startTime = new Date();
    
    try {
      // 处理用户提醒 - 动态导入避免客户端引用问题
      try {
        const { processAllUserReminders } = await import('@/lib/userReminders');
        const reminderCount = await processAllUserReminders();
        if (reminderCount > 0) {
          console.log(`创建了 ${reminderCount} 条用户提醒消息`);
        }
      } catch (error) {
        console.error('处理用户提醒失败:', error);
      }

      const [passwordResults, profileResults] = await Promise.all([
        this.checkPasswordExpiry(),
        this.checkProfileCompletion(),
        this.cleanupExpiredAlerts()
      ]);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // 检查完成后发送健康状态通知
      await this.sendHealthCheckNotification(true, {
        checkTime: startTime.toISOString(),
        duration: `${duration}ms`,
        passwordIssues: passwordResults?.issuesFound || 0,
        profileIssues: profileResults?.issuesFound || 0
      });
      
      console.log('Periodic notification checks completed successfully');
    } catch (error) {
      console.error('Periodic notification checks failed:', error);
      
      // 发送检查失败通知
      await this.sendHealthCheckNotification(false, {
        checkTime: startTime.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      await this.recordSystemError('PeriodicChecks', error instanceof Error ? error.message : 'Unknown error');
      
      // 额外发送一个给所有管理员和老师的系统异常通知
      await this.createSystemAlert({
        type: 'system_error',
        severity: 'high',
          title: '⚠️ 系统定期检查失败',
        content: `系统定期检查过程中发生异常，请检查系统状态。\n\n错误详情：${error instanceof Error ? error.message : 'Unknown error'}\n\n时间：${new Date().toLocaleString('zh-CN')}\n\n请联系技术人员排查问题。`,
          // 不设置特定用户，作为系统级广播（userId 留空）
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          checkType: 'periodic'
        }
      });
    }
  }

  /**
   * 发送系统健康检查通知
   */
  static async sendHealthCheckNotification(
    isHealthy: boolean, 
    details: Record<string, any>
  ): Promise<void> {
    try {
      if (isHealthy) {
        // 检查是否已有近期的健康检查通知（避免重复）
        const recentHealthCheck = await prisma.adminMessage.findFirst({
          where: {
            type: 'system_system_error',
            title: { contains: '系统健康检查完成' },
            createdAt: {
              gte: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3小时内
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        // 只在有问题或者没有近期健康检查通知时才发送
        if (!recentHealthCheck || details.passwordIssues > 0 || details.profileIssues > 0) {
          const hasIssues = (details.passwordIssues || 0) > 0 || (details.profileIssues || 0) > 0;
          const statusLine = hasIssues ? '系统状态：需要关注 ⚠️' : '系统状态：良好 ✨';
          const headline = hasIssues ? '✅ 系统健康检查完成（发现问题）' : '✅ 系统健康检查完成';
          const conclusion = hasIssues ? '请尽快处理上述问题项。' : '所有功能正常运行，无需额外操作。';
          await this.createSystemAlert({
            type: 'system_error', // 复用现有类型
            severity: hasIssues ? 'medium' : 'low',
            title: headline,
            content: `系统定期检查已完成。\n\n检查详情：\n- 检查时间：${new Date(details.checkTime).toLocaleString('zh-CN')}\n- 检查耗时：${details.duration}\n- 密码过期问题：${details.passwordIssues} 个\n- 信息不完整问题：${details.profileIssues} 个\n\n${statusLine}\n\n${conclusion}`,
          });
        }
        
        // 如果有严重问题，额外通知管理员和老师
        if (details.passwordIssues > 10 || details.profileIssues > 5) {
          await this.createSystemAlert({
            type: 'system_error',
            severity: 'medium',
            title: '⚠️ 系统检查发现问题',
            content: `系统检查发现较多问题需要关注：\n\n- 密码过期问题：${details.passwordIssues} 个\n- 信息不完整问题：${details.profileIssues} 个\n\n建议及时处理这些问题以确保系统安全。`,
            // 系统级广播
          });
        }
        
        // 不再给老师发送重复的健康检查通知，只在出现问题时通知
      } else {
        await this.createSystemAlert({
          type: 'system_error',
          severity: 'high',
          title: '⚠️ 系统健康检查失败',
          content: `系统定期检查过程中发生异常，请立即检查系统状态。\n\n错误详情：\n- 检查时间：${new Date(details.checkTime).toLocaleString('zh-CN')}\n- 错误信息：${details.error}\n\n建议立即联系技术人员排查问题。`,
          // 系统级广播
        });
      }
    } catch (error) {
      console.error('Failed to send health check notification:', error);
    }
  }

  /**
   * 获取用户可见的通知
   */
  static async getUserVisibleNotifications(
    userId: string,
    userRole: 'superAdmin' | 'admin' | 'teacher' | 'student'
  ): Promise<any[]> {
    try {
      const whereConditions: any = {
        isRead: false
      };

      // 根据用户角色过滤通知
      if (userRole === 'student') {
        // 学生只看与自己相关的消息；不展示管理员层级广播（teacher_* / student_*）
        whereConditions.OR = [
          { userId },
          { userId: null, type: { notIn: ['teacher_password_required','teacher_password_expired','teacher_profile_incomplete','student_password_required','student_password_expired','student_profile_incomplete'] } }
        ];
      } else if (userRole === 'superAdmin') {
        // 超级管理员不接收普通用户（student/self）的密码/资料提醒；接收老师的
        whereConditions.OR = [
          { userId },
          { userId: null, type: { in: [
            'system_api_failure','system_system_error','deepseek_quota_limit','weather_api_limit',
            'teacher_password_required','teacher_password_expired','teacher_profile_incomplete'
          ] } }
        ];
      } else if (userRole === 'teacher') {
        // 老师接收所有学生用户的密码/资料提醒广播 + 系统异常类
        whereConditions.OR = [
          { userId },
          { userId: null, type: { in: [
            'system_api_failure','system_system_error','deepseek_quota_limit','weather_api_limit',
            'student_password_required','student_password_expired','student_profile_incomplete'
          ] } }
        ];
      } else {
        // 管理员：与老师相同的系统异常类，但不需要学生广播（保守处理，可按需要加入）
        whereConditions.OR = [
          { userId },
          { userId: null, type: { in: [
            'system_api_failure','system_system_error','deepseek_quota_limit','weather_api_limit'
          ] } }
        ];
      }

      const notifications = await prisma.adminMessage.findMany({
        where: whereConditions,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 50 // 限制数量避免性能问题
      });

      return notifications;
    } catch (error) {
      console.error('Failed to get user visible notifications:', error);
      return [];
    }
  }
}

// 导出实用工具函数
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
      'deepseek_quota_limit': { label: 'AI配额限制', icon: '🤖' },
      'weather_api_limit': { label: '天气API限制', icon: '🌤️' },
      'general': { label: '一般通知', icon: '📢' }
    };
    return typeMap[type] || { label: '系统通知', icon: '📋' };
  }
};
