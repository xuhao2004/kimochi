import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 删除评论
export async function DELETE(req: Request, context: { params: Promise<{ commentId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { commentId } = params;

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isAdmin: true, isSuperAdmin: true, accountType: true }
    });

    // 获取评论信息
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId, isDeleted: false },
      include: {
        post: {
          include: {
            user: {
              select: { id: true }
            }
          }
        },
        user: {
          select: { name: true, nickname: true }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }

    // 检查权限：评论作者、帖子作者或管理员/老师可以删除
    const canDelete = comment.userId === payload.sub || 
                     comment.post.userId === payload.sub ||
                     currentUser?.isAdmin || 
                     currentUser?.isSuperAdmin ||
                     currentUser?.accountType === 'teacher';

    if (!canDelete) {
      return NextResponse.json({ error: "无权删除此评论" }, { status: 403 });
    }

    // 软删除评论
    await prisma.postComment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedBy: payload.sub,
        deletedAt: new Date()
      }
    });

    // 如果不是评论作者删除的，发送站内信通知评论作者
    if (comment.userId !== payload.sub) {
      const operatorName = currentUser?.isAdmin || currentUser?.isSuperAdmin ? '管理员' : 
                          currentUser?.accountType === 'teacher' ? '老师' : 
                          '帖子作者';
      
      await prisma.userMessage.create({
        data: {
          senderId: payload.sub,
          receiverId: comment.userId,
          type: 'comment_deleted',
          title: '评论被删除通知',
          content: `您在帖子《${comment.post.title}》下的评论已被${operatorName}删除。`,
          relatedPostId: comment.postId,
          relatedCommentId: commentId,
          priority: 'normal'
        }
      });
    }

    return NextResponse.json({ message: "评论删除成功" });

  } catch (error) {
    console.error('删除评论失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 精选/取消精选评论
export async function PATCH(req: Request, context: { params: Promise<{ commentId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { commentId } = params;
    const { action } = await req.json(); // "pin" 或 "unpin"

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isAdmin: true, isSuperAdmin: true, accountType: true, name: true, nickname: true }
    });

    // 获取评论信息
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId, isDeleted: false },
      include: {
        post: {
          include: {
            user: {
              select: { id: true }
            }
          }
        },
        user: {
          select: { name: true, nickname: true }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }

    // 检查权限：帖子作者或管理员/老师可以精选评论
    const canPin = comment.post.userId === payload.sub ||
                   currentUser?.isAdmin || 
                   currentUser?.isSuperAdmin ||
                   currentUser?.accountType === 'teacher';

    if (!canPin) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    const isPinning = action === 'pin';
    
    // 更新评论精选状态
    const updatedComment = await prisma.postComment.update({
      where: { id: commentId },
      data: {
        isPinned: isPinning,
        pinnedBy: isPinning ? payload.sub : null,
        pinnedAt: isPinning ? new Date() : null
      }
    });

    // 如果不是评论作者操作的，发送站内信通知评论作者
    if (comment.userId !== payload.sub) {
      const operatorName = currentUser?.isAdmin || currentUser?.isSuperAdmin ? '管理员' : 
                          currentUser?.accountType === 'teacher' ? '老师' : 
                          '帖子作者';
      
      await prisma.userMessage.create({
        data: {
          senderId: payload.sub,
          receiverId: comment.userId,
          type: 'comment_pinned',
          title: isPinning ? '评论被精选通知' : '评论精选已取消',
          content: isPinning 
            ? `恭喜！您在帖子《${comment.post.title}》下的评论已被${operatorName}精选。`
            : `您在帖子《${comment.post.title}》下的评论精选状态已被${operatorName}取消。`,
          relatedPostId: comment.postId,
          relatedCommentId: commentId,
          priority: 'normal'
        }
      });
    }

    return NextResponse.json({ 
      message: isPinning ? "评论精选成功" : "取消精选成功",
      comment: updatedComment
    });

  } catch (error) {
    console.error('精选评论操作失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
