import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 检查两个用户是否可以直接聊天（无需好友关系）
function checkChatPermissions(currentUser: any, targetUser: any): boolean {
  // 超级管理员可以与所有人聊天
  if (currentUser.isSuperAdmin || targetUser.isSuperAdmin) {
    return true;
  }
  
  // 教师可以与学生和注册用户聊天
  if ((currentUser.accountType === 'teacher' || currentUser.isAdmin) && 
      (targetUser.accountType === 'student' || targetUser.accountType === 'self')) {
    return true;
  }
  
  // 学生可以与教师和同班同学聊天
  if (currentUser.accountType === 'student') {
    if (targetUser.accountType === 'teacher' || targetUser.isAdmin) {
      return true;
    }
    if (targetUser.accountType === 'student' && 
        currentUser.className && 
        currentUser.className === targetUser.className) {
      return true;
    }
  }
  
  // 注册用户只能与心理咨询师聊天
  if (currentUser.accountType === 'self') {
    if (targetUser.accountType === 'teacher' || targetUser.isAdmin) {
      return true;
    }
  }
  
  return false;
}

// 获取用户的聊天室列表
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 获取用户参与的所有聊天室
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            userId: payload.sub,
            isActive: true
          }
        }
      },
      include: {
        participants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                nickname: true,
                profileImage: true,
                accountType: true,
                isAdmin: true,
                isSuperAdmin: true,
                className: true,
                college: true,
                major: true,
                office: true,
                phone: true
              }
            }
          }
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                nickname: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: {
              where: {
                isDeleted: false,
                createdAt: {
                  gt: new Date(
                    Date.now() - 1000 * 60 * 60 * 24 * 30 // 30天内的消息
                  )
                }
              }
            }
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    // 格式化聊天室数据
    const formattedRooms = await Promise.all(
      chatRooms.map(async (room) => {
        // 获取当前用户的最后阅读时间
        const userParticipant = room.participants.find(p => p.userId === payload.sub);
        const lastReadAt = userParticipant?.lastReadAt || new Date(0);

        // 计算未读消息数量
        const unreadCount = await prisma.chatMessage.count({
          where: {
            chatRoomId: room.id,
            createdAt: { gt: lastReadAt },
            senderId: { not: payload.sub }
          }
        });

        // 获取聊天对象信息（私聊）
        let chatTarget = null;
        if (room.type === 'private') {
          const otherParticipant = room.participants.find(p => p.userId !== payload.sub);
          if (otherParticipant) {
            chatTarget = otherParticipant.user;
          }
        }

        return {
          id: room.id,
          name: room.name || (chatTarget ? (chatTarget.nickname || chatTarget.name) : '未知聊天'),
          type: room.type,
          lastMessage: room.messages[0] || null,
          lastMessageAt: room.lastMessageAt,
          unreadCount,
          participants: room.participants.map(p => p.user),
          chatTarget, // 私聊对象
          totalMessages: room._count.messages
        };
      })
    );

    // 过滤掉已无可见消息的聊天室（双方均已清空或历史消息均被删除）
    const visibleRooms = formattedRooms.filter(r => !!r.lastMessage);

    return NextResponse.json({ chatRooms: visibleRooms });

  } catch (error) {
    console.error('获取聊天室列表失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 创建或获取私聊室
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { targetUserId, type = 'private' } = await req.json();

    if (targetUserId === payload.sub) {
      return NextResponse.json({ error: "不能与自己聊天" }, { status: 400 });
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        nickname: true,
        accountType: true,
        isAdmin: true,
        isSuperAdmin: true,
        className: true
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "目标用户不存在" }, { status: 404 });
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        accountType: true,
        isAdmin: true,
        isSuperAdmin: true,
        className: true
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "用户信息获取失败" }, { status: 500 });
    }

    // 检查聊天权限
    const canChatDirectly = checkChatPermissions(currentUser, targetUser);
    
    if (!canChatDirectly) {
      // 检查是否为好友关系
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId: payload.sub, friendId: targetUserId, status: "accepted" },
            { userId: targetUserId, friendId: payload.sub, status: "accepted" }
          ]
        }
      });

      if (!friendship) {
        return NextResponse.json({ 
          error: "无法与该用户聊天，请先添加为好友",
          needFriendship: true 
        }, { status: 403 });
      }
    }

    // 检查是否已存在私聊室
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        type: 'private',
        AND: [
          {
            participants: {
              some: { userId: payload.sub, isActive: true }
            }
          },
          {
            participants: {
              some: { userId: targetUserId, isActive: true }
            }
          }
        ]
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                nickname: true,
                profileImage: true,
                accountType: true,
                isAdmin: true,
                isSuperAdmin: true,
                className: true,
                college: true,
                major: true,
                office: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (existingRoom) {
      return NextResponse.json({ chatRoom: existingRoom });
    }

    // 创建新的私聊室
    const newRoom = await prisma.chatRoom.create({
      data: {
        type: 'private',
        createdBy: payload.sub,
        participants: {
          create: [
            { userId: payload.sub },
            { userId: targetUserId }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                nickname: true,
                profileImage: true,
                accountType: true,
                isAdmin: true,
                isSuperAdmin: true,
                className: true,
                college: true,
                major: true,
                office: true,
                phone: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ chatRoom: newRoom });

  } catch (error) {
    console.error('创建聊天室失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
