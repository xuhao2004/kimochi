import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取单个帖子详情
export async function GET(req: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { postId } = params;

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { 
        id: true, 
        isAdmin: true, 
        isSuperAdmin: true, 
        className: true,
        accountType: true
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 分页参数（评论）
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || '10')));

    // 获取帖子详情
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true,
            accountType: true,
            className: true,
            isAdmin: true,
            isSuperAdmin: true
          }
        },
        comments: {
          where: { isDeleted: false },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                nickname: true,
                profileImage: true,
                accountType: true
              }
            },
            replies: {
              where: { isDeleted: false },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    nickname: true,
                    profileImage: true,
                    accountType: true
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'desc' }
          ],
          skip: (page - 1) * limit,
          take: limit
        },
        _count: {
          select: {
            comments: {
              where: { isDeleted: false }
            }
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    // 检查可见权限
    const canView = await checkPostVisibility(post, currentUser);
    if (!canView) {
      return NextResponse.json({ error: "无权查看此帖子" }, { status: 403 });
    }

    // 处理匿名显示
    const processedPost = {
      ...post,
      user: post.isAnonymous && post.userId !== currentUser.id ? {
        id: 'anonymous',
        name: '匿名用户',
        nickname: '匿名用户',
        profileImage: null,
        accountType: 'anonymous',
        className: null,
        isAdmin: false,
        isSuperAdmin: false
      } : post.user,
      comments: post.comments.map(comment => ({
        ...comment,
        user: comment.isAnonymous && comment.userId !== currentUser.id ? {
          id: 'anonymous',
          name: '匿名用户',
          nickname: '匿名用户',
          profileImage: null,
          accountType: 'anonymous'
        } : comment.user,
        replies: comment.replies.map(reply => ({
          ...reply,
          user: reply.isAnonymous && reply.userId !== currentUser.id ? {
            id: 'anonymous',
            name: '匿名用户',
            nickname: '匿名用户',
            profileImage: null,
            accountType: 'anonymous'
          } : reply.user
        }))
      }))
    };

    const totalComments = post._count.comments as any;
    const hasMore = (post.comments?.length || 0) === limit && (page * limit) < (totalComments?.where ? totalComments.where : totalComments);

    return NextResponse.json({ post: processedPost, pagination: { page, limit, hasMore } });

  } catch (error) {
    console.error('获取帖子详情失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 更新帖子
export async function PUT(req: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { postId } = params;
    const { title, content, visibility, isAnonymous, tags, location, mood } = await req.json();

    // 获取帖子
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false }
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    // 检查权限：只有帖子作者可以编辑
    if (post.userId !== payload.sub) {
      return NextResponse.json({ error: "无权编辑此帖子" }, { status: 403 });
    }

    // 验证必填字段
    if (!title || !content || !visibility) {
      return NextResponse.json({ error: "标题、内容和可见范围为必填项" }, { status: 400 });
    }

    // 更新帖子
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: title.trim(),
        content: content.trim(),
        visibility,
        isAnonymous: !!isAnonymous,
        tags: tags ? JSON.stringify(tags) : null,
        location: location?.trim() || null,
        mood: mood?.trim() || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true,
            accountType: true,
            className: true,
            isAdmin: true,
            isSuperAdmin: true
          }
        }
      }
    });

    return NextResponse.json({ 
      message: "帖子更新成功",
      post: updatedPost
    });

  } catch (error) {
    console.error('更新帖子失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 删除帖子
export async function DELETE(req: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { postId } = params;

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isAdmin: true, isSuperAdmin: true }
    });

    // 获取帖子
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      include: {
        user: {
          select: { name: true, nickname: true }
        }
      }
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    // 检查权限：帖子作者或管理员可以删除
    const canDelete = post.userId === payload.sub || 
                     currentUser?.isAdmin || 
                     currentUser?.isSuperAdmin;

    if (!canDelete) {
      return NextResponse.json({ error: "无权删除此帖子" }, { status: 403 });
    }

    // 软删除帖子
    await prisma.post.update({
      where: { id: postId },
      data: {
        isDeleted: true,
        deletedBy: payload.sub,
        deletedAt: new Date()
      }
    });

    // 如果是管理员删除的，发送站内信通知帖子作者
    if (post.userId !== payload.sub) {
      await prisma.userMessage.create({
        data: {
          senderId: payload.sub,
          receiverId: post.userId,
          type: 'post_deleted',
          title: '帖子被删除通知',
          content: `您的帖子《${post.title}》已被管理员删除。`,
          relatedPostId: postId,
          priority: 'normal'
        }
      });
    }

    return NextResponse.json({ message: "帖子删除成功" });

  } catch (error) {
    console.error('删除帖子失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 精选/取消精选帖子
export async function PATCH(req: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { postId } = params;
    const { action } = await req.json(); // "pin" 或 "unpin"

    // 检查管理员权限
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isAdmin: true, isSuperAdmin: true, accountType: true }
    });

    if (!currentUser?.isAdmin && !currentUser?.isSuperAdmin && currentUser?.accountType !== 'teacher') {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    // 获取帖子
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      include: {
        user: {
          select: { name: true, nickname: true }
        }
      }
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    const isPinning = action === 'pin';
    
    // 更新帖子精选状态
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        isPinned: isPinning,
        pinnedBy: isPinning ? payload.sub : null,
        pinnedAt: isPinning ? new Date() : null
      }
    });

    // 发送站内信通知帖子作者
    if (post.userId !== payload.sub) {
      await prisma.userMessage.create({
        data: {
          senderId: payload.sub,
          receiverId: post.userId,
          type: 'post_pinned',
          title: isPinning ? '帖子被精选通知' : '帖子精选已取消',
          content: isPinning 
            ? `恭喜！您的帖子《${post.title}》已被精选为优质内容，将在全站展示。`
            : `您的帖子《${post.title}》的精选状态已被取消。`,
          relatedPostId: postId,
          priority: 'normal'
        }
      });
    }

    return NextResponse.json({ 
      message: isPinning ? "帖子精选成功" : "取消精选成功",
      post: updatedPost
    });

  } catch (error) {
    console.error('精选帖子操作失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 检查帖子可见权限的辅助函数
async function checkPostVisibility(post: any, currentUser: any): Promise<boolean> {
  // 自己的帖子总是可见
  if (post.userId === currentUser.id) return true;
  
  // 精选帖子总是可见
  if (post.isPinned) return true;
  
  // 公开帖子总是可见
  if (post.visibility === 'public') return true;
  
  switch (post.visibility) {
    case 'friends':
      // 检查好友关系
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId: currentUser.id, friendId: post.userId, status: 'accepted' },
            { userId: post.userId, friendId: currentUser.id, status: 'accepted' }
          ]
        }
      });
      return !!friendship;
      
    case 'teachers':
      return currentUser.isAdmin || currentUser.isSuperAdmin || currentUser.accountType === 'teacher';
      
    case 'classmates':
      return !!currentUser.className && currentUser.className === post.user?.className;
      
    case 'teachers_classmates':
      const isTeacher = currentUser.isAdmin || currentUser.isSuperAdmin || currentUser.accountType === 'teacher';
      const isSameClass = !!currentUser.className && currentUser.className === post.user?.className;
      return isTeacher || isSameClass;
      
    default:
      return false;
  }
}
