import { prisma } from "./prisma";

// 更新用户活跃时间
export async function updateUserActivity(userId: string) {
  try {
    // 首先检查用户是否存在
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      console.error('尝试为不存在的用户记录行为:', userId);
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() }
    });
  } catch (error) {
    console.error('更新用户活跃时间失败:', error);
  }
}

// 获取在线用户数量
export async function getOnlineUserCount(): Promise<number> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const count = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: fiveMinutesAgo
        }
      }
    });
    return count;
  } catch (error) {
    console.error('获取在线用户数量失败:', error);
    return 0;
  }
}

// 更新系统统计
export async function updateSystemStats(type: 'visit' | 'weather' | 'daily') {
  try {
    const field = type === 'visit' ? 'totalVisits' :
                 type === 'weather' ? 'totalWeatherQueries' :
                 'totalDailyMessages';
    
    await prisma.systemStats.updateMany({
      data: {
        [field]: {
          increment: 1
        }
      }
    });
  } catch (error) {
    console.error('更新系统统计失败:', error);
  }
}
