import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取帖子列表
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const visibility = searchParams.get('visibility') || 'all';
    const onlyPinned = searchParams.get('pinned') === 'true';

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
      console.error('用户不存在:', payload.sub);
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 构建可见范围过滤条件
    let visibilityFilter: any = { isDeleted: false };

    if (onlyPinned) {
      visibilityFilter.isPinned = true;
    } else if (visibility !== 'all') {
      // 根据用户身份和请求参数构建过滤条件
      const visibilityConditions: any[] = [];

      if (visibility === 'public') {
        visibilityConditions.push({ visibility: 'public' });
      } else {
        // 用户可以看到自己的所有帖子
        visibilityConditions.push({ userId: currentUser.id });

        // 根据visibility参数添加条件
        switch (visibility) {
          case 'friends':
            visibilityConditions.push({ visibility: 'friends' });
            break;
          case 'selective_friends':
            // 仅展示当前用户被包含在可见范围内的“部分好友”帖子
            visibilityConditions.push({
              visibility: 'selective_friends',
              visibilitySettings: {
                some: {
                  OR: [
                    { friendId: currentUser.id },
                    { group: { friendships: { some: { friendId: currentUser.id } } } }
                  ]
                }
              }
            });
            break;
          case 'teachers':
            if (currentUser.isAdmin || currentUser.isSuperAdmin || currentUser.accountType === 'teacher') {
              visibilityConditions.push({ visibility: 'teachers' });
              visibilityConditions.push({ visibility: 'teachers_classmates' });
            }
            break;
          case 'classmates':
            if (currentUser.className) {
              visibilityConditions.push({ visibility: 'classmates' });
              visibilityConditions.push({ visibility: 'teachers_classmates' });
            }
            break;
        }

        // 管理员和老师可以看到向老师可见的帖子
        if (currentUser.isAdmin || currentUser.isSuperAdmin || currentUser.accountType === 'teacher') {
          visibilityConditions.push({ visibility: 'teachers' });
          visibilityConditions.push({ visibility: 'teachers_classmates' });
        }

        // 公开帖子和精选帖子总是可见
        visibilityConditions.push({ visibility: 'public' });
        visibilityConditions.push({ isPinned: true });
        // 同时包含“部分好友”中对当前用户可见的帖子
        visibilityConditions.push({
          visibility: 'selective_friends',
          visibilitySettings: {
            some: {
              OR: [
                { friendId: currentUser.id },
                { group: { friendships: { some: { friendId: currentUser.id } } } }
              ]
            }
          }
        });
      }

      visibilityFilter = {
        ...visibilityFilter,
        OR: visibilityConditions
      };
    }

    // 获取帖子列表
    const posts = await prisma.post.findMany({
      where: visibilityFilter,
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
        // visibilitySettings 暂时注释，简化查询
        // visibilitySettings: true,
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
            }
          },
          orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'desc' }
          ],
          take: 3 // 只预览前3条评论
        },
        _count: {
          select: {
            comments: {
              where: { isDeleted: false }
            }
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // 处理匿名显示
    // 匿名处理
    const anonProcessed = posts.map(post => ({
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
        } : comment.user
      }))
    }));

    // 点赞统计与是否点赞
    const processedPosts = [] as any[];
    for (const p of anonProcessed) {
      const meta = `post_like:${p.id}`;
      const likeCount = await prisma.userAction.count({ where: { actionType: 'post_like', metadata: meta } });
      const liked = await prisma.userAction.findFirst({ where: { userId: payload.sub, actionType: 'post_like', metadata: meta } });
      processedPosts.push({ ...p, likeCount, liked: !!liked });
    }

    return NextResponse.json({ 
      posts: processedPosts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });

  } catch (error) {
    console.error('获取帖子列表失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 创建帖子
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { title, content, visibility, isAnonymous, tags, images, location, mood, visibilitySettings } = await req.json();

    // 验证必填字段
    if (!title || !content || !visibility) {
      return NextResponse.json({ error: "标题、内容和可见范围为必填项" }, { status: 400 });
    }

    // 验证可见范围
    const validVisibilities = ['friends', 'selective_friends', 'teachers', 'classmates', 'teachers_classmates', 'public'];
    if (!validVisibilities.includes(visibility)) {
      return NextResponse.json({ error: "无效的可见范围" }, { status: 400 });
    }

    // 对于部分好友可见，必须提供可见性设置
    if (visibility === 'selective_friends') {
      const hasFriends = Array.isArray(visibilitySettings?.friends) && visibilitySettings.friends.length > 0;
      const hasGroups = Array.isArray(visibilitySettings?.groups) && visibilitySettings.groups.length > 0;
      if (!hasFriends && !hasGroups) {
        return NextResponse.json({ error: '请选择可见的好友或分组' }, { status: 400 });
      }
    }

    // 创建帖子
    const post = await prisma.post.create({
      data: {
        userId: payload.sub,
        title: title.trim(),
        content: content.trim(),
        visibility,
        isAnonymous: !!isAnonymous,
        tags: tags ? JSON.stringify(tags) : null,
        // 复用 content 存储图片附件路径数组的 JSON（也可新字段，暂简化）
        // 如需新字段请在 Prisma 中扩展；这里先附加到 content 末尾分隔（向后兼容）
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

    // 如果是部分好友可见，创建可见性设置
    if (visibility === 'selective_friends' && visibilitySettings) {
      const visibilityData: { postId: string, friendId: string | null, groupId: string | null }[] = [];

      // 添加选中的好友
      if (visibilitySettings.friends && Array.isArray(visibilitySettings.friends)) {
        for (const friendId of visibilitySettings.friends) {
          visibilityData.push({
            postId: post.id,
            friendId: friendId,
            groupId: null
          });
        }
      }

      // 添加选中的分组
      if (visibilitySettings.groups && Array.isArray(visibilitySettings.groups)) {
        for (const groupId of visibilitySettings.groups) {
          visibilityData.push({
            postId: post.id,
            friendId: null,
            groupId: groupId
          });
        }
      }

      // 批量创建可见性设置
      if (visibilityData.length > 0) {
        await prisma.postVisibility.createMany({
          data: visibilityData
        });
      }
    }

    // 处理匿名显示
    let patchedContent = post.content;
    if (Array.isArray(images) && images.length > 0) {
      try { patchedContent = `${post.content}\n\n[images]${JSON.stringify(images)}`; } catch {}
    }
    const processedPost = {
      ...post,
      content: patchedContent,
      user: post.isAnonymous ? {
        id: 'anonymous',
        name: '匿名用户',
        nickname: '匿名用户',
        profileImage: null,
        accountType: 'anonymous',
        className: null,
        isAdmin: false,
        isSuperAdmin: false
      } : post.user
    };

    return NextResponse.json({ 
      message: "帖子发布成功",
      post: processedPost
    });

  } catch (error) {
    console.error('创建帖子失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
