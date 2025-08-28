#!/usr/bin/env node
// Create a high-priority system announcement for super admin visibility

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const title = '系统变更公告：小程序安全换绑与网页二维码绑定已上线';
  const content = [
    '1) 小程序“安全换绑（验证码）”已上线：个人资料页 → 安全换绑（验证码）。',
    '2) 网页端“绑定微信（小程序）二维码”页：/weapp-bind（登录后可见），可用数字码或二维码完成绑定。',
    '3) 绑定/换绑策略：已绑定他人微信的账户需使用“网站端二维码换绑”或“小程序发起换绑（OTP 双因子）”。',
    '4) 开发/上线工作流：采用同仓双环境（dev: 127.0.0.1:3001，prod: app.kimochi.space）与增量合并（scripts/db-merge.js）。'
  ].join('\n');

  const rec = await prisma.adminMessage.create({
    data: {
      type: 'system',
      title,
      content,
      priority: 'high',
    }
  });
  console.log('Created announcement:', rec.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});


