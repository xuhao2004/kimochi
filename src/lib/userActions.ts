import { prisma } from "@/lib/prisma";

export type ActionType = "daily_quote" | "weather_check" | "login" | "profile_update" | "avatar_upload" | "page_visit" | "upload_image";

// 记录用户行为
export async function recordUserAction(
  userId: string, 
  actionType: ActionType, 
  metadata?: Record<string, unknown>
) {
  try {
    // 先检查用户是否存在
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    
    if (!userExists) {
      console.warn(`尝试为不存在的用户记录行为: ${userId}`);
      return;
    }

    await prisma.userAction.create({
      data: {
        userId,
        actionType,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error("记录用户行为失败:", error);
    // 不抛出错误，避免影响主要功能
  }
}

// 获取用户统计数据
export async function getUserStats(userId: string) {
  try {
    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        lastWeatherSummary: true,
        lastWeatherUpdatedAt: true,
        lastDailyAt: true,
      },
    });

    if (!user) {
      throw new Error("用户不存在");
    }

    // 统计各类行为次数和测评次数
    const [
      dailyQuoteCount,
      weatherCheckCount,
      loginCount,
      profileUpdateCount,
      totalAssessments,
      completedThisMonth,
      allActions
    ] = await Promise.all([
      // 心语生成次数
      prisma.userAction.count({
        where: { userId, actionType: "daily_quote" },
      }),
      // 天气查询次数
      prisma.userAction.count({
        where: { userId, actionType: "weather_check" },
      }),
      // 登录次数
      prisma.userAction.count({
        where: { userId, actionType: "login" },
      }),
      // 个人资料更新次数
      prisma.userAction.count({
        where: { userId, actionType: "profile_update" },
      }),
      // 累计测评次数
      prisma.assessment.count({
        where: { 
          userId,
          status: { in: ['completed', 'analyzed'] }
        }
      }),
      // 本月完成测评次数
      prisma.assessment.count({
        where: { 
          userId,
          status: { in: ['completed', 'analyzed'] },
          completedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      // 获取所有行为记录用于分析
      prisma.userAction.findMany({
        where: { userId },
        select: {
          actionType: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 计算使用天数
    const now = new Date();
    const accountAge = Math.max(1, Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    // 分析最活跃时段（精确到半点）
    let mostActiveTime = "14:00"; // 默认下午2点
    if (allActions.length > 0) {
      const timeCounts: Record<string, number> = {};
      allActions.forEach(action => {
        const date = new Date(action.createdAt);
        const hour = date.getHours();
        const minute = date.getMinutes();
        // 精确到半点：0-29分归为:00，30-59分归为:30
        const halfHour = minute < 30 ? "00" : "30";
        const timeKey = `${hour.toString().padStart(2, '0')}:${halfHour}`;
        timeCounts[timeKey] = (timeCounts[timeKey] || 0) + 1;
      });
      
      // 找到使用最频繁的时间段
      let maxCount = 0;
      Object.entries(timeCounts).forEach(([time, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostActiveTime = time;
        }
      });
    }

    // 分析最常见天气
    let favoriteWeather = "多云";
    const weatherActions = allActions.filter(action => action.actionType === "weather_check");
    if (weatherActions.length > 0) {
      const weatherCounts: Record<string, number> = {};
      weatherActions.forEach(action => {
        if (action.metadata) {
          try {
            const metadata = JSON.parse(action.metadata);
            const weather = metadata.weather;
            if (weather && typeof weather === 'string') {
              weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
            }
          } catch {
            // 忽略JSON解析错误
          }
        }
      });

      let maxCount = 0;
      Object.entries(weatherCounts).forEach(([weather, count]) => {
        if (count > maxCount) {
          maxCount = count;
          favoriteWeather = weather;
        }
      });
    }

    // 获取最后活跃时间
    const lastAction = allActions[0];
    const lastActiveDate = lastAction ? lastAction.createdAt.toISOString() : user.createdAt.toISOString();

    return {
      totalDailyQuotes: dailyQuoteCount,
      weatherUpdates: weatherCheckCount,
      accountAge,
      lastActiveDate,
      favoriteWeather,
      mostActiveTime,
      loginCount,
      profileUpdateCount,
      totalActions: allActions.length,
      totalAssessments,
      completedThisMonth,
    };
  } catch (error) {
    console.error("获取用户统计数据失败:", error);
    throw error;
  }
}
