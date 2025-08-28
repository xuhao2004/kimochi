import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAndConsumeCode } from '@/lib/verification';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '@/lib/env';
import { recordUserAction } from '@/lib/userActions';
import { processUserReminders } from '@/lib/userReminders';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

// 内存级登录失败限流（IP+邮箱），10 分钟内超过 8 次失败则阻断
const loginFailStore: Record<string, number[]> = {};
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 8;

function getClientIp(req: Request): string {
  try {
    const xf = req.headers.get('x-forwarded-for') || '';
    if (xf) return xf.split(',')[0].trim();
    const xri = req.headers.get('x-real-ip');
    if (xri) return xri;
  } catch {}
  return 'unknown';
}

function isBlocked(key: string): boolean {
  const now = Date.now();
  const arr = (loginFailStore[key] || []).filter(ts => now - ts < WINDOW_MS);
  loginFailStore[key] = arr;
  return arr.length >= MAX_FAILS;
}

function markFail(key: string): void {
  const now = Date.now();
  const arr = (loginFailStore[key] || []).filter(ts => now - ts < WINDOW_MS);
  arr.push(now);
  loginFailStore[key] = arr;
}

function clearFails(key: string): void {
  delete loginFailStore[key];
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, code } = json;

    // 验证输入
    if (!email || !code) {
      return NextResponse.json({ error: '请输入邮箱和验证码' }, { status: 400 });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    const ip = getClientIp(req);
    const rlKey = `${ip}:${email}`;
    
    if (isBlocked(rlKey)) {
      return NextResponse.json({ error: "登录尝试过于频繁，请稍后再试" }, { status: 429 });
    }

    // 验证验证码
    const codeValid = await verifyAndConsumeCode({
      contact: email,
      purpose: 'email_login',
      code: code
    });

    if (!codeValid) {
      markFail(rlKey);
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
    }

    // 查找用户（同时查询 email 和 securityEmail 字段）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { securityEmail: email }
        ]
      },
      select: {
        id: true,
        email: true,
        phone: true,
        studentId: true,
        teacherId: true,
        securityEmail: true,
        name: true,
        zodiac: true,
        gender: true,
        className: true,
        accountType: true,
        isAdmin: true,
        isSuperAdmin: true,
        createdByType: true,
        tokenVersion: true
      }
    });

    if (!user) {
      markFail(rlKey);
      return NextResponse.json({ error: '该邮箱未注册' }, { status: 400 });
    }

    // 高风险待审期间禁止登录（24h 未审批自动过期并解除限制）
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const fmtRemain = (createdAt: Date) => {
        const expireAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
        const ms = Math.max(0, expireAt.getTime() - now.getTime());
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        if (hours <= 0) return `${minutes}分钟`;
        if (minutes <= 0) return `${hours}小时`;
        return `${hours}小时${minutes}分钟`;
      };

      // 密保邮箱变更申请
      const secReq = await prisma.securityEmailChangeRequest.findFirst({ 
        where: { userId: user.id, status: 'pending' }, 
        orderBy: { createdAt: 'desc' } 
      });
      if (secReq) {
        if (secReq.createdAt < twentyFourHoursAgo) {
          await prisma.securityEmailChangeRequest.update({ 
            where: { id: secReq.id }, 
            data: { status: 'expired', processedAt: now } 
          });
        } else {
          const remain = fmtRemain(secReq.createdAt);
          return NextResponse.json({ 
            error: `您的密保邮箱变更申请正在审核中，约${remain}后将会自动撤销申请，请耐心等待` 
          }, { status: 423 });
        }
      }

      // 账号变更申请（邮箱/手机号）
      const accReq = await prisma.accountChangeRequest.findFirst({ 
        where: { userId: user.id, status: 'pending' }, 
        orderBy: { createdAt: 'desc' } 
      });
      if (accReq) {
        if (accReq.createdAt < twentyFourHoursAgo) {
          await prisma.accountChangeRequest.update({ 
            where: { id: accReq.id }, 
            data: { status: 'expired', processedAt: now } 
          });
        } else {
          const remain = fmtRemain(accReq.createdAt);
          return NextResponse.json({ 
            error: `您的账号变更申请正在审核中，约${remain}后将会自动撤销申请，请耐心等待` 
          }, { status: 423 });
        }
      }
    } catch (error) {
      console.error('登录前置风险检查失败:', error);
    }

    // 生成JWT token
    const token = jwt.sign({ 
      sub: user.id, 
      isAdmin: user.isAdmin, 
      isSuperAdmin: user.isSuperAdmin, 
      tokenVersion: user.tokenVersion 
    }, JWT_SECRET, { expiresIn: "7d" });

    // 记录登录行为
    await recordUserAction(user.id, "login", {
      loginType: 'email_code',
      identifier: email
    });

    // 检查并创建用户提醒（异步处理，不阻塞登录响应）
    processUserReminders(user.id).catch(error => {
      console.error('处理用户提醒失败:', error);
    });

    clearFails(rlKey);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        studentId: user.studentId,
        teacherId: user.teacherId,
        name: user.name,
        zodiac: user.zodiac,
        gender: user.gender,
        className: user.className,
        accountType: user.accountType,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        createdByType: user.createdByType
      }
    });

  } catch (err: unknown) {
    try {
      const cloned = req.clone();
      const data = await cloned.json().catch(() => null);
      const email = (data && typeof data.email === 'string') ? data.email : 'unknown';
      const ip = getClientIp(req);
      markFail(`${ip}:${email}`);
    } catch {}

    console.error('邮箱验证码登录失败:', err);
    return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
  }
}
