import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 获取违规理由模板列表
export async function GET(req: NextRequest) {
  try {
    const reasons = await prisma.violationReason.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { order: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      reasons
    });

  } catch (error) {
    console.error('获取违规理由失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 创建违规理由模板（管理员专用）
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const userId = decoded.sub;

    // 验证是否为超级管理员
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true }
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, category, order = 0 } = body;

    if (!name || !category) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const reason = await prisma.violationReason.create({
      data: {
        name,
        description,
        category,
        order
      }
    });

    return NextResponse.json({
      success: true,
      reason
    });

  } catch (error) {
    console.error('创建违规理由失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
