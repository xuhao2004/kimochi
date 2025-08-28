import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notificationService";

// 获取好友列表
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 获取用户的好友列表（已接受的好友关系）
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: payload.sub, status: "accepted" },
          { friendId: payload.sub, status: "accepted" }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true,
            accountType: true,
            isAdmin: true
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true,
            accountType: true,
            isAdmin: true
          }
        }
      }
    });

    // 格式化好友列表
    const friends = friendships.map(friendship => {
      const friend = friendship.userId === payload.sub ? friendship.friend : friendship.user;
      return {
        id: friend.id,
        name: friend.name,
        nickname: friend.nickname,
        profileImage: friend.profileImage,
        accountType: friend.accountType,
        isAdmin: friend.isAdmin,
        friendshipId: friendship.id,
        createdAt: friendship.createdAt
      };
    });

    // 如果是普通用户，自动添加所有管理员为好友（老师）
    if (!payload.isAdmin) {
      const adminFriends = await prisma.user.findMany({
        where: {
          isAdmin: true,
          isSuperAdmin: false,
          id: { not: payload.sub }
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          profileImage: true,
          accountType: true,
          isAdmin: true
        }
      });

      // 添加老师到好友列表（不包含超级管理员）
      adminFriends.forEach(admin => {
        if (!friends.find(f => f.id === admin.id)) {
          friends.push({
            id: admin.id,
            name: admin.name,
            nickname: admin.nickname,
            profileImage: admin.profileImage,
            accountType: admin.accountType,
            isAdmin: admin.isAdmin,
            friendshipId: 'admin-default',
            createdAt: new Date()
          });
        }
      });
    } else {
      // 如果是管理员，显示所有用户
      const allUsers = await prisma.user.findMany({
        where: {
          id: { not: payload.sub }
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          profileImage: true,
          accountType: true,
          isAdmin: true,
          createdAt: true
        }
      });

      // 添加所有用户到好友列表（管理员可以与所有人聊天）
      allUsers.forEach(user => {
        if (!friends.find(f => f.id === user.id)) {
          friends.push({
            id: user.id,
            name: user.name,
            nickname: user.nickname,
            profileImage: user.profileImage,
            accountType: user.accountType,
            isAdmin: user.isAdmin,
            friendshipId: 'admin-all',
            createdAt: user.createdAt
          });
        }
      });
    }

    return NextResponse.json({ friends });

  } catch (error) {
    console.error('获取好友列表失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 添加好友
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { friendId } = await req.json();

    if (friendId === payload.sub) {
      return NextResponse.json({ error: "不能添加自己为好友" }, { status: 400 });
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: friendId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 检查是否已经是好友或有待处理的请求
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: payload.sub, friendId },
          { userId: friendId, friendId: payload.sub }
        ]
      }
    });

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        return NextResponse.json({ error: "已经是好友了" }, { status: 400 });
      } else if (existingFriendship.status === "pending") {
        return NextResponse.json({ error: "好友请求已发送，请等待对方同意" }, { status: 400 });
      }
    }

    // 创建好友请求
    const friendship = await prisma.friendship.create({
      data: {
        userId: payload.sub,
        friendId,
        status: "pending"
      }
    });

  // 发送统一通知：给被申请人
  try {
    await prisma.userMessage.create({
      data: {
        senderId: payload.sub,
        receiverId: friendId,
        type: "friend_request",
        title: "新的好友申请",
        content: `用户请求添加您为好友`,
        priority: "normal"
      }
    });
  } catch (e) {
    console.error('创建好友申请通知失败:', e);
  }

    return NextResponse.json({ 
      message: "好友请求已发送",
      friendship 
    });

  } catch (error) {
    console.error('添加好友失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 删除好友
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const friendId = searchParams.get('friendId');
    const friendshipId = searchParams.get('friendshipId');

    if (!friendId) {
      return NextResponse.json({ error: "缺少好友ID" }, { status: 400 });
    }

    // 检查是否为默认好友关系（不能删除）
    if (friendshipId === 'admin-default' || friendshipId === 'admin-all') {
      return NextResponse.json({ error: "不能删除系统默认联系人" }, { status: 403 });
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isAdmin: true, isSuperAdmin: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 查找要删除的好友关系
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: payload.sub, friendId: friendId, status: "accepted" },
          { userId: friendId, friendId: payload.sub, status: "accepted" }
        ]
      },
      include: {
        user: { select: { name: true, nickname: true } },
        friend: { select: { name: true, nickname: true } }
      }
    });

    if (!friendship) {
      return NextResponse.json({ error: "好友关系不存在" }, { status: 404 });
    }

    // 检查权限：管理员和普通用户都可以删除好友关系
    // 但普通用户不能删除系统管理员（除非管理员主动删除）
    const targetUser = await prisma.user.findUnique({
      where: { id: friendId },
      select: { isAdmin: true, isSuperAdmin: true, accountType: true }
    });

    if (targetUser && (targetUser.isAdmin || targetUser.isSuperAdmin) && !currentUser.isAdmin) {
      return NextResponse.json({ error: "不能删除系统管理员" }, { status: 403 });
    }

    // 删除好友关系
    await prisma.friendship.delete({
      where: { id: friendship.id }
    });

    const friendName = friendship.friendId === payload.sub 
      ? (friendship.user.nickname || friendship.user.name)
      : (friendship.friend.nickname || friendship.friend.name);

    return NextResponse.json({ 
      message: `已删除好友 ${friendName}`
    });

  } catch (error) {
    console.error('删除好友失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
