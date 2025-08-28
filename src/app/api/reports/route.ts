import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateUserActivity } from '@/lib/userActivity';

// 创建举报
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const userId = decoded.sub;
    const body = await req.json();
    const { postId, reason, description } = body;

    if (!postId || !reason) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证帖子是否存在
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false }
    });

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 检查用户是否已经举报过该帖子
    const existingReport = await prisma.report.findFirst({
      where: {
        postId,
        reporterId: userId
      }
    });

    if (existingReport) {
      return NextResponse.json({ error: '您已经举报过该帖子' }, { status: 400 });
    }

    // 不能举报自己的帖子
    if (post.userId === userId) {
      return NextResponse.json({ error: '不能举报自己的帖子' }, { status: 400 });
    }

    // 创建举报记录
    const report = await prisma.report.create({
      data: {
        postId,
        reporterId: userId,
        reason,
        description: description || null
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            user: {
              select: { id: true, name: true, nickname: true }
            }
          }
        },
        reporter: {
          select: { id: true, name: true, nickname: true }
        }
      }
    });

    // 发送通知给老师和超级管理员
    const adminUsers = await prisma.user.findMany({
      where: {
        OR: [
          { isAdmin: true },
          { isSuperAdmin: true },
          { accountType: 'teacher' }
        ]
      },
      select: { id: true }
    });

    const notifications = adminUsers.map(admin => ({
      receiverId: admin.id,
      type: 'report_submitted',
      title: '新的举报',
      content: `用户 ${report.reporter.nickname || report.reporter.name} 举报了帖子："${report.post.title}"，理由：${reason}`,
      relatedPostId: postId,
      priority: 'high'
    }));

    await prisma.userMessage.createMany({
      data: notifications
    });

    // 更新用户活动
    await updateUserActivity(userId);

    return NextResponse.json({
      success: true,
      message: '举报已提交，我们会尽快处理',
      reportId: report.id
    });

  } catch (error) {
    console.error('创建举报失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 获取举报列表（管理员专用）
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const userId = decoded.sub;

    // 验证是否为管理员
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true, isSuperAdmin: true, accountType: true }
    });

    if (!user || (!user.isAdmin && !user.isSuperAdmin && user.accountType !== 'teacher')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 获取举报列表
    const reports = await prisma.report.findMany({
      where: status === 'all' ? {} : { status },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            isDeleted: true,
            user: {
              select: { id: true, name: true, nickname: true, accountType: true }
            }
          }
        },
        reporter: {
          select: { id: true, name: true, nickname: true, accountType: true }
        },
        reviewer: {
          select: { id: true, name: true, nickname: true }
        }
      }
    });

    // 获取总数
    const total = await prisma.report.count({
      where: status === 'all' ? {} : { status }
    });

    // 更新用户活动
    await updateUserActivity(userId);

    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取举报列表失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
