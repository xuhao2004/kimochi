"use client";
import React, { useEffect, useState } from "react";
import { usePageVisit } from "@/hooks/usePageVisit";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { AdminAccessDenied } from "@/components/AccessDenied";
import { useAlert } from "@/components/AppleAlert";
import AppleSelect from "@/components/AppleSelect";

type AdminUser = {
  id: string;
  email: string | null;
  studentId: string | null;
  name: string;
  nickname: string | null;
  zodiac: string | null;
  gender: string | null;
  className: string | null;
  college: string | null;
  major: string | null;
  accountType: string;
  createdByType: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasUpdatedProfile: boolean;
  createdAt: string;
  lastLocationName: string | null;
  lastWeatherSummary: string | null;
  lastWeatherTempC: number | null;
  lastWeatherUpdatedAt: string | null;
  lastDailyMessage: string | null;
  lastDailyAt: string | null;
};

type StudentInput = {
  studentId: string;
  name: string;
  className: string;
  college: string;
  major: string;
  gender: "男" | "女";
};

// 获取账户类型标签和样式的辅助函数
function getAccountTypeDisplay(user: AdminUser) {
  if (user.isSuperAdmin) {
    return { label: '超级管理员', className: 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-200' };
  }
  if (user.accountType === 'teacher' || user.accountType === 'admin') {
    return { label: '老师', className: 'bg-amber-100 text-amber-700' };
  }
  if (user.accountType === 'student') {
    return { label: '学生', className: 'bg-blue-100 text-blue-700' };
  }
  if (user.accountType === 'weapp') {
    return { label: '微信用户', className: 'bg-emerald-100 text-emerald-700' };
  }
  return { label: user.createdByType === 'super_admin' ? '超管注册' : '注册用户', className: 'bg-gray-100 text-gray-700' };
}

function getSourceBadge(user: AdminUser) {
  const source = user.createdByType as string | null;
  if (!source) return null;
  if (source === 'weapp_oauth' || source === 'wechat_oauth') {
    return { label: '微信注册', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
  }
  if (source === 'email_register' || source === 'phone_register') {
    return { label: '自助注册', className: 'bg-gray-50 text-gray-700 border border-gray-200' };
  }
  if (source === 'super_admin') {
    return { label: '超管注册', className: 'bg-purple-50 text-purple-700 border border-purple-200' };
  }
  if (source === 'admin_created') {
    return { label: '管理员创建', className: 'bg-amber-50 text-amber-700 border border-amber-200' };
  }
  return null;
}

// 账户类型中文映射
function getAccountTypeLabel(accountType: string) {
  const typeMap: Record<string, string> = {
    'student': '学生',
    'teacher': '教师',
    'admin': '管理员',
    'self': '注册用户',
    'weapp': '微信用户',
  };
  return typeMap[accountType] || accountType;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string>("");
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [studentsInput, setStudentsInput] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState("");

  
  // 新增：测评管理状态
  const [activeTab, setActiveTab] = useState<'users' | 'assessments' | 'export'>('users');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  
  // 数据导出状态
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSuccess, setExportSuccess] = useState("");
  const [realDataOptions, setRealDataOptions] = useState({
    grades: [] as string[],
    colleges: [] as string[],
    majors: [] as string[],
    classes: [] as string[]
  });
  const [exportFilters, setExportFilters] = useState({
    includePersonalInfo: true,
    includeAssessments: true,
    includeMoodData: true,
    includeLocationData: true,
    includeFriendData: true,
    includePostData: true,
    includeViolationData: true,
    gradeFilter: 'all',
    collegeFilter: 'all',
    majorFilter: 'all',
    classFilter: 'all',
    userFilter: '',
    dateRange: { start: '', end: '' }
  });
  
  // 测评详情模态框状态
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // 删除功能状态
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [deletingSingle, setDeletingSingle] = useState<string | null>(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState<string | null>(null);
  
  // 高级管理员状态
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // 用户详情展开状态
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  // 确认对话框
  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const { showAlert } = useAlert();
  
  // 记录页面访问
  usePageVisit("admin");

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
    if (t) {
      fetchUsers(t);
      // 根据当前标签页加载对应数据
      if (activeTab === 'assessments') {
        fetchAssessments(t);
      } else if (activeTab === 'export') {
        fetchRealDataOptions(t);
      }
    }
  }, [activeTab]);

  // 获取测评数据
  const fetchAssessments = async (authToken: string) => {
    try {
      setAssessmentLoading(true);
      const response = await fetch("/api/admin/assessments", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        throw new Error("获取测评数据失败");
      }
      
      const data = await response.json();
      setAssessments(data.assessments || []);
    } catch (error) {
      console.error("获取测评数据失败:", error);
      setError("获取测评数据失败");
    } finally {
      setAssessmentLoading(false);
    }
  };

  // 获取真实数据选项
  const fetchRealDataOptions = async (authToken: string, grade?: string, college?: string, major?: string) => {
    try {
      let url = '/api/admin/export-options';
      const params = new URLSearchParams();
      if (grade && grade !== 'all') params.append('grade', grade);
      if (college && college !== 'all') params.append('college', college);
      if (major && major !== 'all') params.append('major', major);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRealDataOptions(prev => ({
          grades: data.grades || prev.grades || [],
          colleges: data.colleges || prev.colleges || [],
          majors: data.majors || prev.majors || [],
          classes: data.classes || prev.classes || []
        }));
      }
    } catch (error) {
      console.error('获取筛选选项失败:', error);
      // 确保在错误情况下也有默认值
      setRealDataOptions({
        grades: [],
        colleges: [],
        majors: [],
        classes: []
      });
    }
  };

  // 处理筛选条件变化
  const handleFilterChange = async (filterType: 'grade' | 'college' | 'major' | 'class', value: string) => {
    if (!token) return;

    const newFilters = { ...exportFilters };
    
    if (filterType === 'grade') {
      newFilters.gradeFilter = value;
      // 重置后续筛选
      newFilters.collegeFilter = 'all';
      newFilters.majorFilter = 'all';
      newFilters.classFilter = 'all';
      
      // 获取对应学院选项
      if (value !== 'all') {
        await fetchRealDataOptions(token, value);
      }
    } else if (filterType === 'college') {
      newFilters.collegeFilter = value;
      // 重置后续筛选
      newFilters.majorFilter = 'all';
      newFilters.classFilter = 'all';
      
      // 获取对应专业选项
      if (value !== 'all' && newFilters.gradeFilter !== 'all') {
        await fetchRealDataOptions(token, newFilters.gradeFilter, value);
      }
    } else if (filterType === 'major') {
      newFilters.majorFilter = value;
      // 重置后续筛选
      newFilters.classFilter = 'all';
      
      // 获取对应班级选项
      if (value !== 'all' && newFilters.gradeFilter !== 'all' && newFilters.collegeFilter !== 'all') {
        await fetchRealDataOptions(token, newFilters.gradeFilter, newFilters.collegeFilter, value);
      }
    } else if (filterType === 'class') {
      newFilters.classFilter = value;
    }
    
    setExportFilters(newFilters);
  };

  // 数据导出功能
  const handleExportData = async () => {
    if (!token) return;
    
    try {
      setExportLoading(true);
      setExportProgress(0);
      setExportSuccess("");
      setError("");
      
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exportFilters)
      });
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `导出失败 (状态码: ${response.status})`);
      }
      
      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `用户数据导出_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // 显示成功通知
      setExportSuccess(`数据导出成功！文件已下载为 "用户数据导出_${new Date().toISOString().split('T')[0]}.html"`);
      
      setTimeout(() => {
        setExportProgress(0);
        setExportSuccess("");
      }, 5000);
      
    } catch (error) {
      console.error('导出失败:', error);
      setError(error instanceof Error ? error.message : '数据导出失败，请重试');
      setExportProgress(0);
    } finally {
      setExportLoading(false);
    }
  };

  // 获取测评详情
  const fetchAssessmentDetail = async (assessmentId: string) => {
    if (!token) return;
    
    try {
      setDetailLoading(true);
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: 获取测评详情失败`);
      }
      
      const data = await response.json();
      console.log("获取到的测评详情:", data); // 调试信息
      setSelectedAssessment(data.assessment);
      setShowDetailModal(true);
    } catch (error) {
      console.error("获取测评详情失败:", error);
      setError(`获取测评详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setDetailLoading(false);
    }
  };

  // 关闭详情模态框
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedAssessment(null);
  };

  // 删除单个测评记录
  const deleteSingleAssessment = (assessmentId: string, assessmentType: string) => {
    if (!token) return;
    
    showConfirm({
      title: '危险操作确认',
      message: `您即将永久删除这条${assessmentType}测评记录！`,
      type: 'danger',
      confirmText: '永久删除',
      cancelText: '取消',
      details: [
        '用户的测评数据',
        '分析结果和报告',
        '所有相关记录'
      ],
      onConfirm: async () => {
        try {
          setDeletingSingle(assessmentId);
          const response = await fetch(`/api/admin/assessments?ids=${assessmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          const data = await response.json();
          
          if (response.ok) {
            // 重新获取测评列表
            fetchAssessments(token);
            // 如果当前打开的详情是被删除的记录，关闭模态框
            if (selectedAssessment?.id === assessmentId) {
              closeDetailModal();
            }
          } else {
            throw new Error(data.error || '删除失败');
          }
        } catch (error) {
          console.error('删除测评记录失败:', error);
          setError(error instanceof Error ? error.message : '删除失败，请重试');
          throw error;
        } finally {
          setDeletingSingle(null);
        }
      }
    });
  };

  // 批量删除选中的测评记录
  const deleteSelectedAssessments = () => {
    if (!token || selectedAssessments.length === 0) return;
    
    showConfirm({
      title: '批量删除确认',
      message: `您即将永久删除 ${selectedAssessments.length} 条测评记录！`,
      type: 'danger',
      confirmText: '批量删除',
      cancelText: '取消',
      details: [
        `${selectedAssessments.length} 条测评记录`,
        '所有相关的用户数据',
        '分析结果和报告'
      ],
      onConfirm: async () => {
        try {
          setDeleteAllLoading(true);
          const response = await fetch(`/api/admin/assessments?ids=${selectedAssessments.join(',')}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          const data = await response.json();
          
          if (response.ok) {
            setSelectedAssessments([]);
            fetchAssessments(token);
            closeDetailModal();
          } else {
            throw new Error(data.error || '批量删除失败');
          }
        } catch (error) {
          console.error('批量删除测评记录失败:', error);
          setError(error instanceof Error ? error.message : '批量删除失败，请重试');
          throw error;
        } finally {
          setDeleteAllLoading(false);
        }
      }
    });
  };

  // 删除所有测评记录
  const deleteAllAssessments = () => {
    if (!token) return;
    
    showConfirm({
      title: '🚨 极度危险操作',
      message: '您即将删除所有测评记录！这是系统级删除操作！',
      type: 'danger',
      confirmText: '清空所有',
      cancelText: '取消',
      details: [
        '所有用户的测评数据',
        '所有分析结果和报告',
        '所有历史记录',
        '可能影响数百个用户的数据'
      ],
      onConfirm: async () => {
        try {
          setDeleteAllLoading(true);
          const response = await fetch('/api/admin/assessments?deleteAll=true', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          const data = await response.json();
          
          if (response.ok) {
            setSelectedAssessments([]);
            fetchAssessments(token);
            closeDetailModal();
          } else {
            throw new Error(data.error || '全部删除失败');
          }
        } catch (error) {
          console.error('删除所有测评记录失败:', error);
          setError(error instanceof Error ? error.message : '删除失败，请重试');
          throw error;
        } finally {
          setDeleteAllLoading(false);
        }
      }
    });
  };

  // 切换选中状态
  const toggleAssessmentSelection = (assessmentId: string) => {
    setSelectedAssessments(prev => 
      prev.includes(assessmentId)
        ? prev.filter(id => id !== assessmentId)
        : [...prev, assessmentId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedAssessments.length === assessments.length) {
      setSelectedAssessments([]);
    } else {
      setSelectedAssessments(assessments.map(a => a.id));
    }
  };

  async function fetchUsers(tk: string) {
    setError("");
    try {
      // 检查当前用户权限
      const profileRes = await fetch("/api/profile", { headers: { Authorization: `Bearer ${tk}` } });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setIsSuperAdmin(profileData.user?.isSuperAdmin || false);
      }
      
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${tk}` } });
      const data = await res.json();
      if (res.ok) setUsers(data.users);
      else setError(data.error || "获取用户列表失败");
    } catch (err) {
      console.error("获取数据失败:", err);
      setError("获取数据失败");
    }
  }

  async function handleBatchCreate() {
    if (!token || !studentsInput.trim()) return;
    setBatchLoading(true);
    setBatchSuccess("");
    setError("");

    try {
      const lines = studentsInput.trim().split('\n');
      const students: StudentInput[] = [];

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length === 6) {
          const [studentId, name, className, college, major, gender] = parts;
          if (gender === "男" || gender === "女") {
            students.push({ studentId, name, className, college, major, gender });
          } else {
            throw new Error(`第${lines.indexOf(line) + 1}行性别格式错误：${gender}，请使用"男"或"女"`);
          }
        } else {
          throw new Error(`第${lines.indexOf(line) + 1}行格式错误：${line}，应为6个字段（学号,姓名,班级,学院,专业,性别）`);
        }
      }

      const res = await fetch("/api/admin/batch-students", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ students })
      });

      const data = await res.json();
      if (res.ok) {
        const createdCount = data.students?.length || data.created || students.length;
        setBatchSuccess(`成功创建 ${createdCount} 个学生账号`);
        setStudentsInput("");
        setShowBatchForm(false);
        fetchUsers(token);
      } else {
        setError(data.error || "批量创建失败");
      }
    } catch (err: any) {
      setError(err.message || "批量创建失败");
    } finally {
      setBatchLoading(false);
    }
  }

  function handleDeleteUser(userId: string, userName: string) {
    if (!token) return;

    showConfirm({
      title: '删除用户确认',
      message: `确定要删除用户"${userName}"吗？`,
      type: 'danger',
      confirmText: '删除用户',
      cancelText: '取消',
      details: [
        '用户的所有个人信息',
        '用户的测评记录',
        '用户的行为数据'
      ],
      onConfirm: async () => {
        try {
          setDeleteUserLoading(userId);
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });

          if (res.ok) {
            fetchUsers(token);
          } else {
            const data = await res.json();
            throw new Error(data.error || "删除用户失败");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "删除用户失败");
          throw err;
        } finally {
          setDeleteUserLoading(null);
        }
      }
    });
  }

  // 切换用户详情展开状态
  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  function handleResetPassword(user: AdminUser) {
    if (!token) return;

    // 普通管理员只能重置学生账户密码
    if (user.accountType !== 'student') {
      showAlert({
        title: '操作限制',
        message: '只能重置学生账户密码',
        type: 'warning'
      });
      return;
    }

    showConfirm({
      title: '重置密码确认',
      message: `确定要重置学生"${user.name}"的密码吗？`,
      type: 'warning',
      confirmText: '重置密码',
      cancelText: '取消',
      details: [
        `学生姓名: ${user.name}`,
        `学号: ${user.studentId || '无'}`,
        '密码将被重置为: kimochi@2025',
        '学生需要使用新密码重新登录'
      ],
      onConfirm: async () => {
        try {
          const response = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ targetUserId: user.id })
          });

          const result = await response.json();
          if (response.ok) {
            showAlert({
              title: '重置成功',
              message: `学生 "${user.name}" 的密码已重置为 kimochi@2025`,
              type: 'success'
            });
          } else {
            throw new Error(result.error || '重置密码失败');
          }
        } catch (error) {
          console.error('重置密码失败:', error);
          showAlert({
            title: '重置失败',
            message: error instanceof Error ? error.message : '网络错误，请稍后重试',
            type: 'error'
          });
        }
      }
    });
  }

  if (!token) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-white to-slate-50 overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="min-h-[calc(100dvh-var(--nav-offset))] flex flex-col">
        {/* 页面头部 - 固定 */}
        <div className="flex-shrink-0 p-6 border-b border-black/[0.08] bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">数据管理中心</h1>
              <p className="text-gray-600">用户数据统计与心理测评管理</p>
          
          {/* 高级管理员入口提示 */}
          {isSuperAdmin && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200/50">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-lg">🔧</span>
                </div>
                <div className="text-center">
                  <p className="text-purple-900 font-medium">您是高级管理员</p>
                  <p className="text-purple-700 text-sm">
                    访问 
                    <a href="/super-admin" className="mx-1 text-purple-600 hover:text-purple-800 font-medium underline">
                      高级管理控制台
                    </a>
                    获取更多功能
                  </p>
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>

        {/* 标签页导航 - 固定 */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-black/[0.08] bg-white/60 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-2 shadow-sm border border-black/[0.06]">
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex-none h-11 px-5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'users'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>👥</span>
                  <span>用户管理</span>
                </button>

                <button
                  onClick={() => setActiveTab('assessments')}
                  className={`flex-none h-11 px-5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'assessments'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>📊</span>
                  <span>测评数据</span>
                </button>

                <button
                  onClick={() => setActiveTab('export')}
                  className={`flex-none h-11 px-5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'export'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>📤</span>
                  <span>数据导出</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 主要内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto apple-scrollbar touch-scroll">
          <div className="max-w-7xl mx-auto p-6">

        {/* 用户管理标签页 */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">用户总览</h2>
              <button
                onClick={() => setShowBatchForm(!showBatchForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showBatchForm ? "取消添加" : "批量添加学生"}
              </button>
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            {batchSuccess && <p className="text-sm text-green-600 mb-3">{batchSuccess}</p>}

            {showBatchForm && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium mb-3">批量添加学生账号</h3>
                <p className="text-sm text-gray-600 mb-3">
                  每行一个学生，格式：学号,姓名,班级,学院,专业,性别（男/女）<br/>
                  默认密码为：kimochi@2025
                </p>
                <textarea
                  value={studentsInput}
                  onChange={(e) => setStudentsInput(e.target.value)}
                  placeholder="示例：&#10;2024001,张三,计算机2304班,计算机学院,计算机科学与技术,男&#10;2024002,李四,英教2304班,外国语学院,英语教育,女"
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none text-sm"
                />
                <div className="flex justify-end space-x-3 mt-3">
                  <button
                    onClick={() => setShowBatchForm(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleBatchCreate}
                    disabled={batchLoading || !studentsInput.trim()}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      batchLoading || !studentsInput.trim()
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {batchLoading ? "创建中..." : "批量创建"}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-black/[0.08] overflow-hidden bg-white/80 backdrop-blur-xl shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gradient-to-r from-gray-50/90 to-slate-50/90 border-b border-gray-200/50">
                    <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="w-24 px-3 py-4 text-left">ID</th>
                      <th className="w-32 px-3 py-4 text-left">用户信息</th>
                      <th className="w-20 px-3 py-4 text-left">类型</th>
                      <th className="w-40 px-3 py-4 text-left">账号信息</th>
                      <th className="w-36 px-3 py-4 text-left">教育信息</th>
                      <th className="w-24 px-3 py-4 text-left">个人</th>
                      <th className="w-36 px-3 py-4 text-left">位置状态</th>
                      <th className="w-28 px-3 py-4 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <React.Fragment key={u.id}>
                        <tr className="hover:bg-blue-50/50 transition-all duration-300 group">
                          {/* ID with expand button */}
                          <td className="px-3 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleUserExpansion(u.id)}
                                className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                                title={expandedUsers.has(u.id) ? "收起详情" : "展开详情"}
                              >
                                <svg 
                                  className={`w-3 h-3 text-gray-600 transition-transform ${expandedUsers.has(u.id) ? 'rotate-90' : ''}`} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md truncate">
                                {u.id.slice(0, 8)}
                              </div>
                            </div>
                          </td>
                        
                        {/* 用户信息 */}
                        <td className="px-3 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {u.name[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{u.name}</div>
                              {u.nickname && (
                                <div className="text-xs text-gray-500 truncate">{u.nickname}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* 类型 */}
                        <td className="px-3 py-4">
                          {(() => {
                            const typeDisplay = getAccountTypeDisplay(u);
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${typeDisplay.className} whitespace-nowrap`}>
                                {typeDisplay.label}
                              </span>
                            );
                          })()}
                        </td>
                        
                        {/* 账号信息 */}
                        <td className="px-3 py-4">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900 truncate">
                              {u.studentId || u.email || (u as any).phone || "-"}
                            </div>
                            {u.studentId && u.email && (
                              <div className="text-xs text-gray-500 truncate">{u.email}</div>
                            )}
                            {/* 来源徽标 */}
                            {(() => { const badge = getSourceBadge(u as any); return badge ? (
                              <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] mt-1 ${badge.className}`}>
                                {badge.label}
                              </div>
                            ) : null; })()}
                          </div>
                        </td>
                        
                        {/* 教育信息 */}
                        <td className="px-3 py-4">
                          <div className="space-y-1">
                            {u.className && (
                              <div className="text-sm text-gray-900 truncate">{u.className}</div>
                            )}
                            {u.college && (
                              <div className="text-xs text-gray-500 truncate">{u.college}</div>
                            )}
                            {u.major && (
                              <div className="text-xs text-gray-400 truncate">{u.major}</div>
                            )}
                            {!u.className && !u.college && !u.major && (
                              <div className="text-sm text-gray-400">-</div>
                            )}
                          </div>
                        </td>
                        
                        {/* 个人信息 */}
                        <td className="px-3 py-4">
                          <div className="space-y-1">
                            {u.gender && (
                              <div className="text-sm text-gray-900">{u.gender}</div>
                            )}
                            {u.zodiac && (
                              <div className="text-xs text-gray-500">{u.zodiac}</div>
                            )}
                            {!u.gender && !u.zodiac && (
                              <div className="text-sm text-gray-400">-</div>
                            )}
                          </div>
                        </td>
                        
                        {/* 位置状态 */}
                        <td className="px-3 py-4">
                          <div className="space-y-1">
                            {u.lastLocationName && (
                              <div className="text-sm text-gray-900 truncate flex items-center">
                                <svg className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate">{u.lastLocationName}</span>
                              </div>
                            )}
                            {u.lastWeatherSummary && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <svg className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                                <span>{u.lastWeatherSummary}</span>
                                {u.lastWeatherTempC != null && (
                                  <span className="ml-1 font-medium">{u.lastWeatherTempC}℃</span>
                                )}
                              </div>
                            )}
                            {!u.lastLocationName && !u.lastWeatherSummary && (
                              <div className="text-sm text-gray-400">-</div>
                            )}
                          </div>
                        </td>
                        
                        {/* 操作 */}
                        <td className="px-3 py-4">
                          <div className="flex flex-col space-y-1">
                            {!u.isAdmin && u.accountType === 'student' && (
                              <button
                                onClick={() => handleResetPassword(u)}
                                className="px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors whitespace-nowrap"
                              >
                                重置密码
                              </button>
                            )}
                            {!u.isAdmin && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                disabled={deleteUserLoading === u.id}
                                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                                  deleteUserLoading === u.id
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                }`}
                              >
                                {deleteUserLoading === u.id ? "删除中..." : "删除"}
                              </button>
                            )}
                            {u.isAdmin && (
                              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-md text-center">
                                管理员
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* 展开的详情行 */}
                      {expandedUsers.has(u.id) && (
                        <tr className="bg-gradient-to-r from-blue-50/30 to-indigo-50/30">
                          <td colSpan={8} className="px-6 py-4 border-t border-blue-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              
                              {/* 基本信息卡片 */}
                              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200/50">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  基本信息
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">完整ID:</span>
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{u.id}</span>
                                  </div>
                                  {u.nickname && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">昵称:</span>
                                      <span className="text-gray-900">{u.nickname}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">账户类型:</span>
                                    <span className="text-gray-900">{getAccountTypeLabel(u.accountType)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">创建时间:</span>
                                    <span className="text-gray-900">{new Date(u.createdAt).toLocaleDateString('zh-CN')}</span>
                                  </div>
                                  {u.createdByType && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">创建方式:</span>
                                      <span className="text-gray-900">
                                        {u.createdByType === 'super_admin' ? '超级管理员创建' : 
                                         u.createdByType === 'admin' ? '管理员创建' : '自助注册'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* 位置和天气信息卡片 */}
                              {(u.lastLocationName || u.lastWeatherSummary || u.lastDailyMessage) && (
                                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-green-200/50">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    位置状态
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    {u.lastLocationName && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">位置:</span>
                                        <span className="text-gray-900">{u.lastLocationName}</span>
                                      </div>
                                    )}
                                    {u.lastWeatherSummary && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">天气:</span>
                                        <span className="text-gray-900">
                                          {u.lastWeatherSummary}
                                          {u.lastWeatherTempC != null && ` ${u.lastWeatherTempC}℃`}
                                        </span>
                                      </div>
                                    )}
                                    {u.lastWeatherUpdatedAt && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">更新时间:</span>
                                        <span className="text-gray-900 text-xs">
                                          {new Date(u.lastWeatherUpdatedAt).toLocaleString('zh-CN')}
                                        </span>
                                      </div>
                                    )}
                                    {u.lastDailyMessage && (
                                      <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                                        <span className="text-xs text-yellow-700 font-medium">每日心语:</span>
                                        <p className="text-xs text-yellow-800 mt-1">{u.lastDailyMessage}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* 个人资料状态卡片 */}
                              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-purple-200/50">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  状态信息
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">资料完善:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs ${u.hasUpdatedProfile ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {u.hasUpdatedProfile ? '已完善' : '未完善'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">管理员:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs ${u.isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                      {u.isAdmin ? '是' : '否'}
                                    </span>
                                  </div>
                                  {u.accountType === 'student' && (
                                    <>
                                      {u.className && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">班级:</span>
                                          <span className="text-gray-900">{u.className}</span>
                                        </div>
                                      )}
                                      {u.college && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">学院:</span>
                                          <span className="text-gray-900">{u.college}</span>
                                        </div>
                                      )}
                                      {u.major && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">专业:</span>
                                          <span className="text-gray-900">{u.major}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 测评数据标签页 */}
        {activeTab === 'assessments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">心理测评数据</h2>
              <div className="text-sm text-gray-500">
                共 {assessments.length} 条测评记录
              </div>
            </div>

            {assessmentLoading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">加载测评数据中...</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
                {/* 批量操作工具栏 */}
                <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-3 flex-nowrap overflow-x-auto no-scrollbar">
                  <div className="flex items-center space-x-4 flex-none">
                    <span className="text-sm text-gray-600">
                      已选择 {selectedAssessments.length} 条记录
                    </span>
                    {selectedAssessments.length > 0 && (
                      <button
                        onClick={deleteSelectedAssessments}
                        disabled={deleteAllLoading}
                        className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors duration-300 flex items-center space-x-2"
                      >
                        {deleteAllLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                        <span>删除选中</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3 flex-none">
                    <button
                      onClick={deleteAllAssessments}
                      disabled={deleteAllLoading}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors duration-300 flex items-center space-x-2"
                    >
                      {deleteAllLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                      <span>清空所有</span>
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 border-b border-gray-200">
                      <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 w-12">
                          <input
                            type="checkbox"
                            checked={selectedAssessments.length === assessments.length && assessments.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left">用户信息</th>
                        <th className="px-4 py-3 text-left">测评类型</th>
                        <th className="px-4 py-3 text-left">完成时间</th>
                        <th className="px-4 py-3 text-left">风险等级</th>
                        <th className="px-4 py-3 text-left">测评结果</th>
                        <th className="px-4 py-3 text-left">心理标签</th>
                        <th className="px-4 py-3 text-left">需要关注</th>
                        <th className="px-4 py-3 text-left">状态</th>
                        <th className="px-4 py-3 text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {assessments.map((assessment) => (
                        <tr key={assessment.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedAssessments.includes(assessment.id)}
                              onChange={() => toggleAssessmentSelection(assessment.id)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{assessment.user.name}</div>
                              <div className="text-gray-500">
                                {assessment.user.studentId || assessment.user.email}
                              </div>
                              {assessment.user.className && (
                                <div className="text-xs text-gray-400">{assessment.user.className}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              assessment.type === 'SCL90' 
                                ? 'bg-rose-100 text-rose-700' 
                                : assessment.type === 'MBTI'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {assessment.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(assessment.completedAt).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              assessment.riskLevel === 'high' 
                                ? 'bg-red-100 text-red-700'
                                : assessment.riskLevel === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {assessment.riskLevel === 'high' ? '高风险' : 
                               assessment.riskLevel === 'medium' ? '中风险' : '低风险'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {assessment.type === 'MBTI' && assessment.personalityType ? (
                              <span className="text-blue-600 font-medium">{assessment.personalityType}</span>
                            ) : assessment.type === 'SCL90' && assessment.overallScore ? (
                              assessment.overallScore.toFixed(2)
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {assessment.psychologicalTags?.slice(0, 2).map((tag: string, index: number) => (
                                <span key={index} className="inline-flex px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-md">
                                  {tag}
                                </span>
                              ))}
                              {assessment.psychologicalTags?.length > 2 && (
                                <span className="text-xs text-gray-400">+{assessment.psychologicalTags.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {assessment.needsAttention ? (
                              <span className="inline-flex items-center text-xs text-red-600">
                                需要关注
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">正常</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {assessment.deletedByUser ? (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                用户已删除
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                正常
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-3">
                              <button 
                                onClick={() => fetchAssessmentDetail(assessment.id)}
                                disabled={detailLoading}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {detailLoading ? '加载中...' : '查看详情'}
                              </button>
                              <button
                                onClick={() => deleteSingleAssessment(assessment.id, assessment.type)}
                                disabled={deletingSingle === assessment.id}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                                title="删除记录"
                              >
                                {deletingSingle === assessment.id ? (
                                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 数据导出标签页 */}
        {activeTab === 'export' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">数据导出中心</h2>
              <p className="text-gray-600">导出用户数据为离线HTML报告，支持筛选和查询</p>
            </div>

            {/* 导出通知 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600 flex items-center">
                  <span className="text-red-500 mr-2">❌</span>
                  {error}
                </p>
              </div>
            )}
            {exportSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-600 flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  {exportSuccess}
                </p>
              </div>
            )}

            {/* 导出配置 */}
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* 数据类型选择 */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="text-blue-500 mr-2">📊</span>
                  数据类型选择
                </h3>
                
                <div className="space-y-4">
                  {[
                    { key: 'includePersonalInfo', label: '个人信息完善状态', desc: '用户基本信息、联系方式、学籍信息等' },
                    { key: 'includeAssessments', label: '心理测评数据', desc: 'SCL90、MBTI测评结果和分析报告' },
                    { key: 'includeMoodData', label: '用户心情记录', desc: '最近心情状态和心语记录' },
                    { key: 'includeLocationData', label: '位置和天气数据', desc: '最后登录位置和天气信息' },
                    { key: 'includeFriendData', label: '社交关系数据', desc: '好友数量和社交网络分析' },
                    { key: 'includePostData', label: '留言墙活动', desc: '发帖数量、精选次数和互动统计' },
                    { key: 'includeViolationData', label: '违规记录', desc: '违规次数和处理记录' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportFilters[item.key as keyof typeof exportFilters] as boolean}
                        onChange={(e) => setExportFilters({
                          ...exportFilters,
                          [item.key]: e.target.checked
                        })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.label}</div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 筛选条件 */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="text-green-500 mr-2">🔍</span>
                  筛选条件
                </h3>
                
                <div className="space-y-4">
                  
                  {/* 年级筛选 */}
                  <AppleSelect
                    label="年级筛选"
                    value={exportFilters.gradeFilter}
                    onChange={(value) => handleFilterChange('grade', value)}
                    options={[
                      { value: 'all', label: '全部年级' },
                      ...(realDataOptions.grades || []).map(grade => ({
                        value: grade,
                        label: grade
                      }))
                    ]}
                    placeholder="选择年级"
                  />

                  {/* 学院筛选 */}
                  <AppleSelect
                    label="学院筛选"
                    value={exportFilters.collegeFilter}
                    onChange={(value) => handleFilterChange('college', value)}
                    options={[
                      { value: 'all', label: '全部学院' },
                      ...(realDataOptions.colleges || []).map(college => ({
                        value: college,
                        label: college
                      }))
                    ]}
                    placeholder="选择学院"
                  />

                  {/* 专业筛选 */}
                  <AppleSelect
                    label="专业筛选"
                    value={exportFilters.majorFilter}
                    onChange={(value) => handleFilterChange('major', value)}
                    options={[
                      { value: 'all', label: '全部专业' },
                      ...(realDataOptions.majors || []).map(major => ({
                        value: major,
                        label: major
                      }))
                    ]}
                    placeholder="选择专业"
                  />

                  {/* 班级筛选 */}
                  <AppleSelect
                    label="班级筛选"
                    value={exportFilters.classFilter}
                    onChange={(value) => handleFilterChange('class', value)}
                    options={[
                      { value: 'all', label: '全部班级' },
                      ...(realDataOptions.classes || []).map(className => ({
                        value: className,
                        label: className
                      }))
                    ]}
                    placeholder="选择班级"
                  />

                  {/* 用户筛选 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">特定用户</label>
                    <input
                      type="text"
                      value={exportFilters.userFilter}
                      onChange={(e) => setExportFilters({
                        ...exportFilters,
                        userFilter: e.target.value
                      })}
                      placeholder="输入姓名或学号"
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md placeholder-gray-500"
                    />
                  </div>

                  {/* 时间范围 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
                      <input
                        type="date"
                        value={exportFilters.dateRange.start}
                        onChange={(e) => setExportFilters({
                          ...exportFilters,
                          dateRange: { ...exportFilters.dateRange, start: e.target.value }
                        })}
                        className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
                      <input
                        type="date"
                        value={exportFilters.dateRange.end}
                        onChange={(e) => setExportFilters({
                          ...exportFilters,
                          dateRange: { ...exportFilters.dateRange, end: e.target.value }
                        })}
                        className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 导出按钮 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200/50">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">生成数据报告</h3>
                <p className="text-gray-600 mb-6">点击下方按钮开始导出，将生成包含筛选数据的离线HTML报告</p>
                
                {/* 进度条 */}
                {exportLoading && (
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${exportProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">正在导出数据... {Math.round(exportProgress)}%</p>
                  </div>
                )}
                
                <button
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className={`px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center space-x-3 mx-auto ${
                    exportLoading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {exportLoading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      <span>导出中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>开始导出</span>
                    </>
                  )}
                </button>
                
                <div className="mt-4 text-sm text-gray-500">
                  <p>📄 导出格式：离线HTML报告</p>
                  <p>🔍 支持离线查看、搜索和筛选</p>
                  <p>📊 包含数据可视化图表</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 测评详情模态框 */}
        {showDetailModal && selectedAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeDetailModal}
            ></div>
            
            {/* 模态框内容 */}
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-black/[0.08] bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              
              {/* 头部 */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">测评详情</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedAssessment.user.name} · {selectedAssessment.type} · 
                    {new Date(selectedAssessment.completedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 内容区域 */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                
                {/* 基本信息 */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
                    {selectedAssessment.type === 'MBTI' ? (
                      <>
                        <h3 className="text-sm font-medium text-blue-900 mb-2">人格类型</h3>
                        <p className="text-2xl font-bold text-blue-700">
                          {selectedAssessment.personalityType || '-'}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">MBTI分析结果</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-medium text-blue-900 mb-2">综合评分</h3>
                        <p className="text-2xl font-bold text-blue-700">
                          {selectedAssessment.overallScore ? selectedAssessment.overallScore.toFixed(2) : '-'}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">满分100分</p>
                      </>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                    <h3 className="text-sm font-medium text-green-900 mb-2">风险等级</h3>
                    <p className={`text-lg font-semibold ${
                      selectedAssessment.riskLevel === 'high' ? 'text-red-600' : 
                      selectedAssessment.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {selectedAssessment.riskLevel === 'high' ? '高风险' : 
                       selectedAssessment.riskLevel === 'medium' ? '中风险' : '低风险'}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200">
                    <h3 className="text-sm font-medium text-purple-900 mb-2">答题质量</h3>
                    <p className={`text-lg font-semibold ${
                      selectedAssessment.analysisResult?.isSerious ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedAssessment.analysisResult?.isSerious ? '认真作答' : '答题异常'}
                    </p>
                  </div>
                </div>

                {/* 心理标签 */}
                {selectedAssessment.analysisResult?.psychologicalTags && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="text-blue-500 mr-2">🏷️</span>
                      心理特征标签
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedAssessment.analysisResult.psychologicalTags.map((tag: string, index: number) => (
                        <span 
                          key={index}
                          className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl border border-blue-200 text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 各症状因子得分 */}
                {selectedAssessment.analysisResult?.factorScores && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="text-purple-500 mr-2">📈</span>
                      各症状因子得分
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(selectedAssessment.analysisResult.factorScores).map(([factor, score]) => {
                        const typedScore = score as number;
                        const factorNames: Record<string, string> = {
                          somatization: '躯体化',
                          obsessive_compulsive: '强迫症状',
                          interpersonal_sensitivity: '人际关系敏感',
                          depression: '抑郁',
                          anxiety: '焦虑',
                          hostility: '敌对性',
                          phobic_anxiety: '恐怖',
                          paranoid_ideation: '偏执',
                          psychoticism: '精神病性'
                        };
                        return (
                          <div key={factor} className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-black/[0.06]">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                {factorNames[factor] || factor}
                              </span>
                              <span className={`text-lg font-bold ${typedScore >= 3 ? 'text-red-600' : typedScore >= 2 ? 'text-amber-600' : 'text-green-600'}`}>
                                {typedScore.toFixed(2)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${typedScore >= 3 ? 'bg-red-500' : typedScore >= 2 ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(typedScore / 5 * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      评分说明：1.0-1.9 正常，2.0-2.9 轻度，3.0-3.9 中度，4.0-5.0 重度
                    </div>
                  </div>
                )}

                

                

                {/* AI分析与建议 */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  
                  {/* 症状特征 */}
                  {selectedAssessment.analysisResult?.symptomProfile && (
                    <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)]">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="text-green-500 mr-2">🔍</span>
                        症状特征分析
                      </h3>
                      <p className="text-gray-700 leading-relaxed">{selectedAssessment.analysisResult.symptomProfile}</p>
                    </div>
                  )}

                  {/* 专业建议 */}
                  {selectedAssessment.analysisResult?.recommendations && (
                    <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)]">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="text-amber-500 mr-2">💡</span>
                        专业建议
                      </h3>
                      <p className="text-gray-700 leading-relaxed">{selectedAssessment.analysisResult.recommendations}</p>
                    </div>
                  )}
                </div>

                {/* 总结 */}
                {selectedAssessment.analysisResult?.summary && (
                  <div className="rounded-2xl border border-black/[0.08] bg-gradient-to-r from-slate-50/80 to-gray-50/80 p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="text-slate-600 mr-2">📝</span>
                      AI 总体评估
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{selectedAssessment.analysisResult.summary}</p>
                  </div>
                )}
              </div>

              {/* 底部按钮 */}
              <div className="flex justify-end p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
                <button
                  onClick={closeDetailModal}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-gray-500 to-slate-500 text-white hover:from-gray-600 hover:to-slate-600 transition-all duration-300 hover:scale-[1.02] font-medium shadow-sm"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>

        {/* 确认对话框 */}
        <ConfirmDialog />
      </div>
    </div>
  );
}