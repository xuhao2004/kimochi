import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SSE } from "@/lib/sse";

// 获取聊天室消息
export async function GET(req: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { roomId } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 验证用户是否是聊天室成员
    const participant = await prisma.chatRoomParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId: payload.sub,
        isActive: true
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "无权访问此聊天室" }, { status: 403 });
    }

    // 获取消息列表
    const messages = await prisma.chatMessage.findMany({
      where: {
        chatRoomId: roomId,
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true,
            accountType: true,
            isAdmin: true,
            isSuperAdmin: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                nickname: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // 更新最后阅读时间
    await prisma.chatRoomParticipant.update({
      where: {
        chatRoomId_userId: {
          chatRoomId: roomId,
          userId: payload.sub
        }
      },
      data: {
        lastReadAt: new Date()
      }
    });

    return NextResponse.json({ 
      messages: messages.reverse(), // 返回正序消息
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    });

  } catch (error) {
    console.error('获取消息失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 发送消息
export async function POST(req: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { roomId } = params;
    const { content, messageType = 'text', replyToId } = await req.json();

    if ((!content || content.trim().length === 0) && messageType !== 'invite_assessment') {
      return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
    }

    // 验证用户是否是聊天室成员
    const participant = await prisma.chatRoomParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId: payload.sub,
        isActive: true
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "无权在此聊天室发送消息" }, { status: 403 });
    }

    // 获取聊天室信息和其他参与者
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                isAdmin: true,
                isSuperAdmin: true
              }
            }
          }
        }
      }
    });

    if (!chatRoom) {
      return NextResponse.json({ error: "聊天室不存在" }, { status: 404 });
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isAdmin: true, isSuperAdmin: true }
    });

    // 如果是私聊且不是管理员，检查好友关系
    if (chatRoom.type === 'private' && !currentUser?.isAdmin && !currentUser?.isSuperAdmin) {
      const otherParticipant = chatRoom.participants.find(p => p.userId !== payload.sub);
      
      if (otherParticipant) {
        const targetUserId = otherParticipant.userId;
        
        // 检查目标用户是否是管理员（管理员始终可以联系）
        if (!otherParticipant.user.isAdmin && !otherParticipant.user.isSuperAdmin) {
          // 检查是否存在有效的好友关系
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
              error: "需要添加好友后才能发送消息",
              code: "FRIENDSHIP_REQUIRED",
              targetUserId 
            }, { status: 403 });
          }
        }
      }
    }

    // 如果是回复消息，验证被回复的消息是否存在
    if (replyToId) {
      const replyToMessage = await prisma.chatMessage.findFirst({
        where: {
          id: replyToId,
          chatRoomId: roomId,
          isDeleted: false
        }
      });

      if (!replyToMessage) {
        return NextResponse.json({ error: "被回复的消息不存在" }, { status: 404 });
      }
    }

    // 特殊：邀请测评卡片
    if (messageType === 'invite_assessment') {
      // 仅支持私聊且双方均在房间
      if (chatRoom.type !== 'private') {
        return NextResponse.json({ error: '仅支持私聊中发送邀请测评' }, { status: 400 });
      }
      const other = chatRoom.participants.find(p => p.userId !== payload.sub);
      if (!other) return NextResponse.json({ error: '聊天室参与者不完整' }, { status: 400 });
      let data: any = null;
      try { data = JSON.parse(content); } catch {}
      const type = String(data?.type || '').toUpperCase();
      if (!['MBTI','SCL90','SDS','SDS/SAS'].includes(type)) {
        return NextResponse.json({ error: '无效的测评类型' }, { status: 400 });
      }
      const normalizedType = type === 'SDS/SAS' ? 'SDS' : type;

      // 创建消息（卡片）
      const cardPayload = {
        kind: 'invite',
        type,
        status: 'pending'
      };
      const message = await prisma.chatMessage.create({
        data: {
          chatRoomId: roomId,
          senderId: payload.sub,
          content: JSON.stringify(cardPayload),
          messageType: 'invite_assessment',
          replyToId
        },
        include: {
          sender: {
            select: { id: true, name: true, nickname: true, profileImage: true, accountType: true, isAdmin: true, isSuperAdmin: true }
          },
          replyTo: {
            include: { sender: { select: { id: true, name: true, nickname: true } } }
          }
        }
      });

      // 建立邀请记录
      const inv = await prisma.assessmentInvite.create({
        data: {
          chatRoomId: roomId,
          messageId: message.id,
          inviterId: payload.sub,
          inviteeId: other.userId,
          type: normalizedType,
          status: 'pending'
        }
      });
      // 更新卡片写入 inviteId，便于后续操作
      const withInviteId = { ...cardPayload, inviteId: inv.id };
      await prisma.chatMessage.update({ where: { id: message.id }, data: { content: JSON.stringify(withInviteId) } });
      const messagePatched = { ...message, content: JSON.stringify(withInviteId) } as any;

      await prisma.chatRoom.update({ where: { id: roomId }, data: { lastMessageAt: new Date() } });
      try { await SSE.sendToChatRoom(roomId, 'chat_message', { roomId, message: messagePatched }); } catch {}
      return NextResponse.json({ message: messagePatched });
    }

    // 创建普通消息
    const message = await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId: payload.sub,
        content: content.trim(),
        messageType,
        replyToId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImage: true,
            accountType: true,
            isAdmin: true,
            isSuperAdmin: true
          }
        },
        replyTo: {
          include: {
            sender: {
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

    // 更新聊天室的最后消息时间
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date() }
    });

    // 广播给聊天室参与者：新消息
    try {
      await SSE.sendToChatRoom(roomId, 'chat_message', { roomId, message });
    } catch (e) {
      console.warn('广播新聊天消息失败（忽略）:', e);
    }
    return NextResponse.json({ message });

  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
