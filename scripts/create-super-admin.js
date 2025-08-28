#!/usr/bin/env node

/**
 * 创建超级管理员账号脚本
 * 用于在生产服务器上创建具有完全权限的超级管理员测试账号
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

// 默认配置
const DEFAULT_CONFIG = {
  email: 'admin@kimochi.space',
  password: 'kimochi@2025',
  name: '超级管理员',
  role: 'SUPER_ADMIN'
};

/**
 * 生成强密码
 */
function generateStrongPassword() {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // 确保包含各种字符类型
  password += 'A'; // 大写字母
  password += 'a'; // 小写字母
  password += '1'; // 数字
  password += '!'; // 特殊字符
  
  // 填充剩余长度
  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 验证密码强度
 */
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    issues: [
      password.length < minLength ? `密码长度至少${minLength}位` : null,
      !hasUpperCase ? '需要包含大写字母' : null,
      !hasLowerCase ? '需要包含小写字母' : null,
      !hasNumbers ? '需要包含数字' : null,
      !hasSpecialChar ? '需要包含特殊字符' : null
    ].filter(Boolean)
  };
}

/**
 * 创建超级管理员账号
 */
async function createSuperAdmin(config = {}) {
  const adminConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    console.log('🚀 开始创建超级管理员账号...');
    console.log(`📧 邮箱: ${adminConfig.email}`);
    console.log(`👤 姓名: ${adminConfig.name}`);
    
    // 检查账号是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: adminConfig.email }
    });
    
    if (existingUser) {
      console.log('⚠️  账号已存在，正在更新...');
      
      // 更新现有账号
      const hashedPassword = await bcrypt.hash(adminConfig.password, 12);
      
      const updatedUser = await prisma.user.update({
        where: { email: adminConfig.email },
        data: {
          name: adminConfig.name,
          passwordHash: hashedPassword,
          isAdmin: adminConfig.role === 'SUPER_ADMIN',
          isSuperAdmin: adminConfig.role === 'SUPER_ADMIN',
          updatedAt: new Date()
        }
      });
      
      console.log('✅ 超级管理员账号更新成功！');
      console.log(`🆔 用户ID: ${updatedUser.id}`);
    } else {
      // 创建新账号
      const hashedPassword = await bcrypt.hash(adminConfig.password, 12);
      
      const newUser = await prisma.user.create({
        data: {
          email: adminConfig.email,
          name: adminConfig.name,
          passwordHash: hashedPassword,
          isAdmin: adminConfig.role === 'SUPER_ADMIN',
          isSuperAdmin: adminConfig.role === 'SUPER_ADMIN',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ 超级管理员账号创建成功！');
      console.log(`🆔 用户ID: ${newUser.id}`);
    }
    
    // 显示登录信息
    console.log('\n🔐 登录信息:');
    console.log(`📧 邮箱: ${adminConfig.email}`);
    console.log(`🔑 密码: ${adminConfig.password}`);
    console.log(`🛡️  角色: ${adminConfig.role}`);
    
    // 安全提醒
    console.log('\n⚠️  安全提醒:');
    console.log('1. 请立即登录并修改默认密码');
    console.log('2. 启用双因素认证（如果支持）');
    console.log('3. 定期更换密码');
    console.log('4. 不要在不安全的网络环境下使用管理员账号');
    
  } catch (error) {
    console.error('❌ 创建超级管理员账号失败:', error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 从环境变量或命令行参数获取配置
    const config = {
      email: process.env.SUPER_ADMIN_EMAIL || process.argv[2],
      password: process.env.SUPER_ADMIN_PASSWORD || process.argv[3],
      name: process.env.SUPER_ADMIN_NAME || process.argv[4]
    };
    
    // 如果没有提供密码，生成一个强密码
    if (!config.password) {
      config.password = generateStrongPassword();
      console.log('🔐 自动生成强密码');
    } else {
      // 验证提供的密码强度
      const validation = validatePassword(config.password);
      if (!validation.isValid) {
        console.log('⚠️  密码强度不足:');
        validation.issues.forEach(issue => console.log(`   - ${issue}`));
        console.log('🔐 使用自动生成的强密码');
        config.password = generateStrongPassword();
      }
    }
    
    await createSuperAdmin(config);
    
  } catch (error) {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { createSuperAdmin, generateStrongPassword, validatePassword };