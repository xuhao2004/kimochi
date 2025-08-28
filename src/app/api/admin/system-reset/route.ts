import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

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

    // 验证是否为超级管理员
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        isSuperAdmin: true,
        passwordHash: true,
        email: true
      }
    });

    if (!currentUser || !currentUser.isSuperAdmin) {
      return NextResponse.json({ error: '权限不足，仅超级管理员可执行此操作' }, { status: 403 });
    }

    const { password, confirmationText } = await request.json();

    // 验证密码
    if (!password) {
      return NextResponse.json({ error: '请输入管理员密码' }, { status: 400 });
    }

    const isPasswordValid = await bcrypt.compare(password, currentUser.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: '管理员密码错误' }, { status: 400 });
    }

    // 验证确认文本
    if (confirmationText !== 'RESET SYSTEM') {
      return NextResponse.json({ error: '确认文本不正确' }, { status: 400 });
    }

    // 记录重置操作（在删除数据前）
    const resetTime = new Date().toISOString();
    console.log(`[SYSTEM RESET] 超级管理员 ${currentUser.email} 于 ${resetTime} 执行系统重置`);

    // 获取当前超级管理员信息用于重建
    const adminInfo = {
      email: currentUser.email,
      name: '超级管理员'
    };

    // 开始删除数据并重建超级管理员（使用事务确保原子性）
    await prisma.$transaction(async (tx) => {
      // 删除所有数据表（按依赖关系顺序）
      await tx.userSession.deleteMany({});
      await tx.assessmentAnswer.deleteMany({});
      await tx.assessment.deleteMany({});
      await tx.userAction.deleteMany({});
      await tx.chatMessage.deleteMany({});
      await tx.chatRoomParticipant.deleteMany({});
      await tx.chatRoom.deleteMany({});
      await tx.friendship.deleteMany({});
      await tx.adminMessage.deleteMany({});
      await tx.systemStats.deleteMany({});
      
      // 删除所有用户（包括当前超级管理员）
      await tx.user.deleteMany({});

      // 重新创建超级管理员账户，密码为默认密码
      const defaultPasswordHash = await bcrypt.hash('kimochi@2025', 12);
      await tx.user.create({
        data: {
          email: adminInfo.email,
          name: adminInfo.name,
          passwordHash: defaultPasswordHash,
          accountType: 'admin',
          isAdmin: true,
          isSuperAdmin: true,
          hasUpdatedProfile: true
        }
      });
    });

    console.log(`[SYSTEM RESET] 系统重置完成，所有数据已清空，超级管理员账户已重建`);

    return NextResponse.json({
      message: '系统重置成功',
      resetTime,
      adminInfo: {
        email: adminInfo.email,
        name: adminInfo.name,
        defaultPassword: 'kimochi@2025'
      },
      deletedTables: [
        'users', 'user_actions', 'assessments', 'assessment_answers',
        'friendships', 'chat_rooms', 'chat_room_participants', 'chat_messages',
        'admin_messages', 'system_stats', 'user_sessions'
      ]
    });

  } catch (error) {
    console.error('系统重置失败:', error);
    return NextResponse.json({ error: '系统重置失败，请联系技术支持' }, { status: 500 });
  }
}
