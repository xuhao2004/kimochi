import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 受控查看测评详情：仅当聊天室中存在一条 `assessment` 消息引用该测评，且请求方为该聊天室有效成员时，允许查看
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get("assessmentId");
    const messageId = searchParams.get("messageId");
    if (!assessmentId || !messageId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 查询消息并校验基本条件
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { chatRoom: { select: { id: true, type: true } } }
    });
    if (!message || message.isDeleted) {
      return NextResponse.json({ error: "消息不存在" }, { status: 404 });
    }
    if (message.messageType !== 'assessment' && message.messageType !== 'invite_assessment') {
      return NextResponse.json({ error: "消息类型不匹配" }, { status: 400 });
    }
    let payloadParsed: any = null;
    try { payloadParsed = JSON.parse(message.content); } catch {}
    const referencedId = message.messageType === 'assessment' ? payloadParsed?.id : payloadParsed?.assessmentId;
    if (!payloadParsed || String(referencedId || '') !== String(assessmentId)) {
      return NextResponse.json({ error: "消息未引用该测评" }, { status: 403 });
    }

    // 校验当前用户是否为聊天室成员
    const participant = await prisma.chatRoomParticipant.findFirst({
      where: { chatRoomId: message.chatRoomId, userId: payload.sub, isActive: true }
    });
    if (!participant) {
      return NextResponse.json({ error: "无权查看" }, { status: 403 });
    }

    // 加载测评详情（不限制 userId，但确保与消息发送者一致，避免越权拼接他人ID）
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId },
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
        personalityType: true,
        completionTime: true,
        isSerious: true,
        needsAttention: true
      }
    });
    if (!assessment) {
      return NextResponse.json({ error: "测评不存在" }, { status: 404 });
    }

    // 可选：确保是消息发送者的测评（避免引用他人任意ID）
    if (assessment.userId !== message.senderId) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    return NextResponse.json({
      assessment: {
        ...assessment,
        rawAnswers: assessment.rawAnswers ? JSON.parse(assessment.rawAnswers as any) : null,
        analysisResult: assessment.analysisResult ? JSON.parse(assessment.analysisResult as any) : null,
        psychologicalTags: assessment.psychologicalTags ? JSON.parse(assessment.psychologicalTags as any) : []
      }
    });
  } catch (e) {
    console.error('assessments/view GET error', e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}


