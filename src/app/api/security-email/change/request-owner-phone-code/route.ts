import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createVerificationCode, generateNumericCode } from '@/lib/verification';

// 发送“密保邮箱变更”流程中所有者手机号验证码（仅当开关开启时生效）
export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_VERIFICATION_CODE === '1') {
      return NextResponse.json({ error: '验证码功能已停用' }, { status: 403 });
    }
    // 功能已下线：不再发送短信验证码
    return NextResponse.json({ error: '功能已下线' }, { status: 410 });
  } catch (error) {
    console.error('发送密保邮箱变更手机验证码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


