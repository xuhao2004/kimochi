import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 搜索用户
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "搜索关键词至少需要2个字符" }, { status: 400 });
    }

    // 搜索用户（排除自己）
    const users = await prisma.user.findMany({
      where: {
        id: { not: payload.sub },
        OR: [
          { name: { contains: query } },
          { nickname: { contains: query } },
          { email: { contains: query } },
          { studentId: { contains: query } }
        ]
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        profileImage: true,
        accountType: true,
        isAdmin: true,
        isSuperAdmin: true,
        email: true,
        studentId: true,
        className: true
      },
      take: 20 // 限制结果数量
    });

    // 检查每个用户的好友状态
    const usersWithFriendshipStatus = await Promise.all(
      users.map(async (user) => {
        // 检查好友关系
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: payload.sub, friendId: user.id },
              { userId: user.id, friendId: payload.sub }
            ]
          }
        });

        let friendshipStatus = 'none'; // none, pending, accepted, blocked
        let friendshipId = null;

        if (friendship) {
          friendshipStatus = friendship.status;
          friendshipId = friendship.id;
        }

        // 管理员默认与所有用户是"朋友"
        if (payload.isAdmin || user.isAdmin) {
          friendshipStatus = 'admin-default';
        }

        return {
          ...user,
          friendshipStatus,
          friendshipId
        };
      })
    );

    return NextResponse.json({ users: usersWithFriendshipStatus });

  } catch (error) {
    console.error('搜索用户失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
