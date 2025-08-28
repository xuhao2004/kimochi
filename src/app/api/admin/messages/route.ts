import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 管理员获取站内消息
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证管理员权限（包括超级管理员、管理员和老师）
    const admin = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin && admin.accountType !== 'teacher')) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isRead = searchParams.get('isRead'); // 'true', 'false', 或 null（全部）
    const priority = searchParams.get('priority'); // 'low', 'normal', 'high', 'urgent'
    const type = searchParams.get('type'); // 过滤类型
    const severity = searchParams.get('severity'); // 严重程度过滤
    const processed = searchParams.get('processed'); // 处理状态过滤
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    
    // 基于用户角色过滤消息
    if (admin.isSuperAdmin) {
      // 超级管理员：不接收普通用户（student/self）密码/资料提醒；接收老师的 + 系统异常类
      where.OR = [
        { userId: admin.id },
        { userId: null, type: { in: [
          'system_api_failure','system_system_error','deepseek_quota_limit','weather_api_limit',
          'teacher_password_required','teacher_password_expired','teacher_profile_incomplete',
          'account_change_request','security_email_change_request'
        ] } }
      ];
    } else if (admin.accountType === 'teacher') {
      // 老师：接收所有学生用户密码/资料提醒广播 + 系统异常类
      where.OR = [
        { userId: admin.id },
        { userId: null, type: { in: [
          'system_api_failure','system_system_error','deepseek_quota_limit','weather_api_limit',
          'student_password_required','student_password_expired','student_profile_incomplete'
        ] } }
      ];
    } else if (admin.accountType === 'admin') {
      // 普通管理员：仅系统异常类 + 自己的
      where.OR = [
        { userId: admin.id },
        { userId: null, type: { in: [
          'system_api_failure','system_system_error','deepseek_quota_limit','weather_api_limit',
          'account_change_request','security_email_change_request'
        ] } }
      ];
    }
    
    if (isRead !== null) where.isRead = isRead === 'true';
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (processed !== null) where.isProcessed = processed === 'true';

    const messages = await prisma.adminMessage.findMany({
      where,
      orderBy: [
        { isProcessed: 'asc' }, // 未处理的在前
        { isRead: 'asc' },      // 未读的在前
        { priority: 'desc' },   // 优先级高的在前
        { createdAt: 'desc' }   // 时间新的在前
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    const total = await prisma.adminMessage.count({ where });

    // 获取统计信息（基于用户可见的消息范围）
    const statsWhere = admin.isSuperAdmin ? {
      OR: [
        { userId: admin.id },
        { userId: null, type: { in: [
          'system_api_failure','system_system_error','deepseek_quota_limit','weather_api_limit',
          'teacher_password_required','teacher_password_expired','teacher_profile_incomplete'
        ] } }
      ]
    } : where;
    
    // 系统警报统计范围修正
    const isSuper = admin.isSuperAdmin;
    const isTeacher = admin.accountType === 'teacher';
    const alertTypes: string[] = ['system_api_failure','system_system_error'];
    if (isSuper) {
      alertTypes.push('teacher_password_required','teacher_password_expired','teacher_profile_incomplete');
    } else if (isTeacher) {
      alertTypes.push('student_password_required','student_password_expired','student_profile_incomplete');
    }

    const statistics = {
      total: await prisma.adminMessage.count({ where: statsWhere }),
      unread: await prisma.adminMessage.count({ where: { ...statsWhere, isRead: false } }),
      read: await prisma.adminMessage.count({ where: { ...statsWhere, isRead: true } }),
      unprocessed: await prisma.adminMessage.count({ where: { ...statsWhere, isProcessed: false } }),
      processed: await prisma.adminMessage.count({ where: { ...statsWhere, isProcessed: true } }),
      
      urgent: await prisma.adminMessage.count({ where: { ...statsWhere, priority: 'urgent', isProcessed: false } }),
      high: await prisma.adminMessage.count({ where: { ...statsWhere, priority: 'high', isProcessed: false } }),
      normal: await prisma.adminMessage.count({ where: { ...statsWhere, priority: 'normal', isProcessed: false } }),
      low: await prisma.adminMessage.count({ where: { ...statsWhere, priority: 'low', isProcessed: false } }),
      
      // 系统警报：按角色口径统计“剩余未处理”的系统警报
      // 超级管理员：老师广播(teacher_*) + 自身(system_password_*, system_profile_*) + 系统异常/检测(system_*)
      // 老师：学生广播(student_*) + 自身(system_password_*, system_profile_*) + 系统异常/检测(system_*)
      // 普通管理员：admin 仅统计系统异常/检测(system_*)
      systemAlerts: await prisma.adminMessage.count({
        where: {
          isProcessed: false,
          OR: [
            // 广播型（基于角色）
            { userId: null, type: { in: alertTypes } },
            // 个人系统安全类（仅对超管/老师计入）
            ...(isSuper || isTeacher ? [
              { userId: admin.id, type: { in: ['system_password_required','system_password_expired','system_profile_incomplete'] } }
            ] : [])
          ]
        }
      }),

      // 密码过期统计（剩余未处理）
      passwordExpired: await prisma.adminMessage.count({
        where: {
          isProcessed: false,
          OR: [
            ...(isSuper ? [{ userId: null, type: 'teacher_password_expired' } as const] : []),
            ...(isTeacher ? [{ userId: null, type: 'student_password_expired' } as const] : []),
            ...(isSuper || isTeacher ? [{ userId: admin.id, type: 'system_password_expired' } as const] : [])
          ]
        }
      }),

      // 信息不完整统计（剩余未处理）
      profileIncomplete: await prisma.adminMessage.count({
        where: {
          isProcessed: false,
          OR: [
            ...(isSuper ? [{ userId: null, type: 'teacher_profile_incomplete' } as const] : []),
            ...(isTeacher ? [{ userId: null, type: 'student_profile_incomplete' } as const] : []),
            ...(isSuper || isTeacher ? [{ userId: admin.id, type: 'system_profile_incomplete' } as const] : [])
          ]
        }
      }),

      apiFailures: await prisma.adminMessage.count({ where: { userId: null, type: 'system_api_failure', isProcessed: false } }),
      systemErrors: await prisma.adminMessage.count({ where: { userId: null, type: 'system_system_error', isProcessed: false } }),
      deepseekAlerts: await prisma.adminMessage.count({ where: { userId: null, type: 'deepseek_quota_limit', isProcessed: false } }),
      weatherAlerts: await prisma.adminMessage.count({ where: { userId: null, type: 'weather_api_limit', isProcessed: false } })
    };

    return NextResponse.json({
      messages,
      statistics,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取管理员消息失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 标记消息为已读
export async function PUT(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证管理员权限（包括超级管理员、管理员和老师）
    const admin = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin && admin.accountType !== 'teacher')) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { messageIds, markAllAsRead } = await req.json();

    if (markAllAsRead) {
      // 标记所有消息为已读
      await prisma.adminMessage.updateMany({
        where: { isRead: false },
        data: { 
          isRead: true, 
          readAt: new Date() 
        }
      });
    } else if (messageIds && Array.isArray(messageIds)) {
      // 标记指定消息为已读
      await prisma.adminMessage.updateMany({
        where: { 
          id: { in: messageIds },
          isRead: false 
        },
        data: { 
          isRead: true, 
          readAt: new Date() 
        }
      });
    }

    return NextResponse.json({ message: "消息状态已更新" });

  } catch (error) {
    console.error('更新消息状态失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 标记消息为已处理
export async function PATCH(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证管理员权限（包括超级管理员、管理员和老师）
    const admin = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin && admin.accountType !== 'teacher')) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { messageIds, markAllAsProcessed } = await req.json();

    if (markAllAsProcessed) {
      // 标记所有消息为已处理
      await prisma.adminMessage.updateMany({
        where: { isProcessed: false },
        data: { 
          isProcessed: true, 
          processedAt: new Date() 
        }
      });
    } else if (messageIds && Array.isArray(messageIds)) {
      // 标记指定消息为已处理
      await prisma.adminMessage.updateMany({
        where: { 
          id: { in: messageIds },
          isProcessed: false 
        },
        data: { 
          isProcessed: true, 
          processedAt: new Date() 
        }
      });
    }

    return NextResponse.json({ message: "消息已标记为已处理" });

  } catch (error) {
    console.error('标记消息已处理失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 删除消息
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证管理员权限（包括超级管理员、管理员和老师）
    const admin = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin && admin.accountType !== 'teacher')) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { messageIds, clearAll } = await req.json();

    if (clearAll) {
      // 清空所有消息 - 只有超级管理员可以执行
      if (!admin.isSuperAdmin) {
        return NextResponse.json({ error: "仅超级管理员可清空所有消息" }, { status: 403 });
      }

      // 删除所有AdminMessage
      const deletedCount = await prisma.adminMessage.deleteMany({});
      
      return NextResponse.json({ 
        message: `已清空所有通知，删除了 ${deletedCount.count} 条消息` 
      });
    } else if (messageIds && Array.isArray(messageIds)) {
      // 删除指定的消息
      const deletedCount = await prisma.adminMessage.deleteMany({
        where: { id: { in: messageIds } }
      });
      
      return NextResponse.json({ 
        message: `已删除 ${deletedCount.count} 条消息` 
      });
    } else {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

  } catch (error) {
    console.error('删除消息失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
