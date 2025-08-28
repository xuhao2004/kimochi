import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { createVerificationCode, generateNumericCode, verifyAndConsumeCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';
import { isDefaultAdminEmail, shouldExemptOldEmailVerification } from '@/lib/adminUtils';

// 提交密保邮箱变更：支持两种场景
// 1) 旧邮箱 + 新邮箱双验证码（普通用户）
// 2) 邮箱注册用户：仅新邮箱验证码，且必须进入审批（由超级管理员审批）
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { newEmail, oldCode, newCode, oldUnavailable, syncAccount, replaceLoginAccount, ownerPhoneCode, newPassword, oldPassword } = await request.json();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ error: '请输入有效的新密保邮箱' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        isSuperAdmin: true,
        createdByType: true,
        securityEmail: true,
        securityEmailExempt: true,
        email: true,
        phone: true,
        accountType: true,
      }
    });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    // 非教师且非超管：密保邮箱变更需遵守30天冷却期（从最近一次成功变更算起）
    if (!user.isSuperAdmin && user.accountType !== 'teacher') {
      try {
        const lastDirect = await prisma.userAction.findFirst({ where: { userId: user.id, actionType: 'security_email_change' }, orderBy: { createdAt: 'desc' } });
        const lastApprovedReq = await prisma.securityEmailChangeRequest.findFirst({ where: { userId: user.id, status: 'approved' }, orderBy: { processedAt: 'desc' } });
        const lastTs = Math.max(
          lastDirect ? new Date(lastDirect.createdAt).getTime() : 0,
          lastApprovedReq?.processedAt ? new Date(lastApprovedReq.processedAt).getTime() : 0
        );
        if (lastTs > 0) {
          const elapsed = Date.now() - lastTs;
          const days = Math.floor(elapsed / (24*60*60*1000));
          if (days < 30) {
            return NextResponse.json({ error: `密保邮箱每30天仅可修改一次（还需等待 ${30 - days} 天）` }, { status: 400 });
          }
        }
      } catch (_) {}
    }
    

    // 新邮箱不得等于旧邮箱
    if (user.securityEmail && newEmail === user.securityEmail) {
      return NextResponse.json({ error: '新邮箱不能与旧邮箱相同' }, { status: 400 });
    }

    // 若用户已有密保邮箱：普通用户需旧+新双验证码；
    // 超管不走审批，但默认同样需要通过旧+新验证码校验；
    // 例外：当超管“密保邮箱”为 admin@xinqing.com（默认值）时，免除旧邮箱验证码
    // 需要审批：邮箱注册用户 或 用户声明旧邮箱已停用
    const needAdminApproval = user.createdByType === 'email_register' || Boolean(oldUnavailable) || Boolean(replaceLoginAccount && user.createdByType === 'phone_register');

    // 计算是否豁免旧邮箱校验（仅针对超级管理员）
    // 超级管理员免旧邮箱校验：密保邮箱是默认管理员邮箱或手机号账户
    const exemptOldEmailVerification = shouldExemptOldEmailVerification(
      user.isSuperAdmin,
      user.securityEmail,
      user.phone,
      user.email
    );

    // 校验旧/新验证码
    if (user.securityEmail && !needAdminApproval && !exemptOldEmailVerification) {
      if (!oldCode) return NextResponse.json({ error: '请先完成旧密保邮箱验证码校验' }, { status: 400 });
      const oldOk = await verifyAndConsumeCode({ contact: user.securityEmail, purpose: 'security_email_change_old', code: oldCode });
      if (!oldOk) return NextResponse.json({ error: '旧密保邮箱验证码无效或已过期' }, { status: 400 });
    }
    if (!newCode) return NextResponse.json({ error: '请先完成新密保邮箱验证码校验' }, { status: 400 });
    const newOk = await verifyAndConsumeCode({ contact: newEmail, purpose: 'security_email_change_new', code: newCode });
    if (!newOk) return NextResponse.json({ error: '新密保邮箱验证码无效或已过期' }, { status: 400 });

    // 手机号登录替换为邮箱账号：短信校验已下线，不允许直接替换（需管理员审批）
    if (replaceLoginAccount && user.createdByType === 'phone_register') {
      return NextResponse.json({ error: '该操作需管理员审批，暂不支持直接替换' }, { status: 403 });
    }
    
    // 新邮箱不得被他人作为登录邮箱或密保邮箱占用（幂等检查，避免竞态）
    const taken = await prisma.user.findFirst({ where: { OR: [ { securityEmail: newEmail }, { email: newEmail } ], NOT: { id: user.id } } });
    if (taken) return NextResponse.json({ error: '该邮箱已被其他用户使用' }, { status: 400 });

    if (!needAdminApproval || user.isSuperAdmin) {
      // 直接更新
      const oldEmail = user.securityEmail || null;

      // 检查是否为默认管理员账号首次设置密保邮箱
      const isDefaultAdminFirstTime = user.isSuperAdmin &&
        isDefaultAdminEmail(user.email) &&
        !user.securityEmail;

      await prisma.user.update({ where: { id: user.id }, data: { securityEmail: newEmail, tokenVersion: { increment: 1 } as any } as any });

      // 可选：同步修改登录账号（仅邮箱注册用户或超级管理员允许）
      if ((syncAccount === true && (user.createdByType === 'email_register' || user.isSuperAdmin))) {
        await prisma.user.update({ where: { id: user.id }, data: { email: newEmail, tokenVersion: { increment: 1 } as any } as any });
      }
      // 默认管理员账号首次设置密保邮箱时，自动同步登录账号（无需用户确认）
      else if (isDefaultAdminFirstTime) {
        await prisma.user.update({ where: { id: user.id }, data: { email: newEmail, tokenVersion: { increment: 1 } as any } as any });
      }
      // 手机号注册用户选择替换为邮箱账号（直改分支仅当 isSuperAdmin 时允许）
      if (user.isSuperAdmin && replaceLoginAccount && user.createdByType === 'phone_register') {
        await prisma.user.update({ where: { id: user.id }, data: { email: newEmail, tokenVersion: { increment: 1 } as any } as any });
      }
      await prisma.userAction.create({ data: { userId: user.id, actionType: 'security_email_change', metadata: JSON.stringify({ newEmail, syncAccount: !!syncAccount, time: new Date().toISOString() }) } });

      // 站内信通知
      try { await prisma.userMessage.create({ data: { type: 'security_email_changed', title: '密保邮箱已变更', content: `您的密保邮箱已更新为：${newEmail}${syncAccount ? '\n同时您的登录邮箱也已同步更新。' : ''}`, priority: 'normal', receiverId: user.id } }); } catch {}

      // 邮件通知（新邮箱必发；旧邮箱在未声明停用时发送）
      const infoNew = renderSimpleTemplate('密保邮箱已变更', [ `您的密保邮箱已更新为：${newEmail}`, syncAccount ? '同时您的登录邮箱也已同步更新。' : '' ].filter(Boolean) as string[]);
      try { await sendEmail({ to: newEmail, subject: '【kimochi心晴】通知：密保邮箱已变更', html: infoNew.html, text: infoNew.text }); } catch {}
      if (!oldUnavailable && oldEmail && !isDefaultAdminEmail(oldEmail)) {
        const infoOld = renderSimpleTemplate('密保邮箱已变更提醒', [ `您的密保邮箱已从 ${oldEmail} 变更为 ${newEmail}`, '如非本人操作，请立即联系管理员。' ]);
        try { await sendEmail({ to: oldEmail, subject: '【kimochi心晴】提醒：密保邮箱已变更', html: infoOld.html, text: infoOld.text }); } catch {}
      }

      return NextResponse.json({ message: '密保邮箱已更新', forceLogout: true });
    }

    // 创建审批请求（邮箱注册用户，或声明旧邮箱停用，或手机号注册欲替换为邮箱账号）
    // 记录是否完成旧邮箱校验（用于后续登录限制判断）
    let oldVerifiedFlag = false;
    if (user.securityEmail && !oldUnavailable) {
      if (oldCode) {
        try {
          oldVerifiedFlag = await verifyAndConsumeCode({ contact: user.securityEmail, purpose: 'security_email_change_old', code: oldCode });
        } catch {
          oldVerifiedFlag = false;
        }
      } else {
        oldVerifiedFlag = false;
      }
    }

    const req = await prisma.securityEmailChangeRequest.create({
      data: {
        userId: user.id,
        oldEmail: user.securityEmail || null,
        newEmail,
        oldVerified: oldUnavailable ? false : oldVerifiedFlag,
        newVerified: true,
        status: 'pending'
      }
    });

    // 如同时提交密码修改：校验并生成挂起记录，审批通过时落地
    if (newPassword && typeof newPassword === 'string') {
      // 密码强度校验
      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return NextResponse.json({ error: '新密码需至少8位，并包含大小写字母与数字' }, { status: 400 });
      }
      // 校验旧密码（若非默认密码）
      const defaultPassword = 'kimochi@2025';
      const isDefaultPassword = await (await import('bcryptjs')).compare(defaultPassword, (await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } }))!.passwordHash);
      if (!isDefaultPassword) {
        if (!oldPassword) return NextResponse.json({ error: '请填写原密码以同时修改密码' }, { status: 400 });
        const ok = await (await import('bcryptjs')).compare(String(oldPassword), (await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } }))!.passwordHash);
        if (!ok) return NextResponse.json({ error: '原密码错误' }, { status: 400 });
      }
      const hashed = await (await import('bcryptjs')).hash(newPassword, 12);
      try {
        await prisma.userAction.create({ data: { userId: user.id, actionType: 'pending_password_update', metadata: JSON.stringify({ requestId: req.id, newPasswordHash: hashed, createdAt: new Date().toISOString() }) } });
      } catch (e) { console.error('创建挂起密码更新记录失败:', e); }
    }

    // 通知管理员
    await prisma.adminMessage.create({
      data: {
        type: 'security_email_change_request',
        title: '密保邮箱变更申请',
        content: `用户申请变更密保邮箱\n新邮箱：${newEmail}\n${oldUnavailable ? '用户声明：原密保邮箱已停用（未校验旧邮箱验证码）\n' : ''}${syncAccount ? '用户选择：同步修改登录账号\n' : ''}申请ID：${req.id}`,
        priority: 'urgent',
        userId: null
      }
    });

    // 若用户选择同步修改账号，创建账号变更申请（邮箱）
    if (syncAccount === true && (user.createdByType === 'email_register' || user.isSuperAdmin)) {
      try {
        await prisma.accountChangeRequest.create({
          data: {
            userId: user.id,
            changeType: 'email',
            currentValue: user.email || '',
            newValue: newEmail,
            reason: '同步修改登录账号（与密保邮箱一致）',
            verificationCode: null,
            verified: true,
            status: 'pending'
          }
        });
        await prisma.adminMessage.create({ data: { type: 'account_change_request', title: '账号变更申请：邮箱（同步）', content: `用户申请同步修改登录邮箱\n当前值：${user.email || '-'}\n新值：${newEmail}`, priority: 'urgent', userId: null } });
      } catch (e) { console.error('创建同步账号变更申请失败:', e); }
    }

    // 手机号注册用户：若选择替换为邮箱账号，则创建“账号变更申请（邮箱）”，待超管审批
    if (replaceLoginAccount === true && user.createdByType === 'phone_register') {
      try {
        await prisma.accountChangeRequest.create({
          data: {
            userId: user.id,
            changeType: 'email',
            currentValue: user.phone || '',
            newValue: newEmail,
            reason: `手机号登录替换为邮箱（与密保邮箱一致）；来源申请：${req.id}`,
            verificationCode: newCode,
            verified: true,
            status: 'pending'
          }
        });
        await prisma.adminMessage.create({ data: { type: 'account_change_request', title: '账号变更申请：邮箱（替换手机号登录）', content: `手机号注册用户申请将登录账号替换为邮箱\n新邮箱：${newEmail}\n来源安全申请ID：${req.id}`, priority: 'urgent', userId: null } });
      } catch (e) { console.error('创建“手机号→邮箱”账号变更申请失败:', e); }
    }

    // 站内信提示已提交
    try { await prisma.userMessage.create({ data: { type: 'security_email_change_submitted', title: '密保邮箱变更申请已提交', content: `已提交将密保邮箱变更为：${newEmail} 的申请，请等待管理员审批。`, priority: 'normal', receiverId: user.id } }); } catch {}

    // 邮件通知：新邮箱必发；旧邮箱在未声明停用时发送
    const origin = (() => {
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
      return `${proto}://${host}`;
    })();

    // 新邮箱：申请提交通知
    try {
      const tplNew = renderSimpleTemplate('密保邮箱变更申请已提交', [ `您申请将密保邮箱变更为：${newEmail}`, '我们将在审核后通知结果。' ]);
      await sendEmail({ to: newEmail, subject: '【kimochi心晴】通知：密保邮箱变更申请已提交', html: tplNew.html, text: tplNew.text });
    } catch {}

    // 旧邮箱：发起申请提醒 + 撤销方式（仅链接，不再提供撤销码）。若用户声明旧邮箱已停用，则不发送。
    if (!oldUnavailable && user.securityEmail) {
      try {
        const cancelCode = generateNumericCode(6);
        await createVerificationCode({ contact: user.securityEmail, channel: 'email', purpose: 'security_email_change_cancel', code: cancelCode, ttlSeconds: 24 * 60 * 60 });
        const revokeUrl = `${origin}/revoke/security-email?rid=${encodeURIComponent(req.id)}&code=${encodeURIComponent(cancelCode)}`;
        const lines = [
          `检测到密保邮箱变更申请：${user.securityEmail} -> ${newEmail}`,
          `如非本人操作，请在24小时内点击下方撤销链接撤回本次申请：`,
          `撤销链接：${revokeUrl}`,
          `管理员邮箱：kimochi2025@qq.com`
        ];
        const tplOld = renderSimpleTemplate('安全提醒：密保邮箱变更申请', lines);
        await sendEmail({ to: user.securityEmail, subject: '【kimochi心晴】安全提醒：密保邮箱变更申请', html: tplOld.html, text: tplOld.text });
      } catch (e) { console.error('发送旧邮箱撤销邮件失败:', e); }
    }

    return NextResponse.json({ message: '申请已提交，请等待管理员审批', requestId: req.id, forceLogout: true });
  } catch (error) {
    console.error('提交密保邮箱变更失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


