import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  
  if (!token) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "无效的访问令牌" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        studentId: true,
        teacherId: true,
        personalEmail: true,
        name: true,
        nickname: true,
        zodiac: true,
        gender: true,
        birthDate: true,
        className: true,
        college: true,
        major: true,
        office: true,
        // 登录手机号功能已下线，不再返回 phone 字段
        contactPhone: true,
        accountType: true,
        isAdmin: true,
        isSuperAdmin: true,
        profileImage: true,
        hasUpdatedProfile: true,
        genderModified: true,
        nicknameModified: true,
        createdByType: true,
        createdAt: true,
        lastLocationName: true,
        lastWeatherSummary: true,
        lastWeatherTempC: true,
        lastWeatherUpdatedAt: true,
        lastDailyMessage: true,
        lastDailyAt: true,
        wechatOpenId: true,
        wechatUnionId: true,
        wechatBoundAt: true,
        weappOpenId: true,
        weappUnionId: true,
        weappBoundAt: true,
        securityEmail: true,
        securityEmailExempt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 查询待审核的姓名变更（最近一条）
    const pendingName = await prisma.accountChangeRequest.findFirst({
      where: { userId: payload.sub, changeType: 'name', status: 'pending' },
      orderBy: { createdAt: 'desc' }
    });

    // 合并扩展字段：在 user 对象上附加 pendingNameChangeTo 以便前端显示“原/新(待审核)”
    const responseUser: any = { ...user };
    if (pendingName?.newValue) {
      responseUser.pendingNameChangeTo = pendingName.newValue;
      responseUser.pendingNameChangeRequestId = pendingName.id;
    }

    return NextResponse.json({ user: responseUser });
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
