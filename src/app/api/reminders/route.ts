import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { processUserReminders, processAllUserReminders } from '@/lib/userReminders';

// 检查当前用户的提醒
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

    // 处理当前用户的提醒
    const reminderCount = await processUserReminders(decoded.sub);

    return NextResponse.json({
      message: '提醒检查完成',
      reminderCount
    });

  } catch (error) {
    console.error('检查用户提醒失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 管理员批量处理所有用户提醒
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    // 处理所有用户的提醒
    const totalReminders = await processAllUserReminders();

    return NextResponse.json({
      message: '批量提醒处理完成',
      totalReminders
    });

  } catch (error) {
    console.error('批量处理用户提醒失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
