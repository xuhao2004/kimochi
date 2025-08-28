import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createAdminUser, createAdminSchema } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 创建超级管理员（仅已登录的超级管理员可调用）
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 校验调用者是否为超级管理员
    const caller = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isSuperAdmin: true } });
    if (!caller?.isSuperAdmin) {
      return NextResponse.json({ error: "权限不足，需要超级管理员权限" }, { status: 403 });
    }

    const body = await req.json();
    // 复用管理员 schema，但强制 isSuperAdmin: true
    const parsed = createAdminSchema.parse({
      account: body.account,
      password: body.password,
      name: body.name || "超级管理员",
      isSuperAdmin: true,
    });

    // 业务规则：为避免无法登录的超管，要求账号为邮箱或工号
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.account);
    const isWorkId = /^[A-Za-z0-9]{3,20}$/.test(parsed.account); // 工号格式：3-20位字母数字
    if (!isEmail && !isWorkId) {
      return NextResponse.json({ error: "仅支持邮箱或工号作为登录账号" }, { status: 400 });
    }

    const admin = await createAdminUser({ ...parsed, isSuperAdmin: true });
    return NextResponse.json({ message: "超级管理员创建成功", admin });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("创建超级管理员失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}


