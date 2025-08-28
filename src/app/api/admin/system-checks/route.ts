import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { NotificationService } from "@/lib/notificationService";
import { prisma } from "@/lib/prisma";

// 运行系统检查
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证超级管理员权限
    const { prisma } = await import("@/lib/prisma");
    const admin = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!admin || !admin.isSuperAdmin) {
      return NextResponse.json({ error: "权限不足，需要超级管理员权限" }, { status: 403 });
    }

    // 运行系统检查
    await NotificationService.runPeriodicChecks();

    // 新增：账号变更审批未处理提醒（始终提示超管）
    const pendingCount = await prisma.accountChangeRequest.count({ where: { status: 'pending' } });
    if (pendingCount > 0) {
      await prisma.adminMessage.upsert({
        where: { id: `acc_change_pending_${admin.id}` }, // 该where不是唯一键，改为基于复合条件的近似：用find后create/update
        update: {},
        create: { type: 'account_change_pending', title: '有待处理的账号变更申请', content: `当前有 ${pendingCount} 条账号变更申请待审核。`, priority: 'high', userId: admin.id }
      }).catch(async () => {
        const existing = await prisma.adminMessage.findFirst({
          where: { userId: admin.id, type: 'account_change_pending' }
        });
        if (existing) {
          await prisma.adminMessage.update({ where: { id: existing.id }, data: { content: `当前有 ${pendingCount} 条账号变更申请待审核。`, isProcessed: false, isRead: false } });
        } else {
          await prisma.adminMessage.create({ data: { type: 'account_change_pending', title: '有待处理的账号变更申请', content: `当前有 ${pendingCount} 条账号变更申请待审核。`, priority: 'high', userId: admin.id } });
        }
      });
    } else {
      // 无待处理时，自动解除该提醒
      await prisma.adminMessage.deleteMany({ where: { userId: admin.id, type: 'account_change_pending' } });
    }

    return NextResponse.json({ 
      message: "系统检查完成",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('系统检查失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 获取系统状态
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const { prisma } = await import("@/lib/prisma");
    const admin = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin)) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    // 获取系统状态统计
    const stats = await prisma.adminMessage.groupBy({
      by: ['type', 'priority', 'isProcessed'],
      _count: { id: true },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
        }
      }
    });

    // 获取最近的系统警报
    const recentAlerts = await prisma.adminMessage.findMany({
      where: {
        type: {
          startsWith: 'system_'
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // 密码过期用户统计
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const expiredPasswordUsers = await prisma.user.count({
      where: {
        OR: [
          { isSuperAdmin: true },
          { accountType: 'admin' },
          { accountType: 'teacher' }
        ],
        updatedAt: {
          lt: sixtyDaysAgo
        }
      }
    });

    // 个人信息不完整用户统计
    const incompleteProfileUsers = await prisma.user.count({
      where: {
        OR: [
          { isSuperAdmin: true },
          { accountType: 'admin' },
          { accountType: 'teacher' }
        ],
        hasUpdatedProfile: false
      }
    });

    return NextResponse.json({
      stats,
      recentAlerts,
      systemHealth: {
        expiredPasswordUsers,
        incompleteProfileUsers,
        lastCheckTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取系统状态失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
