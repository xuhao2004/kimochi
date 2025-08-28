import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SSE } from "@/lib/sse";

export async function PUT(req: Request, context: { params: Promise<{ inviteId: string }> }) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const params = await context.params;
    const { action } = await req.json(); // 'accept' | 'reject' | 'cancel'

    let invite = await prisma.assessmentInvite.findUnique({ where: { id: params.inviteId } });
    if (!invite) {
      // 兼容前端仅传 messageId 的情况
      const byMessage = await prisma.assessmentInvite.findFirst({ where: { messageId: params.inviteId } });
      if (byMessage) invite = byMessage;
    }
    if (!invite) return NextResponse.json({ error: '邀请不存在' }, { status: 404 });

    // 权限校验
    if (action === 'accept' || action === 'reject') {
      if (invite.inviteeId !== payload.sub) return NextResponse.json({ error: '无权操作' }, { status: 403 });
      if (invite.status !== 'pending') return NextResponse.json({ error: '邀请状态不可操作' }, { status: 400 });
    } else if (action === 'cancel') {
      if (invite.inviteeId !== payload.sub) return NextResponse.json({ error: '无权操作' }, { status: 403 });
      if (!['pending','accepted'].includes(invite.status)) return NextResponse.json({ error: '邀请状态不可取消' }, { status: 400 });
    } else {
      return NextResponse.json({ error: '无效动作' }, { status: 400 });
    }

    let newStatus = invite.status;
    if (action === 'accept') newStatus = 'accepted';
    if (action === 'reject') newStatus = 'rejected';
    if (action === 'cancel') newStatus = 'canceled';

    const updated = await prisma.assessmentInvite.update({ where: { id: invite.id }, data: { status: newStatus } });

    // 若取消，清理关联的测评记录与进度，避免保留历史且不影响后续邀请
    if (action === 'cancel') {
      try {
        if (invite.assessmentId) {
          await prisma.assessment.updateMany({
            where: { id: invite.assessmentId, userId: payload.sub },
            data: {
              deletedByUser: true,
              rawAnswers: null,
              currentPage: 0,
              elapsedTime: 0,
              pausedAt: null
            }
          });
        }
      } catch (e) {
        console.error('cancel invite: clear assessment failed', e);
      }
    }

    // 更新消息卡片
    const msg = await prisma.chatMessage.findUnique({ where: { id: invite.messageId } });
    if (msg) {
      let content: any = {};
      try { content = JSON.parse(msg.content || '{}'); } catch {}
      const newPayload: any = { ...content, status: newStatus };
      // 当受邀方接受时，将状态标记为已接受且尚未开始inProgress=false、paused=true，供前端显示“继续/取消”
      if (newStatus === 'accepted') {
        newPayload.inProgress = true;
        newPayload.paused = false;
        newPayload.progress = content.progress || { answeredCount: 0, total: content?.progress?.total || 0, percent: 0 };
      } else if (newStatus === 'canceled') {
        // 取消后清空进度，双方卡片不再显示继续按钮
        newPayload.inProgress = false;
        newPayload.paused = false;
        const total = content?.progress?.total || 0;
        newPayload.progress = { answeredCount: 0, total, percent: 0 };
        // 解绑 assessmentId，避免误续接
        if (newPayload.assessmentId) delete newPayload.assessmentId;
      }
      await prisma.chatMessage.update({ where: { id: msg.id }, data: { content: JSON.stringify(newPayload) } });
      try { await SSE.sendToChatRoom(invite.chatRoomId, 'chat_message', { roomId: invite.chatRoomId, message: { ...msg, content: JSON.stringify(newPayload) } }); } catch {}
    }

    return NextResponse.json({ invite: updated });
  } catch (e) {
    console.error('invite action error', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


