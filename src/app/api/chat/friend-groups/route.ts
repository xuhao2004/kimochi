import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取用户的好友分组列表
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const groups = await prisma.friendGroup.findMany({
      where: { userId: payload.sub },
      include: {
        _count: {
          select: {
            friendships: {
              where: { status: "accepted" }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ groups });

  } catch (error) {
    console.error('获取好友分组失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 创建新的好友分组
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { name, description, color } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "分组名称不能为空" }, { status: 400 });
    }

    // 检查分组名称是否重复
    const existingGroup = await prisma.friendGroup.findFirst({
      where: {
        userId: payload.sub,
        name: name.trim()
      }
    });

    if (existingGroup) {
      return NextResponse.json({ error: "分组名称已存在" }, { status: 400 });
    }

    // 获取当前最大排序值
    const maxOrderGroup = await prisma.friendGroup.findFirst({
      where: { userId: payload.sub },
      orderBy: { order: 'desc' }
    });

    const newOrder = (maxOrderGroup?.order || 0) + 1;

    const group = await prisma.friendGroup.create({
      data: {
        userId: payload.sub,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        order: newOrder
      }
    });

    return NextResponse.json({ 
      message: "分组创建成功",
      group 
    });

  } catch (error) {
    console.error('创建好友分组失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 更新好友分组
export async function PUT(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { groupId, name, description, color, order } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "分组ID不能为空" }, { status: 400 });
    }

    // 检查分组是否存在且属于当前用户
    const existingGroup = await prisma.friendGroup.findFirst({
      where: {
        id: groupId,
        userId: payload.sub
      }
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "分组不存在" }, { status: 404 });
    }

    // 如果更新名称，检查重复
    if (name && name.trim() !== existingGroup.name) {
      const duplicateGroup = await prisma.friendGroup.findFirst({
        where: {
          userId: payload.sub,
          name: name.trim(),
          id: { not: groupId }
        }
      });

      if (duplicateGroup) {
        return NextResponse.json({ error: "分组名称已存在" }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;
    if (order !== undefined) updateData.order = order;

    const group = await prisma.friendGroup.update({
      where: { id: groupId },
      data: updateData
    });

    return NextResponse.json({ 
      message: "分组更新成功",
      group 
    });

  } catch (error) {
    console.error('更新好友分组失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 删除好友分组
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const url = new URL(req.url);
    const groupId = url.searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "分组ID不能为空" }, { status: 400 });
    }

    // 检查分组是否存在且属于当前用户
    const existingGroup = await prisma.friendGroup.findFirst({
      where: {
        id: groupId,
        userId: payload.sub
      }
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "分组不存在" }, { status: 404 });
    }

    // 删除分组前，将该分组下的好友关系的groupId设为null
    await prisma.friendship.updateMany({
      where: { groupId },
      data: { groupId: null }
    });

    // 删除分组
    await prisma.friendGroup.delete({
      where: { id: groupId }
    });

    return NextResponse.json({ message: "分组删除成功" });

  } catch (error) {
    console.error('删除好友分组失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
