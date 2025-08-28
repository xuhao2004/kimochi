import { NextRequest, NextResponse } from "next/server";
import { getWeather, reverseGeocode } from "@/lib/weather";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { recordUserAction } from "@/lib/userActions";
import { updateUserActivity, updateSystemStats } from "@/lib/userActivity";
import { NotificationService } from "@/lib/notificationService";
import { withErrorMonitoring, reportError } from "@/lib/errorMonitor";

async function handleWeatherRequest(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { lat, lon } = await req.json();
    if (typeof lat !== "number" || typeof lon !== "number") {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }
    const locationName = await reverseGeocode(lat, lon);
    const w = await getWeather(lat, lon);

    await prisma.user.update({
      where: { id: payload.sub },
      data: {
        lastLatitude: lat,
        lastLongitude: lon,
        lastLocationName: locationName,
        lastWeatherSummary: w.summary,
        lastWeatherTempC: w.temperatureC,
        lastWeatherUpdatedAt: new Date(),
      },
    });

    // 记录用户行为
    await recordUserAction(payload.sub, "weather_check", {
      location: locationName,
      weather: w.summary,
      temperature: w.temperatureC,
      lat,
      lon
    });

    // 更新用户活跃时间和系统统计
    await updateUserActivity(payload.sub);
    await updateSystemStats('weather');

    return NextResponse.json({ locationName, summary: w.summary, temperatureC: w.temperatureC });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "获取失败";
    
    // 获取用户信息用于错误报告
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    let userInfo = null;
    
    if (token) {
      try {
        const payload = verifyToken(token);
        if (payload) {
          const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, name: true, accountType: true }
          });
          if (user) {
            userInfo = { userId: user.id, userInfo: { name: user.name, accountType: user.accountType } };
          }
        }
      } catch {
        // 忽略用户信息获取失败
      }
    }
    
    // 使用新的错误报告系统
    await reportError(err, {
      feature: '天气查询',
      ...userInfo,
      additionalContext: {
        requestBody: await req.json().catch(() => ({})),
        userAgent: req.headers.get('user-agent')
      }
    });
    
    // 记录API失败通知（保持原有逻辑）
    try {
      if (message.includes('配额') || message.includes('limit') || message.includes('quota')) {
        await NotificationService.recordAPIFailure(
          '和风天气API',
          `天气API配额已达限制: ${message}`,
          'high'
        );
      } else if (message.includes('密钥') || message.includes('key') || message.includes('401')) {
        await NotificationService.recordAPIFailure(
          '和风天气API',
          `天气API密钥配置错误: ${message}`,
          'critical'
        );
      } else {
        await NotificationService.recordAPIFailure(
          '和风天气API',
          `天气API调用失败: ${message}`,
          'medium'
        );
      }
    } catch (notificationError) {
      console.error('Failed to create weather API failure notification:', notificationError);
    }
    
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// 导出带错误监控的处理函数
export const POST = withErrorMonitoring(handleWeatherRequest, '天气查询API');


