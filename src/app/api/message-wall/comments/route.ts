import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 创建评论
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { postId, content, isAnonymous, replyToId } = await req.json();

    // 验证必填字段
    if (!postId || !content) {
      return NextResponse.json({ error: "帖子ID和评论内容为必填项" }, { status: 400 });
    }

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

    // 检查帖子是否存在且可见
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            className: true,
            accountType: true,
            isAdmin: true,
            isSuperAdmin: true
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
      return NextResponse.json({ error: "无权访问此帖子" }, { status: 403 });
    }

    // 如果是回复评论，检查被回复的评论是否存在
    if (replyToId) {
      const replyToComment = await prisma.postComment.findUnique({
        where: { id: replyToId, isDeleted: false }
      });

      if (!replyToComment || replyToComment.postId !== postId) {
        return NextResponse.json({ error: "被回复的评论不存在" }, { status: 404 });
      }
    }

    // 创建评论
    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId: payload.sub,
        content: content.trim(),
        isAnonymous: !!isAnonymous,
        replyToId: replyToId || null
      },
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
        replyTo: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                nickname: true
              }
            }
          }
        }
      }
    });

    // 处理匿名显示
    const processedComment = {
      ...comment,
      user: comment.isAnonymous && comment.userId !== currentUser.id ? {
        id: 'anonymous',
        name: '匿名用户',
        nickname: '匿名用户',
        profileImage: null,
        accountType: 'anonymous'
      } : comment.user
    };

    return NextResponse.json({ 
      message: "评论发布成功",
      comment: processedComment
    });

  } catch (error) {
    console.error('创建评论失败:', error);
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
