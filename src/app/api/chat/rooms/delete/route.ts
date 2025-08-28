import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 删除聊天室（退出聊天）
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const url = new URL(req.url);
    const roomId = url.searchParams.get("roomId");
    const deleteType = url.searchParams.get("type") || "leave"; // leave: 退出聊天, clear: 清空记录

    if (!roomId) {
      return NextResponse.json({ error: "聊天室ID不能为空" }, { status: 400 });
    }

    // 检查聊天室是否存在且用户是参与者
    const chatRoom = await prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        participants: {
          some: {
            userId: payload.sub,
            isActive: true
          }
        }
      },
      include: {
        participants: {
          where: { isActive: true }
        }
      }
    });

    if (!chatRoom) {
      return NextResponse.json({ error: "聊天室不存在或无权访问" }, { status: 404 });
    }

    if (deleteType === "clear") {
      // 清空聊天记录（软删除用户发送的消息）
      await prisma.chatMessage.updateMany({
        where: {
          chatRoomId: roomId,
          senderId: payload.sub
        },
        data: {
          isDeleted: true,
          content: "[消息已删除]",
          updatedAt: new Date()
        }
      });

      return NextResponse.json({ 
        message: "聊天记录已清空" 
      });

    } else {
      // 退出聊天室
      await prisma.chatRoomParticipant.updateMany({
        where: {
          chatRoomId: roomId,
          userId: payload.sub
        },
        data: {
          isActive: false
        }
      });

      // 如果是私聊且只剩一个人，可以选择删除整个聊天室
      const remainingParticipants = chatRoom.participants.filter(p => p.userId !== payload.sub);
      
      if (chatRoom.type === 'private' && remainingParticipants.length === 1) {
        // 私聊中另一方也退出的话，删除整个聊天室
        const otherParticipantActive = await prisma.chatRoomParticipant.findFirst({
          where: {
            chatRoomId: roomId,
            userId: remainingParticipants[0].userId,
            isActive: true
          }
        });

        if (!otherParticipantActive) {
          // 删除聊天室相关数据
          await prisma.chatMessage.deleteMany({
            where: { chatRoomId: roomId }
          });
          
          await prisma.chatRoomParticipant.deleteMany({
            where: { chatRoomId: roomId }
          });
          
          await prisma.chatRoom.delete({
            where: { id: roomId }
          });
        }
      }

      return NextResponse.json({ 
        message: "已退出聊天室" 
      });
    }

  } catch (error) {
    console.error('删除聊天室失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 批量删除聊天室
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { roomIds, deleteType = "leave" } = await req.json();

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json({ error: "聊天室ID列表不能为空" }, { status: 400 });
    }

    // 检查所有聊天室是否存在且用户是参与者
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        id: { in: roomIds },
        participants: {
          some: {
            userId: payload.sub,
            isActive: true
          }
        }
      },
      include: {
        participants: {
          where: { isActive: true }
        }
      }
    });

    if (chatRooms.length !== roomIds.length) {
      return NextResponse.json({ error: "部分聊天室不存在或无权访问" }, { status: 404 });
    }

    let processedCount = 0;

    for (const room of chatRooms) {
      if (deleteType === "clear") {
        // 清空聊天记录
        await prisma.chatMessage.updateMany({
          where: {
            chatRoomId: room.id,
            senderId: payload.sub
          },
          data: {
            isDeleted: true,
            content: "[消息已删除]",
            updatedAt: new Date()
          }
        });
      } else {
        // 退出聊天室
        await prisma.chatRoomParticipant.updateMany({
          where: {
            chatRoomId: room.id,
            userId: payload.sub
          },
          data: {
            isActive: false
          }
        });

        // 如果是私聊且对方也已退出，删除整个聊天室
        if (room.type === 'private' && room.participants.length === 2) {
          const otherParticipant = room.participants.find(p => p.userId !== payload.sub);
          if (otherParticipant) {
            const otherActive = await prisma.chatRoomParticipant.findFirst({
              where: {
                chatRoomId: room.id,
                userId: otherParticipant.userId,
                isActive: true
              }
            });

            if (!otherActive) {
              await prisma.chatMessage.deleteMany({
                where: { chatRoomId: room.id }
              });
              
              await prisma.chatRoomParticipant.deleteMany({
                where: { chatRoomId: room.id }
              });
              
              await prisma.chatRoom.delete({
                where: { id: room.id }
              });
            }
          }
        }
      }
      processedCount++;
    }

    return NextResponse.json({ 
      message: deleteType === "clear" 
        ? `成功清空${processedCount}个聊天记录` 
        : `成功退出${processedCount}个聊天室`,
      processedCount,
      deleteType 
    });

  } catch (error) {
    console.error('批量删除聊天室失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
