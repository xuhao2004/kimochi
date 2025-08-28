import { NextResponse } from "next/server";
import { loginSchema, loginUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordUserAction } from "@/lib/userActions";
import { processUserReminders } from "@/lib/userReminders";

// 内存级登录失败限流（IP+账号），10 分钟内超过 8 次失败则阻断
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
    const input = loginSchema.parse(json);
    const ip = getClientIp(req);
    const rlKey = `${ip}:${input.identifier}`;
    if (isBlocked(rlKey)) {
      return NextResponse.json({ error: "登录尝试过于频繁，请稍后再试" }, { status: 429 });
    }
    const { token, user } = await loginUser(input);

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
      // 安全邮箱变更申请：邮箱注册用户或未完成旧邮箱校验，一律限制登录
      const secReq = await prisma.securityEmailChangeRequest.findFirst({ where: { userId: user.id, status: 'pending' }, orderBy: { createdAt: 'desc' } });
      if (secReq) {
        if (secReq.createdAt < twentyFourHoursAgo) {
          await prisma.securityEmailChangeRequest.update({ where: { id: secReq.id }, data: { status: 'expired', processedAt: now } });
        } else {
          if (!user.isSuperAdmin && (user.createdByType === 'email_register' || !secReq.oldVerified)) {
            const remain = fmtRemain(secReq.createdAt);
            return NextResponse.json({ error: `您的密保邮箱变更申请正在审核中，约${remain}后将会自动撤销申请，请耐心等待` }, { status: 423 });
          }
        }
      }
      // 账号变更申请（邮箱/手机号）
      const accReq = await prisma.accountChangeRequest.findFirst({ where: { userId: user.id, status: 'pending' }, orderBy: { createdAt: 'desc' } });
      if (accReq) {
        if (accReq.createdAt < twentyFourHoursAgo) {
          await prisma.accountChangeRequest.update({ where: { id: accReq.id }, data: { status: 'expired', processedAt: now } });
        } else {
          const remain = fmtRemain(accReq.createdAt);
          return NextResponse.json({ error: `您的账号变更申请正在审核中，约${remain}后将会自动撤销申请，请耐心等待` }, { status: 423 });
        }
      }
    } catch (error) {
      console.error('登录前置风险检查失败:', error);
    }
    
    // 记录登录行为
    await recordUserAction(user.id, "login", {
      loginType: user.accountType,
      identifier: user.studentId || user.teacherId || user.email
    });

    // 检查并创建用户提醒（异步处理，不阻塞登录响应）
    processUserReminders(user.id).catch(error => {
      console.error('处理用户提醒失败:', error);
    });
    
    clearFails(rlKey);
    return NextResponse.json({ token, user });
  } catch (err: unknown) {
    try {
      const cloned = req.clone();
      const data = await cloned.json().catch(() => null);
      const identifier = (data && typeof data.identifier === 'string') ? data.identifier : 'unknown';
      const ip = getClientIp(req);
      markFail(`${ip}:${identifier}`);
    } catch {}

    // 使用友好的错误信息，避免暴露技术细节
    let message = "登录失败，请检查账号和密码";
    if (err instanceof Error) {
      const errorMsg = err.message;
      if (errorMsg === 'ACCOUNT_NOT_FOUND') {
        message = "该账号未注册，请检查账号名或前往注册";
      } else if (errorMsg === 'INCORRECT_PASSWORD') {
        message = "密码错误，请重新输入";
      } else if (errorMsg.toLowerCase().includes('database') || errorMsg.toLowerCase().includes('prisma')) {
        message = "系统暂时无法处理请求，请稍后重试";
      }
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}


