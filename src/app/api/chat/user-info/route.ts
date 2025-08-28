import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取用户详细信息（用于聊天界面显示）
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        nickname: true,
        profileImage: true,
        gender: true,
        zodiac: true,
        accountType: true,
        isAdmin: true,
        isSuperAdmin: true,
        className: true,
        college: true,
        major: true,
        office: true,
        phone: true,
        lastActiveAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 获取最近的测评结果
    const recentAssessments = await prisma.assessment.findMany({
      where: {
        userId: userId,
        status: 'completed',
        deletedByUser: false
      },
      orderBy: { completedAt: 'desc' },
      take: 2, // 获取最近两次测评
      select: {
        id: true,
        type: true,
        completedAt: true,
        psychologicalTags: true,
        personalityType: true,
        riskLevel: true,
        overallScore: true
      }
    });

    // 处理测评结果
    const processedAssessments = recentAssessments.map(assessment => ({
      id: assessment.id,
      type: assessment.type,
      completedAt: assessment.completedAt,
      psychologicalTags: assessment.psychologicalTags ? JSON.parse(assessment.psychologicalTags) : null,
      personalityType: assessment.personalityType,
      riskLevel: assessment.riskLevel,
      overallScore: assessment.overallScore
    }));

    // 根据用户类型准备显示信息
    const displayInfo: any = {
      ...user,
      recentAssessments: processedAssessments
    };

    // 添加在线状态
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    displayInfo.isOnline = user.lastActiveAt > fiveMinutesAgo;

    return NextResponse.json({ userInfo: displayInfo });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
