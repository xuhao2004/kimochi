import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIAssessmentAnalyzer } from "@/lib/assessments/aiAnalyzer";
import { getMBTIDedupedBank } from "@/lib/assessments/mbti_banks";
import { SSE } from "@/lib/sse";

// 提交测评答案并进行AI分析
export async function POST(req: Request, context: { params: Promise<{ assessmentId: string }> }) {
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

    const { answers, completionTime } = await req.json();

    const params = await context.params;
    
    // 验证测评存在且属于当前用户
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: params.assessmentId,
        userId: payload.sub,
        status: 'in_progress'
      }
    });

    if (!assessment) {
      return NextResponse.json({ error: "测评不存在或已完成" }, { status: 404 });
    }

    // 保存答题详情
    const answerEntries = Object.entries(answers).map(([questionId, answer]) => ({
      assessmentId: params.assessmentId,
      questionId,
      answer: String(answer)
    }));

    await prisma.assessmentAnswer.createMany({
      data: answerEntries
    });

    // 进行AI分析
    const analyzer = new AIAssessmentAnalyzer();
    let analysisResult;

    if (assessment.type === 'SCL90') {
      // 转换答案为数字格式
      const numericAnswers: Record<string, number> = {};
      Object.entries(answers).forEach(([key, value]) => {
        numericAnswers[key] = Number(value);
      });
      analysisResult = await analyzer.analyzeSCL90(numericAnswers, completionTime);
    } else if (assessment.type === 'MBTI') {
      // 新版MBTI：若答案键为数字，视为AB两选题库，使用去重后的完整题库进行AI推断（全量送入，不抽样）
      const keys = Object.keys(answers || {});
      const isAB = keys.every(k => /^\d+$/.test(k));
      if (isAB) {
        const bank = getMBTIDedupedBank();
        analysisResult = await analyzer.analyzeMBTI(answers as Record<string, string>, completionTime, bank);
      } else {
        analysisResult = await analyzer.analyzeMBTI(answers as Record<string, string>, completionTime);
      }
    } else if (assessment.type === 'SDS') {
      const numeric: Record<string, number> = {};
      Object.entries(answers).forEach(([k,v]) => { numeric[k] = Number(v); });
      analysisResult = await analyzer.analyzeSDS(numeric, completionTime);
    } else {
      return NextResponse.json({ error: "不支持的测评类型" }, { status: 400 });
    }

    // 更新测评记录
    const updateData: any = {
      status: 'completed',
      completedAt: new Date(),
      rawAnswers: JSON.stringify(answers),
      analysisResult: JSON.stringify(analysisResult),
      psychologicalTags: JSON.stringify(analysisResult.psychologicalTags),
      overallScore: analysisResult.overallScore,
      riskLevel: analysisResult.riskLevel,
      recommendations: analysisResult.recommendations,
      completionTime,
      isSerious: analysisResult.isSerious,
      needsAttention: 'needsAttention' in analysisResult ? analysisResult.needsAttention : false
    };

    // 对于MBTI测试，保存人格类型
    if (assessment.type === 'MBTI' && 'personalityType' in analysisResult) {
      const personalityType = (analysisResult as any).personalityType;
      if ('description' in analysisResult && (analysisResult as any).description?.name) {
        const description = (analysisResult as any).description;
        updateData.personalityType = `${personalityType}-${description.name}`;
      } else {
        updateData.personalityType = personalityType;
      }
    }


    const updatedAssessment = await prisma.assessment.update({
      where: { id: params.assessmentId },
      data: updateData
    });

    // 若该测评来自邀请，更新邀请状态并广播卡片更新
    try {
      const invite = await prisma.assessmentInvite.findFirst({ where: { assessmentId: params.assessmentId } });
      if (invite) {
        await prisma.assessmentInvite.update({ where: { id: invite.id }, data: { status: 'completed', updatedAt: new Date() } });
        // 更新原卡片消息内容为简要结果可见
        const msg = await prisma.chatMessage.findUnique({ where: { id: invite.messageId } });
        if (msg) {
          let content: any = {};
          try { content = JSON.parse(msg.content || '{}'); } catch {}
          const summary = analysisResult?.overallScore != null
            ? `${assessment.type === 'MBTI' ? ((analysisResult as any).personalityType || '已完成') : '总体分 ' + String(analysisResult.overallScore)}`
            : '已完成';
          const newPayload = { ...content, status: 'completed', assessmentId: params.assessmentId, summary, inProgress: false, paused: false, progress: { ...(content.progress||{}), percent: 100 } };
          await prisma.chatMessage.update({ where: { id: msg.id }, data: { content: JSON.stringify(newPayload) } });
          try { await SSE.sendToChatRoom(invite.chatRoomId, 'chat_message', { roomId: invite.chatRoomId, message: { ...msg, content: JSON.stringify(newPayload) } }); } catch {}
        }
      }
    } catch {}

    // 如果需要管理员关注，创建预警消息
    if ('needsAttention' in analysisResult && analysisResult.needsAttention) {
      await createAdminAlert(payload.sub, assessment.type, analysisResult);
    }

    // 统一输出类型为 SDS/SAS（仅对响应显示层）
    const responseAssessment = { ...updatedAssessment, type: updatedAssessment.type === 'SDS' ? 'SDS/SAS' : updatedAssessment.type };
    return NextResponse.json({ 
      assessment: responseAssessment,
      analysis: analysisResult
    });

  } catch (error) {
    console.error('提交测评失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 创建管理员预警消息
async function createAdminAlert(userId: string, assessmentType: string, analysis: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, studentId: true, email: true }
    });

    if (!user) return;

    const userIdentifier = user.studentId || user.email || user.name;
    
    await prisma.adminMessage.create({
      data: {
        type: 'assessment_alert',
        title: `${assessmentType}测评异常关注`,
        content: `用户 ${userIdentifier}（${user.name}）的${assessmentType}测评结果显示需要关注：
        
风险等级：${analysis.riskLevel}
心理标签：${analysis.psychologicalTags?.join(', ') || '无'}
建议：${analysis.recommendations || '建议专业关注'}

请及时关注该用户的心理状况。`,
        userId,
        priority: analysis.riskLevel === 'high' ? 'urgent' : 'high'
      }
    });

    // 标记测评为已通知管理员
    await prisma.assessment.updateMany({
      where: { 
        userId,
        type: assessmentType,
        status: 'completed'
      },
      data: { adminNotified: true }
    });

  } catch (error) {
    console.error('创建管理员预警失败:', error);
  }
}
