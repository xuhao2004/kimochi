import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        passwordHash: true,
        createdAt: true,
        accountType: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查是否使用默认密码
    const defaultPassword = 'kimochi@2025';
    const isDefaultPassword = await bcrypt.compare(defaultPassword, user.passwordHash);

    // 判断是否为新用户（最近创建的）
    const now = new Date();
    const userCreateTime = new Date(user.createdAt);
    const timeDiff = now.getTime() - userCreateTime.getTime();
    const isNewUser = timeDiff < 24 * 60 * 60 * 1000; // 24小时内创建的用户

    return NextResponse.json({
      isDefaultPassword,
      isNewUser,
      accountType: user.accountType
    });

  } catch (error) {
    console.error('检查默认密码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
