import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取测评详情
export async function GET(req: Request, context: { params: Promise<{ assessmentId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    
    // 构建查询条件：管理员可以查看所有测评，普通用户只能查看自己的测评
    const whereCondition = payload.isAdmin 
      ? { id: params.assessmentId }
      : { id: params.assessmentId, userId: payload.sub };
    
    const assessment = await prisma.assessment.findFirst({
      where: whereCondition,
      include: {
        answers: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            className: true,
            gender: true
          }
        }
      }
    });

    if (!assessment) {
      return NextResponse.json({ error: "测评不存在" }, { status: 404 });
    }

    // 解析JSON字段
    const result = {
      ...assessment,
      type: assessment.type === 'SDS' ? 'SDS/SAS' : assessment.type,
      rawAnswers: assessment.rawAnswers ? JSON.parse(assessment.rawAnswers) : null,
      analysisResult: assessment.analysisResult ? JSON.parse(assessment.analysisResult) : null,
      psychologicalTags: assessment.psychologicalTags ? JSON.parse(assessment.psychologicalTags) : [],
    };

    return NextResponse.json({ assessment: result });

  } catch (error) {
    console.error('获取测评详情失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 删除测评
export async function DELETE(req: Request, context: { params: Promise<{ assessmentId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    
    // 构建查询条件：管理员可以删除所有测评，普通用户只能删除自己的测评
    const whereCondition = payload.isAdmin 
      ? { id: params.assessmentId }
      : { id: params.assessmentId, userId: payload.sub };
    
    const assessment = await prisma.assessment.findFirst({
      where: whereCondition
    });

    if (!assessment) {
      return NextResponse.json({ error: "测评不存在" }, { status: 404 });
    }

    // 实现软删除：标记为用户删除，但不物理删除
    await prisma.assessment.update({
      where: { id: params.assessmentId },
      data: {
        deletedByUser: true,
        deletedAt: new Date()
      }
    });

    return NextResponse.json({ message: "测评已删除" });

  } catch (error) {
    console.error('删除测评失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
