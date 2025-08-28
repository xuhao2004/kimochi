import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { calculateZodiac } from '@/lib/zodiacCalculator';
import { markSystemNotificationCompleted } from '@/lib/userReminders';

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

    const { 
      name, 
      nickname, 
      email,
      personalEmail, 
      securityEmail,
      securityEmailCode,
      gender, 
      birthDate,
      office,
      contactPhone
    } = await request.json();

    // 统一清洗输入：将空字符串视为未填；可选联系信息支持置空
    const emailInput = typeof email === 'string' ? email.trim() : email;
    const personalEmailInput = typeof personalEmail === 'string' ? personalEmail.trim() : personalEmail;
    const securityEmailInput = typeof securityEmail === 'string' ? securityEmail.trim() : securityEmail;
    const contactPhoneInput = typeof contactPhone === 'string' ? contactPhone.trim() : contactPhone;
    const officeInput = typeof office === 'string' ? office.trim() : office;

    // 基本格式校验（非空时）
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (personalEmailInput && !emailRegex.test(personalEmailInput)) {
      return NextResponse.json({ error: '个人邮箱格式不正确' }, { status: 400 });
    }
    if (securityEmailInput && !emailRegex.test(securityEmailInput)) {
      return NextResponse.json({ error: '密保邮箱格式不正确' }, { status: 400 });
    }
    if (contactPhoneInput && !phoneRegex.test(contactPhoneInput)) {
      return NextResponse.json({ error: '联系电话格式不正确' }, { status: 400 });
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        securityEmail: true,
        securityEmailExempt: true,
        gender: true,
        birthDate: true,
        office: true,
        contactPhone: true,
        isSuperAdmin: true,
        genderModified: true,
        nicknameModified: true,
        accountType: true,
        createdByType: true,
        personalEmail: true
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 角色与更新集合
    const isTeacher = (currentUser.accountType === 'teacher');
    const isSuper = !!currentUser.isSuperAdmin;
    const updateData: any = {};

    // 老师与超管：可直接修改姓名/性别/生日/办公室，无频次限制
    if (isSuper || isTeacher) {
      if (name !== undefined && name !== currentUser.name) updateData.name = name;
      if (nickname !== undefined && nickname !== currentUser.nickname) updateData.nickname = nickname;
      if (emailInput !== undefined && emailInput !== '' && emailInput !== currentUser.email) updateData.email = emailInput;
      if (personalEmailInput !== undefined) updateData.personalEmail = personalEmailInput === '' ? null : personalEmailInput;
      if (gender !== undefined && gender !== currentUser.gender) updateData.gender = gender;
      if (birthDate !== undefined) {
        updateData.birthDate = birthDate ? new Date(birthDate) : null;
      }
      if (officeInput !== undefined && officeInput !== currentUser.office) updateData.office = officeInput === '' ? null : officeInput;
      if (contactPhoneInput !== undefined && contactPhoneInput !== currentUser.contactPhone) updateData.contactPhone = contactPhoneInput === '' ? null : contactPhoneInput;
      // 超管直接设置密保邮箱
      if (isSuper && securityEmailInput !== undefined && securityEmailInput !== currentUser.securityEmail) {
        updateData.securityEmail = securityEmailInput;
        if (!currentUser.personalEmail) {
          updateData.personalEmail = securityEmailInput;
        }
      }
    } else {
      // 普通用户的修改限制
      // 姓名：需走申请流程
      if (name !== undefined && name !== currentUser.name) {
        return NextResponse.json({ error: '姓名需通过申请变更，请前往提交姓名变更申请', detail: { endpoint: '/api/profile/name-change' } }, { status: 400 });
      }

      // 性别：一年仅能修改一次
      if (gender !== undefined && gender !== currentUser.gender) {
        const last = await prisma.userAction.findFirst({ where: { userId: currentUser.id, actionType: 'gender_change' }, orderBy: { createdAt: 'desc' } });
        const withinOneYear = last ? (Date.now() - new Date(last.createdAt).getTime()) < 365*24*60*60*1000 : false;
        if (withinOneYear) {
          return NextResponse.json({ error: '性别一年内仅可修改一次' }, { status: 400 });
        }
        updateData.gender = gender;
      }

      // 昵称：任何人可随时修改
      if (nickname !== undefined && nickname !== currentUser.nickname) {
        updateData.nickname = nickname;
      }

      // 生日：一年仅能修改一次
      if (birthDate !== undefined) {
        const newBirthDate = birthDate ? new Date(birthDate) : null;
        const currentBirthDate = currentUser.birthDate;
        const isChanged = (newBirthDate?.getTime() || 0) !== (currentBirthDate?.getTime() || 0);
        if (isChanged) {
          const last = await prisma.userAction.findFirst({ where: { userId: currentUser.id, actionType: 'birthdate_change' }, orderBy: { createdAt: 'desc' } });
          const withinOneYear = last ? (Date.now() - new Date(last.createdAt).getTime()) < 365*24*60*60*1000 : false;
          if (withinOneYear) {
            return NextResponse.json({ error: '生日一年内仅可修改一次' }, { status: 400 });
          }
          updateData.birthDate = newBirthDate;
        }
      }
      
      // 个人邮箱（可选，可多次修改）
      if (personalEmailInput !== undefined) {
        updateData.personalEmail = personalEmailInput === '' ? null : personalEmailInput;
      }
      // 密保邮箱设置/变更（普通用户）：
      // - 若当前无密保邮箱：使用 purpose=security_email 的验证码直接设置
      // - 若当前已有密保邮箱：不在此处直接修改，由 /api/security-email/change 处理（双验证码或审批）
      if (securityEmailInput !== undefined) {
        if (!securityEmailInput) {
          return NextResponse.json({ error: '不支持清空密保邮箱' }, { status: 400 });
        }
        if (currentUser.securityEmail) {
          return NextResponse.json({ error: '如需变更密保邮箱，请通过专用流程提交', detail: { endpoint: '/api/security-email/change' } }, { status: 400 });
        }
        if (!securityEmailCode) {
          return NextResponse.json({ error: '请先完成密保邮箱验证码校验' }, { status: 400 });
        }
        const { verifyAndConsumeCode } = await import('@/lib/verification');
        const ok = await verifyAndConsumeCode({ contact: securityEmailInput, purpose: 'security_email', code: securityEmailCode });
        if (!ok) return NextResponse.json({ error: '密保邮箱验证码无效或已过期' }, { status: 400 });
        updateData.securityEmail = securityEmailInput;
        if (!currentUser.personalEmail) {
          updateData.personalEmail = securityEmailInput;
        }
      }
      
      // 办公室：只能由老师/超管填写；普通用户忽略
      if (officeInput !== undefined) {
        // ignore for normal users
      }
      if (contactPhoneInput !== undefined) {
        updateData.contactPhone = contactPhoneInput === '' ? null : contactPhoneInput;
      }
      
      // 登录手机号功能已下线：不再处理 phone 修改逻辑

      
      // 邮箱修改限制 - 根据注册方式决定（仅当实际试图修改登录邮箱时拦截）
      if (emailInput !== undefined && emailInput !== '') {
        const isEmailChanged = emailInput !== currentUser.email;
        if (isEmailChanged) {
          if (currentUser.createdByType === 'email_register' && !currentUser.isSuperAdmin) {
            return NextResponse.json({ 
              error: '您使用邮箱注册，不能直接修改该登录邮箱。如需修改请在个人中心发起申请' 
            }, { status: 400 });
          }
          updateData.email = emailInput;
        }
      }
    }

    // 自动计算星座
    if (updateData.birthDate) {
      updateData.zodiac = calculateZodiac(updateData.birthDate);
    }

    // 安全限制：若未设置密保邮箱且未特批，禁止修改除密保邮箱外的任何资料（超管除外）
    const needSecurityEmailFirst = !isSuper && !isTeacher && !currentUser.securityEmail && !(currentUser as any).securityEmailExempt;
    if (needSecurityEmailFirst) {
      const keys = Object.keys(updateData);
      const allowed = new Set(['securityEmail', 'personalEmail']);
      const illegal = keys.filter(k => !allowed.has(k));
      if (illegal.length > 0) {
        return NextResponse.json({ error: '请先设置并验证密保邮箱后再修改其他资料' }, { status: 403 });
      }
    }

    // 执行更新
    if (Object.keys(updateData).length > 0) {
      // 对于学生账户，标记为已更新个人资料
      if (currentUser.accountType === 'student') {
        updateData.hasUpdatedProfile = true;
      }

      try {
        await prisma.user.update({
          where: { id: currentUser.id },
          data: updateData
        });
      } catch (e: any) {
        // 处理唯一约束错误（如邮箱唯一）
        if (e?.code === 'P2002') {
          return NextResponse.json({ error: '该邮箱已被使用，请更换后重试' }, { status: 400 });
        }
        throw e;
      }

      // 记录操作
      await prisma.userAction.create({
        data: {
          userId: currentUser.id,
          actionType: 'profile_update',
          metadata: JSON.stringify({
            updatedFields: Object.keys(updateData),
            updateTime: new Date().toISOString(),
            isSuperAdmin: currentUser.isSuperAdmin
          })
        }
      });

      // 若涉及性别/生日/姓名（教师或超管直改）则追加独立日志用于频次控制
      try {
        if (Object.prototype.hasOwnProperty.call(updateData, 'gender')) {
          await prisma.userAction.create({ data: { userId: currentUser.id, actionType: 'gender_change', metadata: JSON.stringify({ newGender: updateData.gender, updateTime: new Date().toISOString() }) } });
        }
        if (Object.prototype.hasOwnProperty.call(updateData, 'birthDate')) {
          await prisma.userAction.create({ data: { userId: currentUser.id, actionType: 'birthdate_change', metadata: JSON.stringify({ newBirthDate: updateData.birthDate, updateTime: new Date().toISOString() }) } });
        }
        if ((isSuper || isTeacher) && Object.prototype.hasOwnProperty.call(updateData, 'name')) {
          await prisma.userAction.create({ data: { userId: currentUser.id, actionType: 'name_change', metadata: JSON.stringify({ newName: updateData.name, updateTime: new Date().toISOString(), by: isSuper ? 'super' : 'teacher' }) } });
        }
      } catch (_) {}

      // 标记个人信息提醒为已完成
      await markSystemNotificationCompleted(currentUser.id, 'system_profile_incomplete');
    }

    // 返回更新后的用户信息
    const updatedUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        personalEmail: true,
        gender: true,
        birthDate: true,
        zodiac: true,
        office: true,
        contactPhone: true,
        isSuperAdmin: true,
        genderModified: true,
        nicknameModified: true,
        createdByType: true,
        accountType: true
      }
    });

    return NextResponse.json({
      message: '个人信息更新成功',
      user: updatedUser
    });

  } catch (error) {
    console.error('更新个人信息失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
