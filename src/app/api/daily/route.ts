import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDailySentence } from "@/lib/daily";
import { recordUserAction } from "@/lib/userActions";
import { updateUserActivity, updateSystemStats } from "@/lib/userActivity";

// 获取今日心语（如果已生成）
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    // 检查是否有今日心语
    if (user.lastDailyMessage && user.lastDailyAt) {
      const today = new Date();
      const lastDaily = new Date(user.lastDailyAt);
      
      // 检查是否是同一天
      const isSameDay = today.getFullYear() === lastDaily.getFullYear() &&
                       today.getMonth() === lastDaily.getMonth() &&
                       today.getDate() === lastDaily.getDate();
      
      if (isSameDay) {
        return NextResponse.json({ sentence: user.lastDailyMessage });
      }
    }

    // 没有今日心语
    return NextResponse.json({ sentence: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "获取失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    const zodiac = user.zodiac ?? "白羊座"; // 为学号用户提供默认星座
    const weather = user.lastWeatherSummary ?? "多云";
    const locationName = user.lastLocationName ?? "你所在的地方";
    const sentence = await generateDailySentence({ zodiac, weather, locationName });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastDailyMessage: sentence, lastDailyAt: new Date() },
    });

    // 记录用户行为
    await recordUserAction(user.id, "daily_quote", {
      zodiac,
      weather,
      locationName,
      sentence: sentence.substring(0, 50) + "..." // 只记录前50个字符
    });

    // 更新用户活跃时间和系统统计
    await updateUserActivity(user.id);
    await updateSystemStats('daily');

    return NextResponse.json({ sentence });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


