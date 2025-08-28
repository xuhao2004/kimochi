import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 检测用户是否需要提醒
export async function checkUserReminders(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        studentId: true,
        name: true,
        passwordHash: true,
        accountType: true,
        hasUpdatedProfile: true,
        createdAt: true,
        updatedAt: true,
        nickname: true,
        gender: true,
        birthDate: true,
        className: true,
        personalEmail: true,
        securityEmail: true,
        securityEmailExempt: true,
        college: true,
        major: true,
        office: true,
        contactPhone: true,
        isSuperAdmin: true
      }
    });

    if (!user) return null;

    const reminders = [];

    // 1. 检查是否使用默认密码 - 所有用户都需要检查
    const defaultPassword = 'kimochi@2025';
    const isUsingDefaultPassword = await bcrypt.compare(defaultPassword, user.passwordHash);

    if (isUsingDefaultPassword) {
      // 加强去重检查：包括已读和未读的通知
      const existingPasswordReminder = await prisma.adminMessage.findFirst({
        where: {
          userId: user.id,
          type: 'system_password_required',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时内已创建过的不重复创建
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!existingPasswordReminder) {
        reminders.push({
          type: 'system_password_required',
          title: '密码安全提醒',
          content: `您好 ${user.name}，检测到您正在使用默认密码 "kimochi@2025"。为了账户安全，请立即修改密码。`,
          priority: 'urgent'
        });
      }
    }

    // 2. 检查密码是否超过60天未修改 - 所有用户都检查
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    if (new Date(user.updatedAt || user.createdAt) < sixtyDaysAgo) {
      // 加强去重检查：7天内不重复发送相同类型的提醒
      const existingPasswordExpired = await prisma.adminMessage.findFirst({
        where: {
          userId: user.id,
          type: 'system_password_expired',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天内已创建过的不重复创建
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!existingPasswordExpired) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(user.updatedAt || user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        reminders.push({
          type: 'system_password_expired',
          title: '密码已过期',
          content: `您好 ${user.name}，您的密码已超过60天未修改（${daysSinceUpdate}天）。为了账户安全，请立即修改密码。`,
          priority: 'high'
        });
      }
    }

    // 3. 检查个人信息完善情况（含密保邮箱）
    const isProfileIncomplete = checkProfileCompleteness(user);
    
    if (isProfileIncomplete.needsUpdate) {
      // 加强去重检查：3天内不重复发送个人信息完善提醒
      const existingProfileReminder = await prisma.adminMessage.findFirst({
        where: {
          userId: user.id,
          type: 'system_profile_incomplete',
          createdAt: {
            gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3天内已创建过的不重复创建
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!existingProfileReminder) {
        reminders.push({
          type: 'system_profile_incomplete',
          title: '完善个人信息',
          content: `您好 ${user.name}，您的个人信息还不完整。请完善以下信息：${isProfileIncomplete.missingFields.join('、')}。完整的个人信息有助于为您提供更好的服务。`,
          priority: 'normal'
        });
      }
    }

    // 4. 强制密保邮箱提醒（紧急）：每24小时一次
    if (!user.securityEmail && !user.securityEmailExempt) {
      const existingSecEmail = await prisma.adminMessage.findFirst({
        where: {
          userId: user.id,
          type: 'system_security_email_required',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (!existingSecEmail) {
        reminders.push({
          type: 'system_security_email_required',
          title: '请尽快设置密保邮箱',
          content: `您好 ${user.name}，为了保障账号安全，请尽快设置密保邮箱并完成验证。设置后方可进行修改密码、绑定微信等敏感操作。`,
          priority: 'urgent'
        });
      }
    }

    return reminders;
  } catch (error) {
    console.error('检查用户提醒失败:', error);
    return null;
  }
}

// 检查个人信息完善程度 - 检查所有可能的字段
function checkProfileCompleteness(user: any) {
  const missingFields = [];
  let needsUpdate = false;

  // 所有用户都需要检查的基本字段
  if (!user.nickname) missingFields.push('昵称');
  if (!user.gender) missingFields.push('性别');
  if (!user.birthDate) missingFields.push('生日');
  if (!user.personalEmail) missingFields.push('个人邮箱');
  if (!user.securityEmail && !user.securityEmailExempt) missingFields.push('密保邮箱');

  // 根据用户类型检查特定字段
  if (user.accountType === 'student') {
    if (!user.className) missingFields.push('班级');
    if (!user.college) missingFields.push('学院');
    if (!user.major) missingFields.push('专业');
  }

  if (user.accountType === 'teacher' || user.accountType === 'admin' || user.isSuperAdmin) {
    if (!user.office) missingFields.push('办公室');
    if (!user.contactPhone) missingFields.push('联系电话');
  } else if (user.accountType === 'self') {
    // 自助注册用户也需要联系电话，但避免重复添加
    if (!user.contactPhone) missingFields.push('联系电话');
  }

  // 如果有任何字段缺失，则需要更新
  if (missingFields.length > 0) {
    needsUpdate = true;
  }

  return { needsUpdate, missingFields };
}

// 创建提醒消息
export async function createReminderMessage(userId: string, reminder: any) {
  try {
    // 再次检查是否存在相同类型的提醒，防止并发创建
    const timeRanges = {
      'system_password_required': 24 * 60 * 60 * 1000, // 24小时
      'system_password_expired': 7 * 24 * 60 * 60 * 1000, // 7天
      'system_profile_incomplete': 3 * 24 * 60 * 60 * 1000 // 3天
    } as const;

    const timeRange = timeRanges[reminder.type as keyof typeof timeRanges] || 24 * 60 * 60 * 1000;

    // 基于时间窗口的幂等ID，彻底避免并发导致的重复
    const bucketStart = Math.floor(Date.now() / timeRange) * timeRange;
    const deterministicId = `rem-${reminder.type}-${userId}-${bucketStart}`;

    // 乐观创建，若重复则忽略
    try {
      await prisma.adminMessage.create({
        data: {
          id: deterministicId,
          type: reminder.type,
          title: reminder.title,
          content: reminder.content,
          userId: userId,
          priority: reminder.priority,
          isRead: false
        }
      });
      console.log(`成功创建提醒: ${reminder.type} for user ${userId}`);

      // 创建广播型提醒（用于层级可见性）
      const originUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, accountType: true, isSuperAdmin: true, name: true }
      });
      if (originUser && (reminder.type === 'system_password_required' || reminder.type === 'system_password_expired' || reminder.type === 'system_profile_incomplete')) {
        await createRoleBroadcastReminder(originUser, reminder.type);
      }
    } catch (err: any) {
      // 如果同窗口内已存在相同ID，忽略错误（实现幂等）
      if (err && (err.code === 'P2002' || String(err.message || '').includes('Unique constraint'))) {
        console.log(`跳过创建重复提醒(幂等): ${reminder.type} for user ${userId}`);
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('创建提醒消息失败:', error);
  }
}

// 为分层接收者创建广播型管理员消息（不关联具体userId）
async function createRoleBroadcastReminder(originUser: { id: string; accountType: string; isSuperAdmin?: boolean; name?: string }, baseType: 'system_password_required' | 'system_password_expired' | 'system_profile_incomplete') {
  // 确定广播目标角色与消息类型前缀
  let rolePrefix: 'teacher' | 'student' | null = null;

  if (originUser.isSuperAdmin) {
    // 超级管理员自身不需要广播给上级
    return;
  }

  if (originUser.accountType === 'teacher') {
    rolePrefix = 'teacher'; // 广播给超级管理员查看老师相关
  } else if (originUser.accountType === 'student') {
    rolePrefix = 'student'; // 广播给老师查看学生相关
  } else {
    // self/admin 等暂不广播
    return;
  }

  const timeRanges = {
    'system_password_required': 24 * 60 * 60 * 1000,
    'system_password_expired': 7 * 24 * 60 * 60 * 1000,
    'system_profile_incomplete': 3 * 24 * 60 * 60 * 1000
  } as const;
  const timeRange = timeRanges[baseType];
  const bucketStart = Math.floor(Date.now() / timeRange) * timeRange;
  const broadcastType = `${rolePrefix}_${baseType.replace('system_', '')}`; // e.g. teacher_profile_incomplete
  const id = `rem-broadcast-${broadcastType}-${originUser.id}-${bucketStart}`;

  const titleMap: Record<string, string> = {
    'teacher_password_required': '老师默认密码提醒',
    'teacher_password_expired': '老师密码过期提醒',
    'teacher_profile_incomplete': '老师资料不完整提醒',
    'student_password_required': '学生默认密码提醒',
    'student_password_expired': '学生密码过期提醒',
    'student_profile_incomplete': '学生资料不完整提醒'
  };

  const content = `${originUser.name ? originUser.name + ' ' : ''}(${originUser.accountType}) 触发了${titleMap[broadcastType] || '资料/密码'}。`;

  try {
    await prisma.adminMessage.create({
      data: {
        id,
        type: broadcastType,
        title: titleMap[broadcastType] || '用户提醒',
        content,
        userId: null,
        priority: baseType === 'system_password_required' ? 'urgent' : (baseType === 'system_password_expired' ? 'high' : 'normal'),
        isRead: false
      }
    });
  } catch (err: any) {
    if (err && (err.code === 'P2002' || String(err.message || '').includes('Unique constraint'))) {
      // 并发重复忽略
      return;
    }
    console.error('创建广播提醒失败:', err);
  }
}

// 批量处理用户提醒
export async function processUserReminders(userId: string) {
  const reminders = await checkUserReminders(userId);
  
  if (reminders && reminders.length > 0) {
    for (const reminder of reminders) {
      await createReminderMessage(userId, reminder);
    }
    return reminders.length;
  }
  
  return 0;
}

// 检查并处理所有需要提醒的用户
export async function processAllUserReminders() {
  try {
    // 获取所有用户 - 检查密码和信息完善情况
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    let totalReminders = 0;
    
    for (const user of users) {
      const reminderCount = await processUserReminders(user.id);
      totalReminders += reminderCount;
    }

    return totalReminders;
  } catch (error) {
    console.error('批量处理用户提醒失败:', error);
    return 0;
  }
}

// 标记系统通知为已完成（当用户完成相应操作时调用）
export async function markSystemNotificationCompleted(userId: string, type: 'system_password_required' | 'system_password_expired' | 'system_profile_incomplete') {
  try {
    await prisma.adminMessage.deleteMany({
      where: {
        userId: userId,
        type: type
      }
    });
  } catch (error) {
    console.error('移除系统通知失败:', error);
  }
}
