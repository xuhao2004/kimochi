import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取用户的测评记录
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'SCL90' | 'MBTI' | 'SDS' | 'SDS/SAS'
    const normalizedType = type === 'SDS/SAS' ? 'SDS' : type;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 如果提供了 id，则返回该测评的详细信息（仅限本人、且未被删除）
    if (id) {
      const assessment = await prisma.assessment.findFirst({
        where: { id, userId: payload.sub, deletedByUser: false },
        select: {
          id: true,
          userId: true,
          type: true,
          status: true,
          startedAt: true,
          completedAt: true,
          currentPage: true,
          elapsedTime: true,
          pausedAt: true,
          rawAnswers: true,
          analysisResult: true,
          psychologicalTags: true,
          overallScore: true,
          riskLevel: true,
          recommendations: true,
          personalityType: true,
          completionTime: true,
          isSerious: true,
          needsAttention: true
        }
      });

      if (!assessment) {
        return NextResponse.json({ error: "测评不存在" }, { status: 404 });
      }

      // 对外统一将 SDS 显示为 SDS/SAS
      const responseAssessment: any = {
        ...assessment,
        type: assessment.type === 'SDS' ? 'SDS/SAS' : assessment.type,
        currentPage: assessment.currentPage ?? 0,
        elapsedTime: assessment.elapsedTime ?? 0,
        pausedAt: assessment.pausedAt ?? null,
        rawAnswers: assessment.rawAnswers ? JSON.parse(assessment.rawAnswers) : null,
        analysisResult: assessment.analysisResult ? JSON.parse(assessment.analysisResult) : null,
        psychologicalTags: assessment.psychologicalTags ? JSON.parse(assessment.psychologicalTags) : []
      };
      return NextResponse.json({ assessment: responseAssessment });
    }

    const where: any = { 
      userId: payload.sub,
      deletedByUser: false // 只显示未删除的测评
    };
    if (normalizedType) {
      where.type = normalizedType;
    }

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        startedAt: true,
        completedAt: true,
        overallScore: true,
        riskLevel: true,
        psychologicalTags: true,
        recommendations: true,
        isSerious: true,
        personalityType: true
      }
    });

    const total = await prisma.assessment.count({ where });

    return NextResponse.json({
      assessments: assessments.map(assessment => ({
        ...assessment,
        type: assessment.type === 'SDS' ? 'SDS/SAS' : assessment.type,
        psychologicalTags: assessment.psychologicalTags ? JSON.parse(assessment.psychologicalTags) : []
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取测评记录失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 创建新的测评
export async function POST(req: Request) {
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

    const { type, inviteId } = await req.json();
    const normalizedType = type === 'SDS/SAS' ? 'SDS' : type;

    if (!['SCL90', 'MBTI', 'SDS', 'SDS/SAS'].includes(type)) {
      return NextResponse.json({ error: "无效的测评类型" }, { status: 400 });
    }

    // 若存在进行中的同类型测评，则直接复用最新一条；若显式要求替换，可在此处实现覆盖策略
    // 需求：同一类型只允许存在一个未完成，若再次开启则自动替换旧记录
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        userId: payload.sub,
        type: normalizedType,
        status: 'in_progress',
        deletedByUser: false
      },
      orderBy: { startedAt: 'desc' }
    });

    // 创建新测评（自动失效旧的未完成记录，保证同一类型仅1个未完成）
    await prisma.assessment.updateMany({
      where: { userId: payload.sub, type: normalizedType, status: 'in_progress', deletedByUser: false },
      data: { deletedByUser: true, deletedAt: new Date() }
    });

    const assessment = await prisma.assessment.create({
      data: {
        userId: payload.sub,
        type: normalizedType,
        status: 'in_progress'
      }
    });

    // 若为受邀创建，绑定邀请并更新卡片状态
    if (inviteId) {
      try {
        const invite = await prisma.assessmentInvite.findFirst({ where: { id: inviteId, inviteeId: payload.sub, status: 'accepted' } });
        if (invite) {
          await prisma.assessmentInvite.update({ where: { id: invite.id }, data: { assessmentId: assessment.id } });
        }
      } catch {}
    }

    const patched = { ...assessment, type: assessment.type === 'SDS' ? 'SDS/SAS' : assessment.type };
    return NextResponse.json({ assessment: patched });

  } catch (error) {
    console.error('创建测评失败:', error);
    
    // 检查是否是外键约束错误
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ 
        error: "用户认证失败，请重新登录", 
        code: "USER_NOT_FOUND" 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: "创建测评失败，请稍后重试", 
      details: error instanceof Error ? error.message : "未知错误"
    }, { status: 500 });
  }
}
