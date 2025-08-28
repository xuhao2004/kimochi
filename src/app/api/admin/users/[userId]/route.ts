import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  
  if (!token) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.isAdmin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const params = await context.params;
  const { userId } = params;
  if (!userId) {
    return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
  }

  try {
    // 检查要删除的用户是否存在
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, studentId: true, accountType: true, isAdmin: true, isSuperAdmin: true }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 不允许删除管理员账户和超级管理员账户
    if (userToDelete.isAdmin || userToDelete.isSuperAdmin) {
      return NextResponse.json({ error: "不能删除管理员账户" }, { status: 403 });
    }

    // 不允许删除自己
    if (userId === payload.sub) {
      return NextResponse.json({ error: "不能删除自己的账户" }, { status: 403 });
    }

    // 删除用户
    await prisma.user.delete({
      where: { id: userId }
    });

    // 根据用户类型显示不同的标识信息
    const userIdentifier = userToDelete.accountType === 'student' && userToDelete.studentId 
      ? userToDelete.studentId 
      : userToDelete.email || '无标识';

    return NextResponse.json({ 
      message: `用户 ${userToDelete.name} (${userIdentifier}) 已被删除`
    });
  } catch (error) {
    console.error("删除用户失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
