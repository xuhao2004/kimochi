import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 管理员获取所有用户的测评数据
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证管理员权限
    const admin = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!admin || !admin.isAdmin) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'SCL90' 或 'MBTI'
    const riskLevel = searchParams.get('riskLevel'); // 'low', 'medium', 'high'
    const needsAttention = searchParams.get('needsAttention'); // 'true' 或 'false'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { 
      OR: [
        { status: 'completed' },
        { status: 'analyzed' }
      ]
      // 管理员可以查看所有测评，包括用户删除的
    };
    
    if (type) where.type = type;
    if (riskLevel) where.riskLevel = riskLevel;
    if (needsAttention) where.needsAttention = needsAttention === 'true';

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        startedAt: true,
        completedAt: true,
        rawAnswers: true,
        analysisResult: true,
        psychologicalTags: true,
        overallScore: true,
        riskLevel: true,
        recommendations: true,
        personalityType: true, // 确保包含personalityType字段
        completionTime: true,
        isSerious: true,
        attentionCheckPass: true,
        currentPage: true,
        pausedAt: true,
        elapsedTime: true,
        deletedByUser: true,
        deletedAt: true,
        needsAttention: true,
        adminNotified: true,
        adminNotes: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            className: true,
            accountType: true,
            createdAt: true
          }
        },
        answers: {
          select: {
            questionId: true,
            answer: true,
            responseTime: true
          }
        }
      }
    });

    const total = await prisma.assessment.count({ where });

    // 处理数据，解析JSON字段
    const processedAssessments = assessments.map(assessment => ({
      ...assessment,
      rawAnswers: assessment.rawAnswers ? JSON.parse(assessment.rawAnswers) : null,
      analysisResult: assessment.analysisResult ? JSON.parse(assessment.analysisResult) : null,
      psychologicalTags: assessment.psychologicalTags ? JSON.parse(assessment.psychologicalTags) : [],
    }));

    return NextResponse.json({
      assessments: processedAssessments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取管理员测评数据失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 管理员更新测评记录（添加备注等）
export async function PUT(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证管理员权限
    const admin = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!admin || !admin.isAdmin) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { assessmentId, adminNotes, needsAttention } = await req.json();

    const updatedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        adminNotes,
        needsAttention
      }
    });

    return NextResponse.json({ assessment: updatedAssessment });

  } catch (error) {
    console.error('更新测评记录失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 管理员删除测评记录（硬删除）
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: "管理员权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const assessmentIds = searchParams.get('ids'); // 支持批量删除
    const deleteAll = searchParams.get('deleteAll') === 'true'; // 删除全部

    if (deleteAll) {
      // 删除所有测评记录
      const result = await prisma.assessment.deleteMany({});
      return NextResponse.json({ 
        message: `已删除 ${result.count} 条测评记录`,
        deletedCount: result.count 
      });
    } else if (assessmentIds) {
      // 删除指定的记录
      const idsArray = assessmentIds.split(',');
      const result = await prisma.assessment.deleteMany({
        where: {
          id: {
            in: idsArray
          }
        }
      });
      return NextResponse.json({ 
        message: `已删除 ${result.count} 条测评记录`,
        deletedCount: result.count 
      });
    } else {
      return NextResponse.json({ error: "请指定要删除的记录" }, { status: 400 });
    }

  } catch (error) {
    console.error('删除测评记录失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
