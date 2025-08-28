import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateUserActivity } from '@/lib/userActivity';

// 审核举报
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  let userId: string | undefined;
  let reportId: string | undefined;
  
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    userId = decoded.sub;
    const awaitedParams = await params;
    reportId = awaitedParams.reportId;

    // 验证是否为管理员
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true, isSuperAdmin: true, accountType: true, name: true, nickname: true }
    });

    if (!user || (!user.isAdmin && !user.isSuperAdmin && user.accountType !== 'teacher')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await req.json();
    const { action, reviewNote } = body; // action: 'dismiss' | 'resolve'

    if (!action || !['dismiss', 'resolve'].includes(action)) {
      return NextResponse.json({ error: '无效的审核操作' }, { status: 400 });
    }

    // 获取举报信息
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        post: {
          include: {
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

    if (!report) {
      return NextResponse.json({ error: '举报不存在' }, { status: 404 });
    }

    if (report.status !== 'pending') {
      return NextResponse.json({ error: '该举报已被处理' }, { status: 400 });
    }

    const reviewerName = user.nickname || user.name;

    if (action === 'resolve') {
      // 确认违规，删除帖子
      await prisma.$transaction(async (tx) => {
        // 软删除帖子
        await tx.post.update({
          where: { id: report.postId },
          data: {
            isDeleted: true,
            deletedBy: userId,
            deletedAt: new Date()
          }
        });

        // 更新举报状态
        await tx.report.update({
          where: { id: reportId },
          data: {
            status: 'resolved',
            reviewerId: userId,
            reviewNote,
            reviewedAt: new Date()
          }
        });

        // 通知举报者：审核通过
        await tx.userMessage.create({
          data: {
            receiverId: report.reporterId,
            type: 'report_resolved',
            title: '举报审核通过',
            content: `您举报的帖子"${report.post.title}"经审核确认违规，已被删除。感谢您的监督！`,
            relatedPostId: report.postId,
            priority: 'normal'
          }
        });

        // 通知被举报者：帖子被删除
        await tx.userMessage.create({
          data: {
            receiverId: report.post.userId,
            type: 'post_deleted_violation',
            title: '您的帖子已被删除',
            content: `您发布的帖子"${report.post.title}"因违规被删除。违规理由：${report.reason}${reviewNote ? `\n审核备注：${reviewNote}` : ''}。请注意言行规范。`,
            relatedPostId: report.postId,
            priority: 'high'
          }
        });
      });

      await updateUserActivity(userId);

      return NextResponse.json({
        success: true,
        message: '举报审核完成，帖子已删除',
        action: 'resolved'
      });

    } else if (action === 'dismiss') {
      // 驳回举报
      await prisma.$transaction(async (tx) => {
        // 更新举报状态
        await tx.report.update({
          where: { id: reportId },
          data: {
            status: 'dismissed',
            reviewerId: userId,
            reviewNote,
            reviewedAt: new Date()
          }
        });

        // 通知举报者：举报被驳回
        await tx.userMessage.create({
          data: {
            receiverId: report.reporterId,
            type: 'report_dismissed',
            title: '举报审核结果',
            content: `您举报的帖子"${report.post.title}"经审核未发现异常，暂不删除。${reviewNote ? `审核备注：${reviewNote}` : ''}`,
            relatedPostId: report.postId,
            priority: 'normal'
          }
        });
      });

      await updateUserActivity(userId);

      return NextResponse.json({
        success: true,
        message: '举报已驳回',
        action: 'dismissed'
      });
    }

  } catch (error) {
    console.error('审核举报失败:', error);
    console.error('错误详情:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      reportId,
      userId
    });
    return NextResponse.json({ 
      error: '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    }, { status: 500 });
  }
}

// 获取单个举报详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  let userId: string | undefined;
  let reportId: string | undefined;
  
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    userId = decoded.sub;
    const awaitedParams = await params;
    reportId = awaitedParams.reportId;

    // 验证是否为管理员
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true, isSuperAdmin: true, accountType: true }
    });

    if (!user || (!user.isAdmin && !user.isSuperAdmin && user.accountType !== 'teacher')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        post: {
          include: {
            user: {
              select: { id: true, name: true, nickname: true, accountType: true }
            },
            comments: {
              where: { isDeleted: false },
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                user: {
                  select: { name: true, nickname: true }
                }
              }
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

    if (!report) {
      return NextResponse.json({ error: '举报不存在' }, { status: 404 });
    }

    await updateUserActivity(userId);

    return NextResponse.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('获取举报详情失败:', error);
    console.error('错误详情:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      reportId,
      userId
    });
    return NextResponse.json({ 
      error: '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    }, { status: 500 });
  }
}
