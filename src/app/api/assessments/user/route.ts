import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 获取指定用户最近的测评（仅当双方存在私聊关系时可见）
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 可选：MBTI | SCL90 | SDS | SDS/SAS
    const normalizedType = type === 'SDS/SAS' ? 'SDS' : type;
    const limit = Math.max(1, Math.min(5, parseInt(searchParams.get('limit') || '1')));
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 });

    if (userId === payload.sub) {
      // 查询本人
      const where: any = { userId, deletedByUser: false };
      if (normalizedType) where.type = normalizedType;
      const records = await prisma.assessment.findMany({
        where,
        orderBy: { completedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          completedAt: true,
          overallScore: true,
          riskLevel: true,
          personalityType: true,
        }
      });
      return NextResponse.json({ assessments: records.map(r => ({ ...r, type: r.type === 'SDS' ? 'SDS/SAS' : r.type })) });
    }

    // 校验双方是否存在私聊聊天室
    const room = await prisma.chatRoom.findFirst({
      where: {
        type: 'private',
        participants: { some: { userId: payload.sub, isActive: true } },
        AND: [{ participants: { some: { userId, isActive: true } } }]
      },
      select: { id: true }
    });
    if (!room) return NextResponse.json({ error: '无权限访问对方测评' }, { status: 403 });

    const where: any = { userId, deletedByUser: false };
    if (normalizedType) where.type = normalizedType;
    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: [
        { status: 'desc' }, // 优先返回已完成/已分析
        { completedAt: 'desc' },
        { startedAt: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        type: true,
        completedAt: true,
        overallScore: true,
        riskLevel: true,
        personalityType: true,
      }
    });
    return NextResponse.json({ assessments: assessments.map(a => ({ ...a, type: a.type === 'SDS' ? 'SDS/SAS' : a.type })) });
  } catch (e) {
    console.error('assessments/user GET error', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


