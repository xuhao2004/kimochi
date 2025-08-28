import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取未读消息统计
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 获取用户参与的所有聊天室
    const participations = await prisma.chatRoomParticipant.findMany({
      where: {
        userId: payload.sub,
        isActive: true
      },
      select: {
        chatRoomId: true,
        lastReadAt: true
      }
    });

    // 计算总未读消息数
    let totalUnreadCount = 0;
    const roomUnreadCounts = [];

    for (const participation of participations) {
      const unreadCount = await prisma.chatMessage.count({
        where: {
          chatRoomId: participation.chatRoomId,
          createdAt: { gt: participation.lastReadAt },
          senderId: { not: payload.sub },
          isDeleted: false
        }
      });

      totalUnreadCount += unreadCount;
      
      if (unreadCount > 0) {
        roomUnreadCounts.push({
          roomId: participation.chatRoomId,
          unreadCount
        });
      }
    }

    // 获取最新的未读消息（用于预览）
    const latestUnreadMessages = participations.length > 0 ? await prisma.chatMessage.findMany({
      where: {
        chatRoomId: { in: participations.map(p => p.chatRoomId) },
        senderId: { not: payload.sub },
        isDeleted: false,
        createdAt: {
          gt: new Date(Math.min(...participations.map(p => p.lastReadAt.getTime())))
        }
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true
          }
        },
        chatRoom: {
          select: {
            id: true,
            name: true,
            type: true,
            participants: {
              where: { userId: { not: payload.sub } },
              take: 1,
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    nickname: true,
                    profileImage: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }) : [];

    return NextResponse.json({ 
      totalUnreadCount,
      roomUnreadCounts,
      latestUnreadMessages: latestUnreadMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        sender: msg.sender,
        chatRoom: {
          id: msg.chatRoom.id,
          name: msg.chatRoom.name || (
            msg.chatRoom.participants[0]?.user.nickname || 
            msg.chatRoom.participants[0]?.user.name || 
            '未知聊天'
          ),
          type: msg.chatRoom.type
        }
      }))
    });

  } catch (error) {
    console.error('获取未读消息统计失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
