import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取用户最近的测评记录（最多5条）
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: "用户不存在，请重新登录", 
        code: "USER_NOT_FOUND" 
      }, { status: 401 });
    }

    // 获取最近的测评记录（排除用户已删除的）
    const recentAssessments = await prisma.assessment.findMany({
      where: { 
        userId: payload.sub,
        status: { in: ['completed', 'analyzed'] },
        deletedByUser: false
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        completedAt: true,
        overallScore: true,
        riskLevel: true,
        psychologicalTags: true,
        recommendations: true,
        personalityType: true
      }
    });

    // 获取测评统计
    const totalAssessments = await prisma.assessment.count({
      where: { 
        userId: payload.sub,
        status: { in: ['completed', 'analyzed'] }
      }
    });

    const completedThisMonth = await prisma.assessment.count({
      where: { 
        userId: payload.sub,
        status: { in: ['completed', 'analyzed'] },
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    return NextResponse.json({ 
      recentAssessments,
      stats: {
        totalAssessments,
        completedThisMonth
      }
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "获取失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
