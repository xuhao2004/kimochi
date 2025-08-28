import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 删除单条消息
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");
    const deleteType = url.searchParams.get("type") || "soft"; // soft: 软删除, hard: 硬删除

    if (!messageId) {
      return NextResponse.json({ error: "消息ID不能为空" }, { status: 400 });
    }

    // 检查消息是否存在且属于当前用户
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        senderId: payload.sub,
        isDeleted: false
      },
      include: {
        chatRoom: {
          include: {
            participants: {
              where: { userId: payload.sub }
            }
          }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: "消息不存在或无权删除" }, { status: 404 });
    }

    // 检查用户是否有权限删除消息（只能删除自己发送的消息）
    if (message.senderId !== payload.sub) {
      return NextResponse.json({ error: "只能删除自己发送的消息" }, { status: 403 });
    }

    if (deleteType === "hard") {
      // 硬删除：直接从数据库删除
      await prisma.chatMessage.delete({
        where: { id: messageId }
      });
    } else {
      // 软删除：标记为已删除
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { 
          isDeleted: true,
          content: "[消息已删除]",
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ 
      message: "消息删除成功",
      deleteType 
    });

  } catch (error) {
    console.error('删除消息失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 批量删除消息
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { messageIds, deleteType = "soft" } = await req.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: "消息ID列表不能为空" }, { status: 400 });
    }

    // 检查所有消息是否存在且属于当前用户
    const messages = await prisma.chatMessage.findMany({
      where: {
        id: { in: messageIds },
        senderId: payload.sub,
        isDeleted: false
      }
    });

    if (messages.length !== messageIds.length) {
      return NextResponse.json({ error: "部分消息不存在或无权删除" }, { status: 404 });
    }

    if (deleteType === "hard") {
      // 硬删除：直接从数据库删除
      await prisma.chatMessage.deleteMany({
        where: { 
          id: { in: messageIds },
          senderId: payload.sub
        }
      });
    } else {
      // 软删除：标记为已删除
      await prisma.chatMessage.updateMany({
        where: { 
          id: { in: messageIds },
          senderId: payload.sub
        },
        data: { 
          isDeleted: true,
          content: "[消息已删除]",
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ 
      message: `成功删除${messages.length}条消息`,
      deletedCount: messages.length,
      deleteType 
    });

  } catch (error) {
    console.error('批量删除消息失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
