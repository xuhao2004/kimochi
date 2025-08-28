import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
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

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        isAdmin: true,
        isSuperAdmin: true,
        accountType: true
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查是否有管理员权限
    if (!currentUser.isAdmin && !currentUser.isSuperAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: '缺少目标用户ID' }, { status: 400 });
    }

    // 获取目标用户信息
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        accountType: true,
        isAdmin: true,
        isSuperAdmin: true
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: '目标用户不存在' }, { status: 404 });
    }

    // 权限检查：
    // 1. 超级管理员可以重置所有用户密码（除了其他超级管理员）
    // 2. 普通管理员（教师）只能重置学生账户密码
    if (currentUser.isSuperAdmin) {
      // 超级管理员不能重置其他超级管理员的密码
      if (targetUser.isSuperAdmin && targetUser.id !== currentUser.id) {
        return NextResponse.json({ error: '不能重置其他超级管理员的密码' }, { status: 403 });
      }
    } else if (currentUser.isAdmin) {
      // 普通管理员只能重置学生账户
      if (targetUser.accountType !== 'student') {
        return NextResponse.json({ error: '教师只能重置学生账户密码' }, { status: 403 });
      }
    }

    // 生成新密码的哈希值
    const defaultPassword = 'kimochi@2025';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // 重置密码
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash: hashedPassword,
        tokenVersion: { increment: 1 }
      }
    });

    // 记录管理员操作
    await prisma.userAction.create({
      data: {
        userId: currentUser.id,
        actionType: 'password_reset',
        metadata: JSON.stringify({
          targetUserId: targetUser.id,
          targetUserName: targetUser.name,
          targetUserAccount: targetUser.email || targetUser.studentId,
          resetTime: new Date().toISOString()
        })
      }
    });

    return NextResponse.json({
      message: '密码重置成功',
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        account: targetUser.email || targetUser.studentId,
        accountType: targetUser.accountType
      }
    });

  } catch (error) {
    console.error('重置密码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
