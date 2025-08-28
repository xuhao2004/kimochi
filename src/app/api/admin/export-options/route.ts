import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractGradeFromClassName } from '@/lib/gradeUtils';

export async function GET(request: NextRequest) {
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

    // 验证用户权限（只有老师和超级管理员可以访问）
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub }
    });

    if (!user || (!user.isAdmin && user.accountType !== 'teacher' && !user.isSuperAdmin)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 获取URL参数用于递进式筛选
    const url = new URL(request.url);
    const selectedGrade = url.searchParams.get('grade');
    const selectedCollege = url.searchParams.get('college');
    const selectedMajor = url.searchParams.get('major');

    // 获取所有班级数据用于分析
    const usersWithClassName = await prisma.user.findMany({
      where: { 
        className: { not: null }
      },
      select: { className: true, college: true, major: true }
    });

    // 构建年级层级数据
    const gradeMap = new Map<string, Set<string>>();
    const collegeMap = new Map<string, Map<string, Set<string>>>();
    const majorMap = new Map<string, Map<string, Set<string>>>();

    usersWithClassName.forEach(user => {
      const grade = extractGradeFromClassName(user.className!);
      if (!grade || !user.college || !user.major) return;

      // 年级 -> 学院
      if (!gradeMap.has(grade)) {
        gradeMap.set(grade, new Set());
      }
      gradeMap.get(grade)!.add(user.college);

      // 年级 + 学院 -> 专业
      const gradeCollegeKey = `${grade}_${user.college}`;
      if (!collegeMap.has(gradeCollegeKey)) {
        collegeMap.set(gradeCollegeKey, new Map());
      }
      if (!collegeMap.get(gradeCollegeKey)!.has(user.major)) {
        collegeMap.get(gradeCollegeKey)!.set(user.major, new Set());
      }

      // 年级 + 学院 + 专业 -> 班级
      const gradeMajorKey = `${grade}_${user.college}_${user.major}`;
      if (!majorMap.has(gradeMajorKey)) {
        majorMap.set(gradeMajorKey, new Map());
      }
      if (!majorMap.get(gradeMajorKey)!.has(user.className!)) {
        majorMap.get(gradeMajorKey)!.set(user.className!, new Set());
      }
    });

    // 如果有特定查询参数，返回递进式数据
    if (selectedGrade && selectedCollege && selectedMajor) {
      // 返回指定年级+学院+专业的班级
      const gradeMajorKey = `${selectedGrade}_${selectedCollege}_${selectedMajor}`;
      const classes = Array.from(majorMap.get(gradeMajorKey)?.keys() || []).sort();
      return NextResponse.json({ classes });
    }

    if (selectedGrade && selectedCollege) {
      // 返回指定年级+学院的专业
      const gradeCollegeKey = `${selectedGrade}_${selectedCollege}`;
      const majors = Array.from(collegeMap.get(gradeCollegeKey)?.keys() || []).sort();
      return NextResponse.json({ majors });
    }

    if (selectedGrade) {
      // 返回指定年级的学院
      const colleges = Array.from(gradeMap.get(selectedGrade) || []).sort();
      return NextResponse.json({ colleges });
    }

    // 默认返回所有选项（用于初始加载）
    const grades = Array.from(gradeMap.keys()).sort().reverse();
    const allColleges = new Set<string>();
    const allMajors = new Set<string>();
    const allClasses = new Set<string>();

    // 收集所有学院、专业、班级
    usersWithClassName.forEach(user => {
      if (user.college) allColleges.add(user.college);
      if (user.major) allMajors.add(user.major);
      if (user.className) allClasses.add(user.className);
    });

    return NextResponse.json({
      grades,
      colleges: Array.from(allColleges).sort(),
      majors: Array.from(allMajors).sort(),
      classes: Array.from(allClasses).sort()
    });

  } catch (error) {
    console.error('获取导出选项失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
