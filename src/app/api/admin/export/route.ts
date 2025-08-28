import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractGradeFromClassName } from '@/lib/gradeUtils';

interface ExportFilters {
  includePersonalInfo: boolean;
  includeAssessments: boolean;
  includeMoodData: boolean;
  includeLocationData: boolean;
  includeFriendData: boolean;
  includePostData: boolean;
  includeViolationData: boolean;
  gradeFilter: string;
  collegeFilter: string;
  majorFilter: string;
  classFilter: string;
  userFilter: string;
  dateRange: { start: string; end: string };
}

interface UserData {
  id: string;
  name: string;
  nickname?: string;
  email?: string;
  studentId?: string;
  gender?: string;
  zodiac?: string;
  className?: string;
  college?: string;
  major?: string;
  phone?: string;
  office?: string;
  personalEmail?: string;
  accountType: string;
  hasUpdatedProfile: boolean;
  createdAt: string;
  lastLocationName?: string;
  lastWeatherSummary?: string;
  lastWeatherTempC?: number;
  lastWeatherUpdatedAt?: string;
  lastDailyMessage?: string;
  lastDailyAt?: string;
  assessments?: any[];
  friendCount?: number;
  postCount?: number;
  commentCount?: number;
  featuredCount?: number;
  violationCount?: number;
}

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

    // 验证用户权限（只有老师和超级管理员可以导出）
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub }
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 403 });
    }

    if (!user.isAdmin && user.accountType !== 'teacher' && !user.isSuperAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const filters: ExportFilters = await request.json();

    // 构建用户筛选条件
    const whereConditions: any = {};

    // 年级筛选（基于班级名称）
    if (filters.gradeFilter && filters.gradeFilter !== 'all') {
      // 获取所有用户的班级，筛选出匹配年级的
      const allUsers = await prisma.user.findMany({
        where: { className: { not: null } },
        select: { id: true, className: true }
      });
      
      const matchingUserIds = allUsers
        .filter(u => extractGradeFromClassName(u.className!) === filters.gradeFilter)
        .map(u => u.id);
      
      if (matchingUserIds.length > 0) {
        whereConditions.id = { in: matchingUserIds };
      } else {
        // 如果没有匹配的用户，返回空结果
        whereConditions.id = { in: [] };
      }
    }

    // 学院筛选
    if (filters.collegeFilter && filters.collegeFilter !== 'all') {
      whereConditions.college = filters.collegeFilter;
    }

    // 专业筛选
    if (filters.majorFilter && filters.majorFilter !== 'all') {
      whereConditions.major = filters.majorFilter;
    }

    // 班级筛选
    if (filters.classFilter && filters.classFilter !== 'all') {
      whereConditions.className = filters.classFilter;
    }

    // 用户筛选
    if (filters.userFilter) {
      whereConditions.OR = [
        { name: { contains: filters.userFilter } },
        { studentId: { contains: filters.userFilter } },
        { email: { contains: filters.userFilter } }
      ];
    }

    // 时间范围筛选
    if (filters.dateRange.start || filters.dateRange.end) {
      whereConditions.createdAt = {};
      if (filters.dateRange.start) {
        whereConditions.createdAt.gte = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        whereConditions.createdAt.lte = new Date(filters.dateRange.end + 'T23:59:59.999Z');
      }
    }

    // 获取用户基本数据
    const users = await prisma.user.findMany({
      where: whereConditions,
      orderBy: [
        { college: 'asc' },
        { className: 'asc' },
        { name: 'asc' }
      ]
    });

    // 处理用户数据并添加扩展信息
    const enrichedUsers: UserData[] = await Promise.all(
      users.map(async (user) => {
        const userData: UserData = {
          id: user.id,
          name: user.name,
          nickname: user.nickname || undefined,
          email: user.email || undefined,
          studentId: user.studentId || undefined,
          gender: user.gender || undefined,
          zodiac: user.zodiac || undefined,
          className: user.className || undefined,
          college: user.college || undefined,
          major: user.major || undefined,
          phone: user.phone || undefined,
          office: user.office || undefined,
          personalEmail: user.personalEmail || undefined,
          accountType: user.accountType,
          hasUpdatedProfile: user.hasUpdatedProfile,
          createdAt: user.createdAt.toISOString(),
          lastLocationName: user.lastLocationName || undefined,
          lastWeatherSummary: user.lastWeatherSummary || undefined,
          lastWeatherTempC: user.lastWeatherTempC || undefined,
          lastWeatherUpdatedAt: user.lastWeatherUpdatedAt?.toISOString(),
          lastDailyMessage: user.lastDailyMessage || undefined,
          lastDailyAt: user.lastDailyAt?.toISOString()
        };

        // 获取测评数据
        if (filters.includeAssessments) {
          const assessments = await prisma.assessment.findMany({
            where: { userId: user.id },
            orderBy: { completedAt: 'desc' },
            select: {
              id: true,
              type: true,
              completedAt: true,
              personalityType: true,
              overallScore: true,
              riskLevel: true,
              analysisResult: true,
              needsAttention: true,
              deletedByUser: true
            }
          });
          userData.assessments = assessments;
        }

        // 获取好友数量
        if (filters.includeFriendData) {
          const friendCount = await prisma.friendship.count({
            where: {
              OR: [
                { userId: user.id, status: 'accepted' },
                { friendId: user.id, status: 'accepted' }
              ]
            }
          });
          userData.friendCount = friendCount;
        }

        // 获取留言墙数据
        if (filters.includePostData) {
          const [postCount, commentCount, featuredPosts, featuredComments] = await Promise.all([
            prisma.post.count({ where: { userId: user.id } }),
            prisma.postComment.count({ where: { userId: user.id } }),
            prisma.post.count({ where: { userId: user.id, isPinned: true } }),
            prisma.postComment.count({ where: { userId: user.id, isPinned: true } })
          ]);
          
          userData.postCount = postCount;
          userData.commentCount = commentCount;
          userData.featuredCount = featuredPosts + featuredComments;
        }

        // 获取违规数据 - 暂时跳过，因为Report表模型未定义
        if (filters.includeViolationData) {
          try {
            // 使用原始SQL查询替代Prisma模型
            const violationResult = await prisma.$queryRaw`
              SELECT COUNT(*) as count FROM Report r
              JOIN Post p ON r.postId = p.id
              WHERE p.userId = ${user.id} AND r.status = 'resolved'
            ` as Array<{ count: bigint }>;
            userData.violationCount = Number(violationResult[0]?.count || 0);
          } catch (error) {
            console.warn('获取违规数据失败，跳过:', error instanceof Error ? error.message : '未知错误');
            userData.violationCount = 0;
          }
        }

        return userData;
      })
    );

    // 生成HTML报告
    const html = generateHTMLReport(enrichedUsers, filters);

    // 使用Response构造函数处理中文内容，确保UTF-8编码
    const htmlBuffer = Buffer.from(html, 'utf8');
    const filename = encodeURIComponent(`用户数据导出_${new Date().toISOString().split('T')[0]}.html`);
    
    return new Response(htmlBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`
      }
    });

  } catch (error) {
    console.error('数据导出失败:', error);
    console.error('错误详情:', error instanceof Error ? error.stack : '未知错误');
    return NextResponse.json({ 
      error: '服务器错误', 
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

function generateHTMLReport(users: UserData[], filters: ExportFilters): string {
  const now = new Date();
  const exportTime = now.toLocaleString('zh-CN');
  
  // 统计数据
  const stats = {
    totalUsers: users.length,
    maleUsers: users.filter(u => u.gender === '男').length,
    femaleUsers: users.filter(u => u.gender === '女').length,
    profileCompleted: users.filter(u => u.hasUpdatedProfile).length,
    hasAssessments: filters.includeAssessments ? users.filter(u => u.assessments && u.assessments.length > 0).length : 0,
    totalAssessments: filters.includeAssessments ? users.reduce((sum, u) => sum + (u.assessments?.length || 0), 0) : 0,
    totalPosts: filters.includePostData ? users.reduce((sum, u) => sum + (u.postCount || 0), 0) : 0,
    totalViolations: filters.includeViolationData ? users.reduce((sum, u) => sum + (u.violationCount || 0), 0) : 0
  };

  const colleges = [...new Set(users.map(u => u.college).filter(Boolean))];
  const classes = [...new Set(users.map(u => u.className).filter(Boolean))];

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>kimochi心晴用户数据报告 - ${exportTime}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .header h1 {
            color: #2563eb;
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .export-info {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-number {
            font-size: 3rem;
            font-weight: bold;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }
        
        .stat-label {
            color: #64748b;
            font-weight: 500;
        }
        
        .controls {
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        
        .search-box {
            width: 100%;
            padding: 12px 20px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 16px;
            margin-bottom: 16px;
            transition: border-color 0.3s ease;
        }
        
        .search-box:focus {
            outline: none;
            border-color: #3b82f6;
        }
        
        .filters {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }
        
        .filter-select {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: white;
        }
        
        .data-table {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th {
            background: #f8fafc;
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
            position: sticky;
            top: 0;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
        }
        
        tr:hover {
            background: #f8fafc;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
        }
        
        .user-details h4 {
            margin-bottom: 4px;
            color: #1f2937;
        }
        
        .user-details p {
            color: #6b7280;
            font-size: 14px;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            margin: 2px;
        }
        
        .badge-success {
            background: #dcfce7;
            color: #166534;
        }
        
        .badge-warning {
            background: #fef3c7;
            color: #92400e;
        }
        
        .badge-danger {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .badge-info {
            background: #dbeafe;
            color: #1d4ed8;
        }
        
        .risk-high {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .risk-medium {
            background: #fef3c7;
            color: #d97706;
        }
        
        .risk-low {
            background: #dcfce7;
            color: #059669;
        }
        
        .assessment-summary {
            font-size: 14px;
            line-height: 1.4;
        }
        
        .no-data {
            color: #9ca3af;
            font-style: italic;
        }
        
        .expandable {
            cursor: pointer;
            user-select: none;
        }
        
        .expandable:hover {
            background: #f3f4f6;
        }
        
        .expanded-content {
            display: none;
            background: #f9fafb;
            padding: 16px;
            border-top: 1px solid #e5e7eb;
        }
        
        .expanded-content.show {
            display: block;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            table {
                font-size: 14px;
            }
            
            th, td {
                padding: 8px 6px;
            }
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌤️ kimochi心晴用户数据报告</h1>
            <div class="export-info">
                <p><strong>导出时间:</strong> ${exportTime}</p>
                <p><strong>数据范围:</strong> ${getFilterDescription(filters)}</p>
                <p><strong>用户数量:</strong> ${stats.totalUsers} 人</p>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${stats.totalUsers}</div>
                <div class="stat-label">总用户数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.maleUsers}</div>
                <div class="stat-label">男性用户</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.femaleUsers}</div>
                <div class="stat-label">女性用户</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.profileCompleted}</div>
                <div class="stat-label">完善资料</div>
            </div>
            ${filters.includeAssessments ? `
            <div class="stat-card">
                <div class="stat-number">${stats.hasAssessments}</div>
                <div class="stat-label">参与测评</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.totalAssessments}</div>
                <div class="stat-label">测评总数</div>
            </div>
            ` : ''}
            ${filters.includePostData ? `
            <div class="stat-card">
                <div class="stat-number">${stats.totalPosts}</div>
                <div class="stat-label">留言总数</div>
            </div>
            ` : ''}
            ${filters.includeViolationData ? `
            <div class="stat-card">
                <div class="stat-number">${stats.totalViolations}</div>
                <div class="stat-label">违规记录</div>
            </div>
            ` : ''}
        </div>
        
        <div class="controls">
            <input type="text" id="searchBox" class="search-box" placeholder="搜索用户姓名、学号、班级或学院...">
            <div class="filters">
                <select id="collegeFilter" class="filter-select">
                    <option value="">全部学院</option>
                    ${colleges.map(college => `<option value="${college}">${college}</option>`).join('')}
                </select>
                <select id="classFilter" class="filter-select">
                    <option value="">全部班级</option>
                    ${classes.map(cls => `<option value="${cls}">${cls}</option>`).join('')}
                </select>
                <select id="genderFilter" class="filter-select">
                    <option value="">全部性别</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                </select>
                <select id="profileFilter" class="filter-select">
                    <option value="">全部状态</option>
                    <option value="completed">已完善资料</option>
                    <option value="incomplete">未完善资料</option>
                </select>
            </div>
        </div>
        
        <div class="data-table">
            <table id="userTable">
                <thead>
                    <tr>
                        <th>用户信息</th>
                        <th>基本信息</th>
                        <th>学籍信息</th>
                        ${filters.includeLocationData ? '<th>位置信息</th>' : ''}
                        ${filters.includeAssessments ? '<th>测评数据</th>' : ''}
                        ${filters.includeFriendData ? '<th>社交数据</th>' : ''}
                        ${filters.includePostData ? '<th>活动数据</th>' : ''}
                        ${filters.includeViolationData ? '<th>违规记录</th>' : ''}
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => generateUserRow(user, filters)).join('')}
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        // 搜索功能
        document.getElementById('searchBox').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#userTable tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
        
        // 筛选功能
        function setupFilter(filterId, columnIndex) {
            document.getElementById(filterId).addEventListener('change', function(e) {
                const filterValue = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#userTable tbody tr');
                
                rows.forEach(row => {
                    if (!filterValue) {
                        row.classList.remove('hidden');
                        return;
                    }
                    
                    const cell = row.cells[columnIndex];
                    const text = cell ? cell.textContent.toLowerCase() : '';
                    
                    if (text.includes(filterValue)) {
                        row.classList.remove('hidden');
                    } else {
                        row.classList.add('hidden');
                    }
                });
                
                updateVisibility();
            });
        }
        
        function updateVisibility() {
            const rows = document.querySelectorAll('#userTable tbody tr');
            rows.forEach(row => {
                const isSearchHidden = row.style.display === 'none';
                const isFilterHidden = row.classList.contains('hidden');
                
                if (isSearchHidden || isFilterHidden) {
                    row.style.display = 'none';
                } else {
                    row.style.display = '';
                }
            });
        }
        
        // 初始化筛选器
        setupFilter('collegeFilter', 2);
        setupFilter('genderFilter', 1);
        
        // 个人资料完善状态筛选
        document.getElementById('profileFilter').addEventListener('change', function(e) {
            const filterValue = e.target.value;
            const rows = document.querySelectorAll('#userTable tbody tr');
            
            rows.forEach(row => {
                if (!filterValue) {
                    row.classList.remove('hidden');
                    return;
                }
                
                const statusCell = row.cells[row.cells.length - 1];
                const hasCompleted = statusCell.textContent.includes('已完善');
                
                if ((filterValue === 'completed' && hasCompleted) || 
                    (filterValue === 'incomplete' && !hasCompleted)) {
                    row.classList.remove('hidden');
                } else {
                    row.classList.add('hidden');
                }
            });
            
            updateVisibility();
        });
        
        // 展开/收起详细信息
        document.querySelectorAll('.expandable').forEach(row => {
            row.addEventListener('click', function() {
                const expandedContent = this.nextElementSibling;
                if (expandedContent && expandedContent.classList.contains('expanded-content')) {
                    expandedContent.classList.toggle('show');
                }
            });
        });
    </script>
</body>
</html>`;
}

function generateUserRow(user: UserData, filters: ExportFilters): string {
  const assessmentSummary = user.assessments?.length ? 
    `完成 ${user.assessments.length} 项测评` : '未参与测评';
  
  const riskLevel = user.assessments?.find(a => a.riskLevel)?.riskLevel;
  const riskBadge = riskLevel ? 
    `<span class="badge risk-${riskLevel}">${
      riskLevel === 'high' ? '高风险' : 
      riskLevel === 'medium' ? '中风险' : '低风险'
    }</span>` : '';

  return `
    <tr class="user-row">
      <td>
        <div class="user-info">
          <div class="user-avatar">${user.name[0]}</div>
          <div class="user-details">
            <h4>${user.name}</h4>
            <p>${user.nickname || ''}</p>
            <p>${user.studentId || user.email || ''}</p>
          </div>
        </div>
      </td>
      <td>
        <div>性别: ${user.gender || '未填写'}</div>
        <div>星座: ${user.zodiac || '未填写'}</div>
        <div>电话: ${user.phone || '未填写'}</div>
        ${user.personalEmail ? `<div>个人邮箱: ${user.personalEmail}</div>` : ''}
      </td>
      <td>
        <div>学院: ${user.college || '未填写'}</div>
        <div>专业: ${user.major || '未填写'}</div>
        <div>班级: ${user.className || '未填写'}</div>
        <div>账户类型: ${user.accountType}</div>
      </td>
      ${filters.includeLocationData ? `
      <td>
        <div>位置: ${user.lastLocationName || '未知'}</div>
        <div>天气: ${user.lastWeatherSummary || '未知'} ${user.lastWeatherTempC ? user.lastWeatherTempC + '°C' : ''}</div>
        ${user.lastDailyMessage ? `<div>心语: ${user.lastDailyMessage}</div>` : ''}
      </td>
      ` : ''}
      ${filters.includeAssessments ? `
      <td>
        <div class="assessment-summary">
          ${assessmentSummary}
          ${riskBadge}
          ${user.assessments?.some(a => a.needsAttention) ? '<span class="badge badge-danger">需关注</span>' : ''}
        </div>
      </td>
      ` : ''}
      ${filters.includeFriendData ? `
      <td>好友数: ${user.friendCount || 0}</td>
      ` : ''}
      ${filters.includePostData ? `
      <td>
        <div>发帖: ${user.postCount || 0}</div>
        <div>评论: ${user.commentCount || 0}</div>
        <div>精选: ${user.featuredCount || 0}</div>
      </td>
      ` : ''}
      ${filters.includeViolationData ? `
      <td>
        ${user.violationCount ? 
          `<span class="badge badge-danger">${user.violationCount} 次违规</span>` : 
          '<span class="badge badge-success">无违规</span>'
        }
      </td>
      ` : ''}
      <td>
        <span class="badge ${user.hasUpdatedProfile ? 'badge-success' : 'badge-warning'}">
          ${user.hasUpdatedProfile ? '已完善资料' : '未完善资料'}
        </span>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
          注册: ${new Date(user.createdAt).toLocaleDateString('zh-CN')}
        </div>
      </td>
    </tr>
  `;
}

function getFilterDescription(filters: ExportFilters): string {
  const descriptions = [];
  
  if (filters.gradeFilter !== 'all') {
    descriptions.push(`${filters.gradeFilter}级`);
  }
  
  if (filters.collegeFilter !== 'all') {
    descriptions.push(filters.collegeFilter);
  }
  
  if (filters.classFilter && filters.classFilter !== 'all') {
    descriptions.push(filters.classFilter);
  }
  
  if (filters.userFilter) {
    descriptions.push(`关键词"${filters.userFilter}"`);
  }
  
  if (filters.dateRange.start || filters.dateRange.end) {
    const start = filters.dateRange.start || '开始';
    const end = filters.dateRange.end || '现在';
    descriptions.push(`时间段:${start}至${end}`);
  }
  
  return descriptions.length > 0 ? descriptions.join(', ') : '全部用户';
}
