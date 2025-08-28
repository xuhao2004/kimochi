import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordUserAction } from "@/lib/userActions";

export async function POST(req: Request) {
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
    const updateData = await req.json();

    // 验证数据
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
    }

    // 处理生日字段转换
    if (updateData.birthDate) {
      updateData.birthDate = new Date(updateData.birthDate);
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.sub },
      data: updateData,
      select: {
        id: true,
        email: true,
        studentId: true,
        name: true,
        nickname: true,
        zodiac: true,
        gender: true,
        birthDate: true,
        className: true,
        accountType: true,
        profileImage: true,
        hasUpdatedProfile: true,
        genderModified: true,
        nicknameModified: true,
        createdAt: true,
      },
    });

    // 记录个人资料更新行为
    await recordUserAction(payload.sub, "profile_update", {
      updatedFields: Object.keys(updateData),
      accountType: updatedUser.accountType
    });

    return NextResponse.json({ 
      user: updatedUser,
      message: "设置保存成功"
    });
  } catch (error) {
    console.error("更新用户设置失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
