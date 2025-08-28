import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证是否为高级管理员
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isSuperAdmin: true, isAdmin: true }
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: "权限不足，需要高级管理员权限" }, { status: 403 });
    }

    // 获取系统统计数据，并确保总量为实时计算（避免脏数据导致统计不准）
    let stats = await prisma.systemStats.findFirst();

    // 实时统计总量
    const liveTotalUsers = await prisma.user.count();
    const liveTotalVisits = await prisma.userAction.count({ where: { actionType: 'page_visit' } });
    const liveTotalWeatherQueries = await prisma.userAction.count({ where: { actionType: 'weather_check' } });
    const liveTotalDailyMessages = await prisma.userAction.count({ where: { actionType: 'daily_quote' } });

    if (!stats) {
      stats = await prisma.systemStats.create({
        data: {
          totalUsers: liveTotalUsers,
          totalVisits: liveTotalVisits,
          totalWeatherQueries: liveTotalWeatherQueries,
          totalDailyMessages: liveTotalDailyMessages,
          onlineUsers: 0
        }
      });
    } else {
      // 与实时统计对齐，避免累计用户等数字不更新
      await prisma.systemStats.update({
        where: { id: stats.id },
        data: {
          totalUsers: liveTotalUsers,
          totalVisits: liveTotalVisits,
          totalWeatherQueries: liveTotalWeatherQueries,
          totalDailyMessages: liveTotalDailyMessages
        }
      });
    }

    // 更新在线用户数（活跃时间在5分钟内）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: fiveMinutesAgo
        }
      }
    });

    // 更新统计中的在线用户数
    await prisma.systemStats.update({ where: { id: stats.id }, data: { onlineUsers } });

    // 获取用户类型分布
    const userTypeStats = await prisma.user.groupBy({
      by: ['accountType'],
      _count: {
        id: true
      }
    });

    // 获取最近7天的活跃数据
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await prisma.userAction.groupBy({
      by: ['actionType'],
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      _count: {
        id: true
      }
    });

    // 获取最近注册的用户
    const recentUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        phone: true,
        studentId: true,
        college: true,
        major: true,
        accountType: true,
        createdByType: true,
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: true,
        lastActiveAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // 获取热门功能使用情况
    const popularFeatures = await prisma.userAction.groupBy({
      by: ['actionType'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    // 计算增长趋势（与上周对比）
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: twoWeeksAgo,
          lt: sevenDaysAgo
        }
      }
    });

    const thisWeekUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    const userGrowthRate = lastWeekUsers > 0 
      ? ((thisWeekUsers - lastWeekUsers) / lastWeekUsers * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      overview: {
        totalUsers: liveTotalUsers,
        totalVisits: liveTotalVisits,
        totalWeatherQueries: liveTotalWeatherQueries,
        totalDailyMessages: liveTotalDailyMessages,
        onlineUsers,
        userGrowthRate: `${userGrowthRate}%`
      },
      userTypeDistribution: userTypeStats.map(stat => ({
        type: stat.accountType,
        count: stat._count.id,
        label: stat.accountType === 'self' ? '注册用户' :
               stat.accountType === 'student' ? '学生' :
               stat.accountType === 'admin' ? '管理员' :
               stat.accountType === 'teacher' ? '教师' : stat.accountType
      })),
      recentActivity: recentActivity.map(activity => ({
        type: activity.actionType,
        count: activity._count.id,
        label: activity.actionType === 'daily_quote' ? '每日心语' :
               activity.actionType === 'weather_check' ? '天气查询' :
               activity.actionType === 'page_visit' ? '页面访问' :
               activity.actionType === 'profile_update' ? '资料更新' :
               activity.actionType === 'login' ? '用户登录' : activity.actionType
      })),
      popularFeatures: popularFeatures.map(feature => ({
        feature: feature.actionType,
        usage: feature._count.id,
        label: feature.actionType === 'daily_quote' ? '心语时刻' :
               feature.actionType === 'weather_check' ? '天气查询' :
               feature.actionType === 'page_visit' ? '页面访问' :
               feature.actionType === 'profile_update' ? '资料更新' :
               feature.actionType === 'login' ? '用户登录' :
               feature.actionType === 'password_reset' ? '密码重置' :
               feature.actionType === 'assessments' ? '心理测评' :
               feature.actionType === 'user_management' ? '用户管理' :
               feature.actionType === 'message_wall' ? '留言墙' :
               feature.actionType === 'chat' ? '心语聊天' : feature.actionType
      })),
      recentUsers: recentUsers.map(user => ({
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        studentId: user.studentId,
        college: (user as any).college,
        major: (user as any).major,
        accountType: user.accountType,
        createdByType: user.createdByType,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
        isOnline: user.lastActiveAt > fiveMinutesAgo
      }))
    });

  } catch (error) {
    console.error('获取管理员数据看板失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
