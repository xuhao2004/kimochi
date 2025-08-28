import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SSE } from "@/lib/sse";
 

// 保存测评进度
export async function PUT(req: Request, context: { params: Promise<{ assessmentId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { currentPage, answers, elapsedTime, isPaused } = await req.json();
    
    // 构建查询条件：管理员可以操作所有测评，普通用户只能操作自己的测评
    const whereCondition = payload.isAdmin 
      ? { id: params.assessmentId }
      : { id: params.assessmentId, userId: payload.sub };
    
    const assessment = await prisma.assessment.findFirst({
      where: whereCondition
    });

    if (!assessment) {
      return NextResponse.json({ error: "测评不存在" }, { status: 404 });
    }

    // 解析服务端已保存的进度，用于与本次进度合并以避免回退
    let serverAnswers: Record<string, any> = {};
    try { serverAnswers = assessment.rawAnswers ? JSON.parse(assessment.rawAnswers as any) : {}; } catch { serverAnswers = {}; }
    const incomingAnswers = answers && typeof answers === 'object' ? answers as Record<string, any> : {};
    // 合并答案：以请求覆盖相同题目，其他保留服务端，防止回退为 {} 或更少
    const mergedAnswers = { ...serverAnswers, ...incomingAnswers };
    const finalAnswers = Object.keys(incomingAnswers).length === 0 ? (serverAnswers || {}) : mergedAnswers;
    // 页码与用时不回退
    const serverPage = typeof (assessment as any).currentPage === 'number' ? (assessment as any).currentPage : 0;
    const incomingPage = typeof currentPage === 'number' ? currentPage : 0;
    const finalPage = Math.max(serverPage, incomingPage);
    const serverElapsed = typeof (assessment as any).elapsedTime === 'number' ? (assessment as any).elapsedTime : 0;
    const incomingElapsed = typeof elapsedTime === 'number' ? elapsedTime : 0;
    const finalElapsed = Math.max(serverElapsed, incomingElapsed);

    // 仅当明确传入 isPaused 布尔值时才更新 pausedAt；否则保留原值
    const pausedAtUpdate = typeof isPaused === 'boolean' ? (isPaused ? new Date() : null) : (assessment as any).pausedAt ?? null;

    // 更新进度
    const updatedAssessment = await prisma.assessment.update({
      where: { id: params.assessmentId },
      data: {
        currentPage: finalPage,
        rawAnswers: JSON.stringify(finalAnswers),
        elapsedTime: finalElapsed,
        pausedAt: pausedAtUpdate
      }
    });

    // 若来自邀请，回写暂停状态供卡片显示进度/继续
    try {
      const invite = await prisma.assessmentInvite.findFirst({ where: { assessmentId: params.assessmentId } });
      if (invite) {
        const msg = await prisma.chatMessage.findUnique({ where: { id: invite.messageId } });
        if (msg) {
          let content: any = {};
          try { content = JSON.parse(msg.content || '{}'); } catch {}
          const answeredCount = finalAnswers && typeof finalAnswers === 'object' ? Object.keys(finalAnswers).length : (content?.progress?.answeredCount ?? 0);
          // 简易推断总题量：沿用 assessment.type
          let total = content?.progress?.total || 0;
          try {
            const type = (assessment.type || '').toUpperCase();
            if (!total) {
              if (type === 'SCL90') total = 90;
              else if (type === 'MBTI') total = 93; // 以去重后题库为上限；运行时可能不同，作为近似
              else if (type === 'SDS') total = 40; // SDS+SAS
            }
          } catch {}
          const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((answeredCount / total) * 100))) : 0;
          const newPayload = {
            ...content,
            status: 'accepted',
            inProgress: typeof isPaused === 'boolean' ? !isPaused : content?.inProgress ?? true,
            paused: typeof isPaused === 'boolean' ? !!isPaused : content?.paused ?? false,
            progress: { ...(content.progress || {}), answeredCount, total, percent }
          };
          await prisma.chatMessage.update({ where: { id: msg.id }, data: { content: JSON.stringify(newPayload) } });
          try { await SSE.sendToChatRoom(invite.chatRoomId, 'chat_message', { roomId: invite.chatRoomId, message: { ...msg, content: JSON.stringify(newPayload) } }); } catch {}
        }
      }
    } catch {}

    return NextResponse.json({ message: "进度已保存", assessment: updatedAssessment });

  } catch (error) {
    console.error('保存进度失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
