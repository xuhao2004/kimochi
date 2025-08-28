import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// 搜索用户
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证是否为高级管理员
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isSuperAdmin: true }
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: "权限不足，需要高级管理员权限" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const accountType = searchParams.get('accountType');
    const college = searchParams.get('college');
    const major = searchParams.get('major');
    const format = (searchParams.get('format') || '').toLowerCase();
    const groupBy = (searchParams.get('groupBy') || '').toLowerCase();
    const columnsParam = searchParams.get('columns');

    // 构建搜索条件
    const where: {
      OR?: Array<{
        name?: { contains: string };
        nickname?: { contains: string };
        email?: { contains: string };
        personalEmail?: { contains: string };
        studentId?: { contains: string };
        phone?: { contains: string };
      }>;
      accountType?: string;
    } = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { nickname: { contains: query } },
        { email: { contains: query } }, // 登录邮箱
        { personalEmail: { contains: query } }, // 个人邮箱
        { studentId: { contains: query } },
        { phone: { contains: query } }
      ];
    }

    if (accountType && accountType !== 'all') {
      where.accountType = accountType;
    }
    if (college && college !== 'all') {
      (where as any).college = college;
    }
    if (major && major !== 'all') {
      (where as any).major = major;
    }

    // CSV/ZIP 导出（无分页，按筛选全量导出）
    if (format === 'csv') {
      // Filename helpers for legacy browser compatibility
      const asciiSafe = (s: string) => s.replace(/[^\x20-\x7E]/g, '_');
      const sanitizeForFilename = (name: string) => name.replace(/[\\\/:*?"<>|]/g, '_');
      const toAsciiFilename = (name: string) => sanitizeForFilename(asciiSafe(name)).replace(/\s+/g, '_');
      const buildContentDisposition = (utf8Filename: string, asciiFallback: string) => {
        const encoded = encodeURIComponent(utf8Filename);
        return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
      };
      // 预处理列选择
      const defaultColumns = ['id','name','nickname','account','displayLabel','accountType','createdByType','studentId','email','personalEmail','phone','contactPhone','college','major','className','office','createdAt'];
      const selectedColumns = (columnsParam && columnsParam.trim().length > 0)
        ? columnsParam.split(',').map(s => s.trim()).filter(Boolean)
        : defaultColumns;

      // 导出字段统一选择一个超集，避免多次调整
      const exportUsers = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          nickname: true,
          accountType: true,
          createdByType: true,
          studentId: true,
          email: true,
          personalEmail: true,
          phone: true,
          contactPhone: true,
          college: true,
          major: true,
          className: true,
          office: true,
          isSuperAdmin: true,
          createdAt: true
        },
        orderBy: [{ college: 'asc' }, { major: 'asc' }, { className: 'asc' }, { name: 'asc' }]
      });

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const s = String(val).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };
      const formatDate = (d: Date) => {
        // YYYY-MM-DD HH:mm:ss（本地时区简化）
        const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
        const dt = new Date(d);
        return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
      };

      const headerMap: Record<string, string> = {
        id: '用户ID',
        name: '姓名',
        nickname: '昵称',
        account: '账号',
        displayLabel: '显示标签',
        loginEmail: '登录邮箱',
        personalEmail: '个人邮箱',
        email: '登录邮箱',
        phone: '手机号',
        contactPhone: '联系电话',
        accountType: '账户类型',
        createdByType: '注册方式',
        studentId: '学号/工号',
        college: '学院',
        major: '专业',
        className: '班级',
        office: '办公室',
        createdAt: '注册时间'
      };

      const getDisplayLabel = (u: any): string => {
        if (u.isSuperAdmin) return '超级管理员';
        if (u.accountType === 'teacher' || u.accountType === 'admin') return '老师';
        if (u.accountType === 'student') return '学生';
        if (u.accountType === 'weapp') return '微信用户';
        return u.createdByType === 'super_admin' ? '超管注册' : '注册用户';
      };

      const getFieldValue = (u: any, key: string): string => {
        switch (key) {
          case 'account':
            return (u.accountType === 'student' || u.accountType === 'teacher') ? (u.studentId || '') : (u.email || u.phone || '');
          case 'displayLabel':
            return getDisplayLabel(u);
          case 'createdAt':
            return formatDate(u.createdAt);
          default:
            return u[key] ?? '';
        }
      };

      const buildCsv = (users: any[]) => {
        const bom = '\ufeff';
        const headers = selectedColumns.map(c => headerMap[c] || c).join(',');
        const lines = users.map(u => selectedColumns.map(c => escapeCsv(getFieldValue(u, c))).join(','));
        return bom + [headers, ...lines].join('\n');
      };

      if (groupBy === 'college') {
        // 分学院导出为 ZIP
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        const byCollege = new Map<string, any[]>();
        for (const u of exportUsers) {
          const key = u.college || '未分配学院';
          if (!byCollege.has(key)) byCollege.set(key, []);
          byCollege.get(key)!.push(u);
        }
        byCollege.forEach((list, key) => {
          const csv = buildCsv(list);
          // Use ASCII-only file names inside ZIP for maximum compatibility
          const fname = `college_${toAsciiFilename(key)}.csv`;
          zip.file(fname, csv);
        });
        const content = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const dateStr = new Date().toISOString().slice(0,10);
        const utf8ZipName = `用户导出_分学院_${dateStr}.zip`;
        const asciiZipName = `users_export_grouped_by_college_${dateStr}.zip`;
        return new Response(content, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': buildContentDisposition(utf8ZipName, asciiZipName)
          }
        });
      }

      // 普通单文件 CSV 导出
      const csv = buildCsv(exportUsers);
      const dateStr = new Date().toISOString().slice(0,10);
      const utf8CsvName = `用户导出_${dateStr}.csv`;
      const asciiCsvName = `users_export_${dateStr}.csv`;
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': buildContentDisposition(utf8CsvName, asciiCsvName)
        }
      });
    }

    // 获取用户列表（分页 JSON）
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        personalEmail: true,
        phone: true,
        studentId: true,
        className: true,
        college: true,
        major: true,
        accountType: true,
        createdByType: true,
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: true,
        lastActiveAt: true,
        profileImage: true,
        gender: true,
        zodiac: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // 获取总数
    const totalUsers = await prisma.user.count({ where });

    // 计算在线状态
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const usersWithStatus = users.map(user => ({
      ...user,
      isOnline: user.lastActiveAt > fiveMinutesAgo
    }));

    return NextResponse.json({
      users: usersWithStatus,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });

  } catch (error) {
    console.error('搜索用户失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 创建用户
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证是否为高级管理员
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isSuperAdmin: true }
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: "权限不足，需要高级管理员权限" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      email,
      password,
      accountType,
      studentId, // 仅学生使用
      className, // 仅学生使用
      teacherId, // 教师工号
      phone,
      office,
      college,
      major
    } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^1[3-9]\d{9}$/;

    // 验证必填字段（根据类型区分）
    if (!name || !password) {
      return NextResponse.json({ error: '姓名和密码为必填项' }, { status: 400 });
    }

    if (accountType === 'teacher') {
      if (!teacherId) {
        return NextResponse.json({ error: '教师工号为必填项' }, { status: 400 });
      }
    } else if (accountType === 'student') {
      if (!studentId || !className || !college || !major) {
        return NextResponse.json({ error: '学生学号、班级、学院、专业为必填项' }, { status: 400 });
      }
    } else if (accountType === 'self') {
      const candidate = typeof email === 'string' ? email.trim() : '';
      const fallbackPhone = typeof phone === 'string' ? phone.trim() : '';
      const isValidCandidate = candidate && (emailRegex.test(candidate) || phoneRegex.test(candidate));
      const isValidFallbackPhone = fallbackPhone && phoneRegex.test(fallbackPhone);
      if (!isValidCandidate && !isValidFallbackPhone) {
        return NextResponse.json({ error: '注册用户需要提供有效的邮箱或手机号' }, { status: 400 });
      }
    }

    // 唯一性检查
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          // 自助注册时可能是手机号
          accountType === 'self' && email && phoneRegex.test(email) ? { phone: email } : undefined,
          accountType === 'self' && phone && phoneRegex.test(phone) ? { phone } : undefined,
          accountType === 'teacher' && teacherId ? { teacherId } : undefined,
          accountType === 'student' && studentId ? { studentId } : undefined
        ].filter(Boolean) as any
      }
    });

    if (existingUser) {
      let msg = '该标识已被注册';
      if (existingUser.email && emailRegex.test(String(email || '')) && existingUser.email === email) msg = '邮箱已被注册';
      else if (existingUser.phone && phoneRegex.test(String(email || '')) && existingUser.phone === email) msg = '手机号已被注册';
      else if (accountType === 'teacher' && teacherId) msg = '工号已被注册';
      else if (accountType === 'student' && studentId) msg = '学号已被注册';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 确定账户类型和权限
    const finalAccountType = accountType || 'self';
    const isTeacher = finalAccountType === 'teacher';

    let newUser;
    if (isTeacher) {
      // 使用工号注册老师：teacherId 字段存储工号；邮箱可选
      newUser = await prisma.user.create({
        data: {
          name,
          email: email || null,
          passwordHash: hashedPassword,
          accountType: 'teacher',
          createdByType: 'admin_created',
          teacherId: teacherId, // 使用专门的教师ID字段存储工号
          office: office || null,
          phone: phone || null,
          isAdmin: true, // 老师具备管理员权限
          isSuperAdmin: false,
          // 如果填写了邮箱，同时设置为密保邮箱和个人邮箱
          securityEmail: email || null,
          personalEmail: email || null
        },
        select: {
          id: true,
          name: true,
          email: true,
          accountType: true,
          isAdmin: true,
          createdAt: true
        }
      });
    } else if (finalAccountType === 'student') {
      newUser = await prisma.user.create({
        data: {
          name,
          email: email || null,
          passwordHash: hashedPassword,
          accountType: 'student',
          createdByType: 'admin_created',
          studentId,
          className,
          college: college || null,
          major: major || null,
          isAdmin: false,
          isSuperAdmin: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          accountType: true,
          isAdmin: true,
          createdAt: true
        }
      });
    } else {
      // 自助注册型由管理员创建的注册用户（支持邮箱或手机号）
      const candidate = typeof email === 'string' ? email.trim() : '';
      let loginEmail: string | null = null;
      let loginPhone: string | null = null;
      if (candidate) {
        if (emailRegex.test(candidate)) loginEmail = candidate;
        else if (phoneRegex.test(candidate)) loginPhone = candidate;
      }
      if (!loginEmail && !loginPhone && typeof phone === 'string' && phoneRegex.test(phone.trim())) {
        loginPhone = phone.trim();
      }
      newUser = await prisma.user.create({
        data: {
          name,
          email: loginEmail,
          phone: loginPhone,
          passwordHash: hashedPassword,
          accountType: 'self',
          createdByType: 'admin_created', // 统一标记为管理员注册
          isAdmin: false,
          isSuperAdmin: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          accountType: true,
          isAdmin: true,
          createdAt: true
        }
      });
    }

    // 更新系统统计
    await prisma.systemStats.updateMany({
      data: {
        totalUsers: {
          increment: 1
        }
      }
    });

    return NextResponse.json({
      message: "用户创建成功",
      user: newUser
    });

  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 删除用户
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

    // 验证是否为高级管理员
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isSuperAdmin: true }
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: "权限不足，需要高级管理员权限" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    // 不能删除自己
    if (userId === payload.sub) {
      return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
    }

    // 检查要删除的用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, studentId: true, accountType: true, isSuperAdmin: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 不能删除其他高级管理员
    if (targetUser.isSuperAdmin) {
      return NextResponse.json({ error: "不能删除其他高级管理员账号" }, { status: 400 });
    }

    // 删除用户（级联删除相关数据）
    await prisma.user.delete({
      where: { id: userId }
    });

    // 更新系统统计
    await prisma.systemStats.updateMany({
      data: {
        totalUsers: {
          decrement: 1
        }
      }
    });

    // 根据用户类型显示不同的标识信息
    const userIdentifier = targetUser.accountType === 'student' && targetUser.studentId 
      ? targetUser.studentId 
      : targetUser.email || '无标识';

    return NextResponse.json({
      message: `用户 ${targetUser.name} (${userIdentifier}) 已被删除`
    });

  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
