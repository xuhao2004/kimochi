import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  newName: z.string().min(1, '新姓名不能为空').max(50, '姓名过长'),
  reason: z.string().min(1, '请填写申请理由').max(500, '理由不能超过500字')
});

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    const token = auth?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });

    const body = await request.json();
    const { newName, reason } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { id: true, name: true, isSuperAdmin: true, accountType: true } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // 老师与超管可直接修改，无需申请（为兼容前端如误用该端点，这里直接落地）
    if (user.isSuperAdmin || user.accountType === 'teacher') {
      if (newName.trim() === user.name.trim()) {
        return NextResponse.json({ message: '姓名未变化' });
      }
      await prisma.user.update({ where: { id: user.id }, data: { name: newName } });
      await prisma.userAction.create({ data: { userId: user.id, actionType: 'name_change', metadata: JSON.stringify({ newName, updateTime: new Date().toISOString(), by: user.isSuperAdmin ? 'super' : 'teacher' }) } });
      return NextResponse.json({ message: '姓名已更新' });
    }

    // 检查是否已有待审核申请
    const pending = await prisma.accountChangeRequest.findFirst({ where: { userId: user.id, changeType: 'name', status: 'pending' } });
    if (pending) {
      return NextResponse.json({ error: '您已有一条姓名变更申请正在审核中' }, { status: 400 });
    }

    // 一年仅能修改一次：查最近一次已批准的姓名变更或直接变更的操作日志
    const lastApproved = await prisma.accountChangeRequest.findFirst({ where: { userId: user.id, changeType: 'name', status: 'approved' }, orderBy: { processedAt: 'desc' } });
    const lastDirect = await prisma.userAction.findFirst({ where: { userId: user.id, actionType: 'name_change' }, orderBy: { createdAt: 'desc' } });
    const lastTs = Math.max(
      lastApproved?.processedAt ? new Date(lastApproved.processedAt).getTime() : 0,
      lastDirect ? new Date(lastDirect.createdAt).getTime() : 0
    );
    if (lastTs > 0) {
      const elapsed = Date.now() - lastTs;
      if (elapsed < 365*24*60*60*1000) {
        const days = Math.floor(elapsed / (24*60*60*1000));
        return NextResponse.json({ error: `姓名一年内仅可修改一次（距离上次成功修改已 ${days} 天）` }, { status: 400 });
      }
    }

    if (newName.trim() === user.name.trim()) {
      return NextResponse.json({ error: '新姓名不能与当前姓名相同' }, { status: 400 });
    }

    const reqRec = await prisma.accountChangeRequest.create({
      data: {
        userId: user.id,
        changeType: 'name',
        currentValue: user.name,
        newValue: newName,
        reason,
        status: 'pending'
      }
    });

    // 通知超级管理员（管理员消息）
    try {
      await prisma.adminMessage.create({ data: { type: 'account_change_request', title: '姓名变更申请', content: `用户申请修改姓名\n原：${user.name}\n新：${newName}\n理由：${reason}\n申请ID：${reqRec.id}`, priority: 'normal', userId: null } });
    } catch (_) {}

    // 向用户发送站内信
    try {
      await prisma.userMessage.create({ data: { receiverId: user.id, type: 'name_change_submitted', title: '姓名更改申请已发送', content: `已提交姓名更改申请：原：${user.name}；新：${newName}（待审核）`, priority: 'normal' } });
    } catch (_) {}

    return NextResponse.json({ message: '申请已提交，请等待管理员审核', requestId: reqRec.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).issues?.[0]?.message || '参数错误' }, { status: 400 });
    }
    console.error('提交姓名变更申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


