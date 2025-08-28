import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 获取当前用户的站内消息
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isRead = searchParams.get('isRead'); // 'true', 'false', 或 null（全部）
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeAdmin = (searchParams.get('includeAdmin') ?? 'true') !== 'false';
    const priorityFilter = searchParams.get('priority'); // 'low' | 'normal' | 'high' | 'urgent'
    const typeFilter = searchParams.get('type'); // 具体类型
    const sourceFilter = searchParams.get('source'); // 'user' | 'admin'
    const sortField = searchParams.get('sortField') || 'createdAt'; // 'createdAt' | 'priority'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const where: any = {
      receiverId: decoded.sub // 改为使用 receiverId
    };
    
    if (isRead !== null) where.isRead = isRead === 'true';

    // 获取新的 UserMessage 表中的消息
    const userWhere: any = { ...where };
    if (priorityFilter) userWhere.priority = priorityFilter;
    if (typeFilter) userWhere.type = typeFilter;
    const userMessages = await prisma.userMessage.findMany({
      where: userWhere,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            nickname: true,
            accountType: true
          }
        }
      },
      orderBy: sortField === 'priority' ? [ { priority: 'desc' }, { createdAt: 'desc' } ] : [ { createdAt: sortOrder } ],
      skip: (page - 1) * limit,
      take: limit
    });

    let adminMessages: any[] = [];
    if (includeAdmin) {
      // 获取用户角色以确定可见的广播型管理员消息
      const currentUser = await prisma.user.findUnique({ where: { id: decoded.sub } });
      const isSuper = !!currentUser?.isSuperAdmin;
      const isTeacher = currentUser?.accountType === 'teacher';
      const isAdmin = currentUser?.accountType === 'admin';

      const orConds: any[] = [ { userId: decoded.sub } ];
      // 广播型管理员消息（userId=null）按角色口径纳入
      const baseSystemTypes = ['system_api_failure','system_system_error','deepseek_quota_limit','weather_api_limit'];
      if (isSuper) {
        orConds.push({ userId: null, type: { in: [...baseSystemTypes, 'teacher_password_required','teacher_password_expired','teacher_profile_incomplete','account_change_request','security_email_change_request'] } });
      } else if (isTeacher) {
        orConds.push({ userId: null, type: { in: [...baseSystemTypes, 'student_password_required','student_password_expired','student_profile_incomplete'] } });
      } else if (isAdmin) {
        orConds.push({ userId: null, type: { in: [...baseSystemTypes, 'account_change_request','security_email_change_request'] } });
      }

      const adminWhere: any = { OR: orConds };
      if (isRead !== null) adminWhere.isRead = isRead === 'true';
      if (priorityFilter) adminWhere.priority = priorityFilter;
      if (typeFilter) adminWhere.type = typeFilter;

      adminMessages = await prisma.adminMessage.findMany({
        where: adminWhere,
        orderBy: sortField === 'priority' ? [ { priority: 'desc' }, { createdAt: 'desc' } ] : [ { createdAt: sortOrder } ],
        skip: (page - 1) * limit,
        take: limit
      });
    }

    // 合并两种消息并按时间排序，确保没有重复
    const messageMap = new Map<string, any>();
    
    // 首先添加用户消息
    userMessages.forEach(msg => {
      messageMap.set(`user_${msg.id}`, {
        id: msg.id,
        type: msg.type,
        title: msg.title,
        content: msg.content,
        priority: msg.priority,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        sender: msg.sender,
        relatedPostId: msg.relatedPostId,
        relatedCommentId: msg.relatedCommentId,
        source: 'user_message'
      });
    });
    
    // 然后添加管理员消息，使用不同的key避免冲突
    adminMessages.forEach(msg => {
      messageMap.set(`admin_${msg.id}`, {
        id: msg.id,
        type: msg.type,
        title: msg.title,
        content: msg.content,
        priority: msg.priority,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        source: 'admin_message'
      });
    });

    let allMessages = Array.from(messageMap.values());
    // 可选源过滤
    if (sourceFilter === 'user') {
      allMessages = allMessages.filter(m => m.source === 'user_message');
    } else if (sourceFilter === 'admin') {
      allMessages = allMessages.filter(m => m.source === 'admin_message');
    }
    // 排序
    if (sortField === 'priority') {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 } as const;
      allMessages.sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
        if (aPriority !== bPriority) return bPriority - aPriority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      allMessages.sort((a, b) => sortOrder === 'desc' 
        ? (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      );
    }

    const messages = allMessages.slice((page - 1) * limit, page * limit);

    // 统计总数与未读数 - 与查询条件保持一致
    const userTotal = await prisma.userMessage.count({ where: userWhere });
    // 管理员消息的总数以已合并的列表为准，避免与不同可见性规则不一致造成的偏差
    const total = userTotal + (includeAdmin ? adminMessages.length : 0);

    const userUnreadCount = await prisma.userMessage.count({ where: { receiverId: decoded.sub, isRead: false } });
    // 构建与角色一致的未读条件
    let adminUnreadCount = 0;
    if (includeAdmin) {
      const currentUser = await prisma.user.findUnique({ where: { id: decoded.sub } });
      const isSuper = !!currentUser?.isSuperAdmin;
      const isTeacher = currentUser?.accountType === 'teacher';
      const isAdmin = currentUser?.accountType === 'admin';
      const baseSystemTypes = ['system_api_failure','system_system_error','deepseek_quota_limit','weather_api_limit'];
      const orConds: any[] = [ { userId: decoded.sub } ];
      if (isSuper) {
        orConds.push({ userId: null, type: { in: [...baseSystemTypes, 'teacher_password_required','teacher_password_expired','teacher_profile_incomplete','account_change_request','security_email_change_request'] } });
      } else if (isTeacher) {
        orConds.push({ userId: null, type: { in: [...baseSystemTypes, 'student_password_required','student_password_expired','student_profile_incomplete'] } });
      } else if (isAdmin) {
        orConds.push({ userId: null, type: { in: [...baseSystemTypes, 'account_change_request','security_email_change_request'] } });
      }
      adminUnreadCount = await prisma.adminMessage.count({ where: { OR: orConds, isRead: false } });
    }
    const unreadCount = userUnreadCount + adminUnreadCount;

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });

  } catch (error) {
    console.error('获取用户消息失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 标记用户消息为已读
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const { messageIds, markAllAsRead, messageType } = await request.json();

    if (markAllAsRead) {
      // 标记用户所有消息为已读 - 同时处理两种类型的消息
      await Promise.all([
        // 更新 UserMessage 表
        prisma.userMessage.updateMany({
          where: { 
            receiverId: decoded.sub,
            isRead: false 
          },
          data: { 
            isRead: true, 
            readAt: new Date() 
          }
        }),
        // 更新 AdminMessage 表（保持兼容性）
        prisma.adminMessage.updateMany({
          where: { 
            userId: decoded.sub,
            isRead: false 
          },
          data: { 
            isRead: true, 
            readAt: new Date() 
          }
        })
      ]);
    } else if (messageIds && Array.isArray(messageIds)) {
      // 标记指定消息为已读
      for (const messageId of messageIds) {
        // 根据 messageType 或尝试两种表
        if (messageType === 'user_message') {
          await prisma.userMessage.updateMany({
            where: { 
              id: messageId,
              receiverId: decoded.sub,
              isRead: false 
            },
            data: { 
              isRead: true, 
              readAt: new Date() 
            }
          });
        } else if (messageType === 'admin_message') {
          await prisma.adminMessage.updateMany({
            where: { 
              id: messageId,
              userId: decoded.sub,
              isRead: false 
            },
            data: { 
              isRead: true, 
              readAt: new Date() 
            }
          });
        } else {
          // 如果没有指定类型，先尝试 UserMessage，再尝试 AdminMessage
          const userResult = await prisma.userMessage.updateMany({
            where: { 
              id: messageId,
              receiverId: decoded.sub,
              isRead: false 
            },
            data: { 
              isRead: true, 
              readAt: new Date() 
            }
          });
          
          // 如果 UserMessage 表中没有找到，再尝试 AdminMessage 表
          if (userResult.count === 0) {
            await prisma.adminMessage.updateMany({
              where: { 
                id: messageId,
                userId: decoded.sub,
                isRead: false 
              },
              data: { 
                isRead: true, 
                readAt: new Date() 
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ message: "消息状态已更新" });

  } catch (error) {
    console.error('更新用户消息状态失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 删除用户消息
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const { messageIds, deleteAll } = await request.json();

    if (deleteAll) {
      // 删除用户的所有消息
      const [userResult, adminResult] = await Promise.all([
        // 删除 UserMessage 表中的消息
        prisma.userMessage.deleteMany({
          where: { receiverId: decoded.sub }
        }),
        // 删除 AdminMessage 表中的消息（保持兼容性）
        prisma.adminMessage.deleteMany({
          where: { userId: decoded.sub }
        })
      ]);

      const totalDeleted = userResult.count + adminResult.count;
      return NextResponse.json({ 
        message: `已删除所有消息，共 ${totalDeleted} 条` 
      });
    } else if (messageIds && Array.isArray(messageIds)) {
      // 删除指定的消息
      let totalDeleted = 0;

      for (const messageId of messageIds) {
        // 先尝试从 UserMessage 表删除
        const userResult = await prisma.userMessage.deleteMany({
          where: { 
            id: messageId,
            receiverId: decoded.sub
          }
        });
        
        totalDeleted += userResult.count;

        // 如果 UserMessage 表中没有找到，再尝试从 AdminMessage 表删除
        if (userResult.count === 0) {
          const adminResult = await prisma.adminMessage.deleteMany({
            where: { 
              id: messageId,
              userId: decoded.sub
            }
          });
          totalDeleted += adminResult.count;
        }
      }

      return NextResponse.json({ 
        message: `已删除 ${totalDeleted} 条消息` 
      });
    } else {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

  } catch (error) {
    console.error('删除用户消息失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
