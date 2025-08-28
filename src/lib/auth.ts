import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateZodiac } from "@/lib/zodiac";
import { processUserReminders } from "@/lib/userReminders";
import { getRequiredEnv } from "@/lib/env";

const JWT_SECRET = getRequiredEnv("JWT_SECRET");

// 自助注册 schema - 仅支持邮箱注册
export const registerSchema = z.object({
  identifier: z.string().min(1).refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: "请输入有效的邮箱地址",
  }),
  password: z.string().min(8),
  name: z.string().min(1),
  gender: z.enum(["男", "女", "不方便透露"]),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "请提供有效的出生日期",
  }),
  source: z.string().optional(), // 可选：注册来源（weapp 等）
});

export async function registerUser(input: z.infer<typeof registerSchema>) {
  // 判断是邮箱还是手机号注册
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.identifier);
  
  // 检查是否已存在
  if (isEmail) {
    const existing = await prisma.user.findUnique({ where: { email: input.identifier } });
    if (existing) {
      throw new Error("该邮箱已注册");
    }
  } else {
    throw new Error("仅支持邮箱注册");
  }
  
  const birthDate = new Date(input.birthDate);
  const zodiac = calculateZodiac(birthDate);
  const passwordHash = await bcrypt.hash(input.password, 10);
  
  // 根据注册方式设置不同字段
  const userData: any = {
    passwordHash,
    name: input.name,
    gender: input.gender,
    birthDate,
    zodiac,
    accountType: input.source === 'weapp' ? 'weapp' : "self",
    hasUpdatedProfile: true, // 注册时已经填写了基本信息
  };
  
  if (isEmail) {
    userData.email = input.identifier;
    userData.createdByType = input.source === 'weapp' ? 'weapp_register' : 'email_register';
    // 自助注册用户邮箱自动完善：设置为登录账号+密保邮箱+个人邮箱
    userData.securityEmail = input.identifier;
    userData.personalEmail = input.identifier;
  }
  
  const user = await prisma.user.create({
    data: userData,
  });
  
  return { 
    id: user.id, 
    email: user.email,
    phone: user.phone,
    name: user.name, 
    zodiac: user.zodiac,
    gender: user.gender,
    accountType: user.accountType,
    createdByType: user.createdByType
  };
}

// 通用登录 schema（支持邮箱、手机号或学号）
export const loginSchema = z.object({
  identifier: z.string().min(1), // 邮箱、手机号或学号
  password: z.string().min(1),
});

export async function loginUser(input: z.infer<typeof loginSchema>) {
  // 判断是邮箱、手机号还是学号
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.identifier);
  const isPhone = /^1[3-9]\d{9}$/.test(input.identifier);
  
  let user;
  const selectFields = {
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
    passwordHash: true,
    createdByType: true,
    tokenVersion: true
  };
  
  if (isEmail) {
    // 邮箱登录：同时查询 email 和 securityEmail 字段
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.identifier },
          { securityEmail: input.identifier }
        ]
      },
      select: selectFields
    });
  } else if (isPhone) {
    user = await prisma.user.findFirst({
      where: { phone: input.identifier },
      select: selectFields
    });
  } else {
    // 假设是学号或工号：同时查询 studentId 和 teacherId 字段
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { studentId: input.identifier },
          { teacherId: input.identifier }
        ]
      },
      select: selectFields
    });
  }
  
  if (!user) throw new Error("ACCOUNT_NOT_FOUND");

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new Error("INCORRECT_PASSWORD");
  
  const token = jwt.sign({ sub: user.id, isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin, tokenVersion: user.tokenVersion }, JWT_SECRET, { expiresIn: "7d" });
  
  // 异步处理用户提醒，不阻塞登录流程
  processUserReminders(user.id).catch(error => {
    console.error('处理用户提醒失败:', error);
  });
  
  return {
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
  };
}

// 管理员批量创建学生账号
export const batchCreateStudentsSchema = z.object({
  students: z.array(z.object({
    studentId: z.string().min(1),
    name: z.string().min(1),
    className: z.string().min(1),
    college: z.string().min(1),
    major: z.string().min(1),
    gender: z.enum(["男", "女"]),
  }))
});

export async function batchCreateStudents(input: z.infer<typeof batchCreateStudentsSchema>) {
  const defaultPassword = "kimochi@2025";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  
  const createPromises = input.students.map(async (student) => {
    // 检查学号是否已存在
    const existing = await prisma.user.findUnique({ where: { studentId: student.studentId } });
    if (existing) {
      throw new Error(`学号 ${student.studentId} 已存在`);
    }
    
    return prisma.user.create({
      data: {
        studentId: student.studentId,
        passwordHash,
        name: student.name,
        className: student.className,
        college: student.college,
        major: student.major,
        gender: student.gender,
        accountType: "student", // 学号注册
        isAdmin: false,
      },
    });
  });
  
  return Promise.all(createPromises);
}

// 创建管理员账户
// 创建管理员/超级管理员：仅账号+密码，账号可以是邮箱或非邮箱
export const createAdminSchema = z.object({
  account: z.string().min(1), // 可为邮箱或其他标识
  password: z.string().min(8),
  name: z.string().min(1).default('超级管理员'),
  isSuperAdmin: z.boolean().optional().default(false),
});

export async function createAdminUser(input: z.infer<typeof createAdminSchema>) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.account);
  const isWorkId = /^[A-Za-z0-9]{3,20}$/.test(input.account); // 工号格式
  const passwordHash = await bcrypt.hash(input.password, 10);

  // 唯一性检查
  if (isEmail) {
    const existing = await prisma.user.findUnique({ where: { email: input.account } });
    if (existing) throw new Error('该邮箱已注册');
  } else if (isWorkId) {
    // 检查工号是否已被使用（在teacherId字段中）
    const existingWorkId = await prisma.user.findFirst({ where: { teacherId: input.account } });
    if (existingWorkId) throw new Error('该工号已被使用');
  }

  const userData: any = {
    passwordHash,
    name: input.name || '超级管理员',
    accountType: 'admin',
    isAdmin: true,
    isSuperAdmin: !!input.isSuperAdmin,
    createdByType: 'admin_created',
  };

  if (isEmail) {
    userData.email = input.account;
    // 邮箱注册：自动设置为登录账号+密保邮箱+个人邮箱
    userData.securityEmail = input.account;
    userData.personalEmail = input.account;
  } else if (isWorkId) {
    userData.teacherId = input.account;
    // 工号注册：无邮箱信息，不自动填充邮箱字段
  }

  const user = await prisma.user.create({
    data: userData,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountType: user.accountType,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin,
  };
}

// 创建教师账户（使用工号）
export const createTeacherSchema = z.object({
  teacherId: z.string().min(1, "工号不能为空"),
  password: z.string().min(8),
  name: z.string().min(1),
  office: z.string().optional(),
  phone: z.string().optional(),
});

export async function createTeacherUser(input: z.infer<typeof createTeacherSchema>) {
  // 检查工号是否已存在
  const existing = await prisma.user.findUnique({ where: { teacherId: input.teacherId } });
  if (existing) {
    throw new Error("该工号已注册");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      teacherId: input.teacherId, // 使用teacherId字段存储工号
      passwordHash,
      name: input.name,
      office: input.office,
      phone: input.phone,
      accountType: "teacher", // 教师账户
      isAdmin: false,
      createdByType: "admin_created", // 标记为管理员创建
      hasUpdatedProfile: input.office && input.phone ? true : false, // 如果填写了办公室和电话就标记为已更新
    },
  });
  
  return {
    id: user.id,
    teacherId: user.teacherId, // 工号
    name: user.name,
    office: user.office,
    phone: user.phone,
    accountType: user.accountType,
    isAdmin: user.isAdmin
  };
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; isAdmin: boolean; isSuperAdmin: boolean; iat: number; exp: number; tokenVersion?: number };
  } catch {
    return null;
  }
}


