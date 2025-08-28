import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || !payload.isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      phone: true,
      studentId: true,
      name: true,
      nickname: true,
      zodiac: true,
      gender: true,
      className: true,
      college: true,
      major: true,
      accountType: true,
      createdByType: true,
      isAdmin: true,
      isSuperAdmin: true,
      hasUpdatedProfile: true,
      createdAt: true,
      lastLocationName: true,
      lastWeatherSummary: true,
      lastWeatherTempC: true,
      lastWeatherUpdatedAt: true,
      lastDailyMessage: true,
      lastDailyAt: true,
    },
  });

  return NextResponse.json({ users });
}


