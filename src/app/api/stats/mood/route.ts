import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateUserActivity } from '@/lib/userActivity';

// 获取心情统计数据
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const userId = decoded.sub;
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || '7d'; // 7d, 30d, 90d, all
    const type = searchParams.get('type') || 'personal'; // personal, global

    // 计算时间范围
    let startDate: Date | undefined;
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = undefined;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // 构建查询条件
    const whereCondition: any = {
      mood: { not: null },
      isDeleted: false
    };

    if (startDate) {
      whereCondition.createdAt = { gte: startDate };
    }

    if (type === 'personal') {
      whereCondition.userId = userId;
    }

    // 获取心情数据
    const posts = await prisma.post.findMany({
      where: whereCondition,
      select: {
        mood: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            accountType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 统计心情分布
    const moodDistribution: Record<string, number> = {};
    const moodTrends: Record<string, Array<{ date: string; count: number }>> = {};
    const dailyMoodCounts: Record<string, Record<string, number>> = {};

    posts.forEach(post => {
      if (post.mood) {
        // 提取心情表情（去除文字部分）
        const moodEmoji = post.mood.split(' ')[0];
        const moodText = post.mood;
        
        // 心情分布统计
        moodDistribution[moodText] = (moodDistribution[moodText] || 0) + 1;
        
        // 按日期分组统计
        const dateKey = post.createdAt.toISOString().split('T')[0];
        if (!dailyMoodCounts[dateKey]) {
          dailyMoodCounts[dateKey] = {};
        }
        dailyMoodCounts[dateKey][moodText] = (dailyMoodCounts[dateKey][moodText] || 0) + 1;
      }
    });

    // 转换为趋势数据
    Object.keys(moodDistribution).forEach(mood => {
      moodTrends[mood] = Object.entries(dailyMoodCounts)
        .map(([date, moods]) => ({
          date,
          count: moods[mood] || 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    });

    // 获取最常见的心情
    const sortedMoods = Object.entries(moodDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    // 计算心情变化趋势
    const recentPosts = posts.slice(0, 10);
    const moodHistory = recentPosts.map(post => ({
      mood: post.mood,
      date: post.createdAt.toISOString(),
      user: type === 'global' ? {
        name: post.user.nickname || post.user.name,
        accountType: post.user.accountType
      } : undefined
    }));

    // 心情健康度评分（简单算法）
    const positiveEmojis = ['😊', '😄', '😍', '😎', '🤗', '🥳', '😌'];
    const neutralEmojis = ['🤔', '😪', '🙂'];
    const negativeEmojis = ['😢', '😤', '😴', '😵', '😭', '🥺'];

    let healthScore = 50; // 基础分50
    
    Object.entries(moodDistribution).forEach(([mood, count]) => {
      const emoji = mood.split(' ')[0];
      if (positiveEmojis.includes(emoji)) {
        healthScore += count * 2;
      } else if (negativeEmojis.includes(emoji)) {
        healthScore -= count * 1;
      }
    });

    healthScore = Math.max(0, Math.min(100, healthScore));

    // 生成心情建议
    const suggestions = generateMoodSuggestions(moodDistribution, healthScore);

    // 更新用户活动
    await updateUserActivity(userId);

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        type,
        totalPosts: posts.length,
        moodDistribution,
        moodTrends,
        topMoods: sortedMoods,
        recentMoodHistory: moodHistory,
        healthScore: Math.round(healthScore),
        suggestions,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取心情统计失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 生成心情建议
function generateMoodSuggestions(moodDistribution: Record<string, number>, healthScore: number): string[] {
  const suggestions: string[] = [];
  
  const totalMoods = Object.values(moodDistribution).reduce((sum, count) => sum + count, 0);
  if (totalMoods === 0) {
    return ['开始记录你的心情，了解自己的情绪变化吧！'];
  }

  // 分析负面情绪比例
  const negativeCount = Object.entries(moodDistribution)
    .filter(([mood]) => ['😢', '😤', '😭', '🥺'].some(emoji => mood.includes(emoji)))
    .reduce((sum, [, count]) => sum + count, 0);
  
  const negativeRatio = negativeCount / totalMoods;

  if (healthScore >= 80) {
    suggestions.push('你的心情状态很好！继续保持积极的生活态度。');
  } else if (healthScore >= 60) {
    suggestions.push('整体心情不错，可以尝试一些新的活动来提升幸福感。');
  } else if (healthScore >= 40) {
    suggestions.push('注意调节情绪，适当运动和社交有助于改善心情。');
  } else {
    suggestions.push('最近心情似乎不太好，建议与朋友聊天或寻求专业帮助。');
  }

  if (negativeRatio > 0.4) {
    suggestions.push('负面情绪较多，建议：深呼吸、听音乐、与信任的人分享。');
  }

  // 根据最常见心情给建议
  const topMood = Object.entries(moodDistribution).sort(([,a], [,b]) => b - a)[0];
  if (topMood) {
    const [mood] = topMood;
    if (mood.includes('😴') || mood.includes('😪')) {
      suggestions.push('注意休息，保证充足睡眠对心情很重要。');
    } else if (mood.includes('🤔')) {
      suggestions.push('思考是好事，但也要给大脑适当的放松时间。');
    }
  }

  return suggestions.slice(0, 3); // 最多返回3条建议
}
