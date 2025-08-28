import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取好友请求列表
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 获取收到的好友请求
    const receivedRequests = await prisma.friendship.findMany({
      where: {
        friendId: payload.sub,
        status: "pending"
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 获取发送的好友请求
    const sentRequests = await prisma.friendship.findMany({
      where: {
        userId: payload.sub,
        status: "pending"
      },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true,
            accountType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      receivedRequests,
      sentRequests
    });

  } catch (error) {
    console.error('获取好友请求失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 处理好友请求（接受/拒绝）
export async function PUT(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { friendshipId, action } = await req.json(); // action: "accept" | "reject"

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "无效的操作" }, { status: 400 });
    }

    // 查找好友请求
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        friendId: payload.sub,
        status: "pending"
      }
    });

    if (!friendship) {
      return NextResponse.json({ error: "好友请求不存在或已处理" }, { status: 404 });
    }

    if (action === "accept") {
      // 接受好友请求
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "accepted" }
      });
      // 回执：通知申请人
      try {
        await prisma.userMessage.create({
          data: {
            senderId: payload.sub,
            receiverId: friendship.userId,
            type: "friend_request_receipt",
            title: "好友申请已通过",
            content: "对方已接受您的好友申请",
            priority: "normal"
          }
        });
      } catch (e) {
        console.error('发送好友通过回执失败:', e);
      }

      return NextResponse.json({ message: "已接受好友请求" });
    } else {
      // 拒绝好友请求
      await prisma.friendship.delete({
        where: { id: friendshipId }
      });
      // 回执：通知申请人
      try {
        await prisma.userMessage.create({
          data: {
            senderId: payload.sub,
            receiverId: friendship.userId,
            type: "friend_request_receipt",
            title: "好友申请被拒绝",
            content: "对方拒绝了您的好友申请",
            priority: "low"
          }
        });
      } catch (e) {
        console.error('发送好友拒绝回执失败:', e);
      }

      return NextResponse.json({ message: "已拒绝好友请求" });
    }

  } catch (error) {
    console.error('处理好友请求失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
