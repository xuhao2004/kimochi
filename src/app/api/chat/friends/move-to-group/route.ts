import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 移动好友到指定分组
export async function PUT(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { friendshipId, groupId } = await req.json();

    if (!friendshipId) {
      return NextResponse.json({ error: "好友关系ID不能为空" }, { status: 400 });
    }

    // 检查好友关系是否存在且涉及当前用户
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [
          { userId: payload.sub },
          { friendId: payload.sub }
        ],
        status: "accepted"
      }
    });

    if (!friendship) {
      return NextResponse.json({ error: "好友关系不存在" }, { status: 404 });
    }

    // 如果指定了分组ID，检查分组是否存在且属于当前用户
    if (groupId) {
      const group = await prisma.friendGroup.findFirst({
        where: {
          id: groupId,
          userId: payload.sub
        }
      });

      if (!group) {
        return NextResponse.json({ error: "分组不存在" }, { status: 404 });
      }
    }

    // 更新好友关系的分组
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { groupId: groupId || null }
    });

    return NextResponse.json({ 
      message: groupId ? "好友已移动到指定分组" : "好友已移出分组"
    });

  } catch (error) {
    console.error('移动好友分组失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
