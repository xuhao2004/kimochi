'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePageVisit } from '@/hooks/usePageVisit';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useSuccessToast } from '@/components/SuccessToast';
import { useErrorToast } from '@/components/ErrorToast';
import AppleButton from '@/components/AppleButton';
import AppleTextarea from '@/components/AppleTextarea';
import { SuperAdminAccessDenied } from '@/components/AccessDenied';
import AppleSelect from '@/components/AppleSelect';
import { useUnifiedNotification } from '@/contexts/UnifiedNotificationContext';
import { getFeatureLabel } from '@/lib/fieldMappings';
// 删除：超管页不再提供密保邮箱修改入口，移至个人中心

interface DashboardData {
  overview: {
    totalUsers: number;
    totalVisits: number;
    totalWeatherQueries: number;
    totalDailyMessages: number;
    onlineUsers: number;
    userGrowthRate: string;
  };
  userTypeDistribution: Array<{
    type: string;
    count: number;
    label: string;
  }>;
  recentActivity: Array<{
    type: string;
    count: number;
    label: string;
  }>;
  popularFeatures: Array<{
    feature: string;
    usage: number;
    label: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    nickname?: string;
    email: string;
    studentId?: string;
    accountType: string;
    createdByType?: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    createdAt: string;
    lastActiveAt: string;
    isOnline: boolean;
  }>;
}

interface User {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  studentId?: string;
  className?: string;
  accountType: string;
  createdByType?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  lastActiveAt: string;
  isOnline: boolean;
  gender?: string;
  zodiac?: string;
}

// 获取账户类型标签的辅助函数
function getAccountTypeLabel(user: User) {
  if (user.isSuperAdmin) return '超级管理员';
  if (user.accountType === 'admin' || user.accountType === 'teacher') return '老师';
  if (user.accountType === 'student') return '学生';
  if ((user as any).accountType === 'weapp') return '微信用户';
  return (user as any).createdByType === 'super_admin' ? '超管注册' : '注册用户';
}

function getSourceBadge(user: any) {
  const source = user.createdByType;
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

// 获取用户账号（邮箱或学号）的辅助函数
function getUserAccount(user: User | any) {
  // 学生或教师：优先显示学号/工号（teacherId 存储在 studentId 字段）
  if ((user.accountType === 'student' || user.accountType === 'teacher') && user.studentId) {
    return user.studentId;
  }
  // 自助注册：可能只有手机号
  if (user.accountType === 'self') {
    return user.email || user.phone || '-';
  }
  // 其他：邮箱优先，缺失则回退手机号
  return user.email || user.phone || '-';
}

export default function SuperAdminPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'accountChanges'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [majorFilter, setMajorFilter] = useState('all');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateSuperAdmin, setShowCreateSuperAdmin] = useState(false);
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportGroupBy, setExportGroupBy] = useState<'none' | 'college'>('none');
  const [exportColumns, setExportColumns] = useState<string[]>([
    'id','name','nickname','account','accountType','createdByType','studentId','email','personalEmail','phone','contactPhone','college','major','className','office','createdAt'
  ]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '', // 可填邮箱或手机号（自助注册时）
    password: '',
    accountType: 'self',
    studentId: '',
    className: '',
    teacherId: '',
    phone: '',
    office: '',
    college: '',
    major: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 系统重置相关状态
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetPassword, setResetPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  const router = useRouter();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const { showSuccess, SuccessToast } = useSuccessToast();
  const { showError, ErrorToast } = useErrorToast();
  const { refreshNotifications } = useUnifiedNotification();

  // 创建超级管理员表单
  const [superForm, setSuperForm] = useState({ account: '', password: '', showPw: false, name: '超级管理员' });

  async function handleCreateSuperAdmin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/create-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ account: superForm.account, password: superForm.password, name: superForm.name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建失败');
      showSuccess({ title: '创建成功', message: '新的超级管理员已创建' });
      setShowCreateSuperAdmin(false);
      setSuperForm({ account: '', password: '', showPw: false, name: '超级管理员' });
      fetchUsers();
    } catch (e) {
      showError({ title: '创建失败', message: e instanceof Error ? e.message : '创建失败' });
    }
  }

  // 账号/密保变更审批相关状态
  type AccountChangeRequest = {
    id: string;
    changeType: 'email' | 'phone';
    currentValue: string;
    newValue: string;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    createdAt: string;
    processedAt?: string;
    reviewReason?: string;
    user: { id: string; name: string; nickname?: string; accountType: string; createdByType?: string };
    reviewer?: { name: string; nickname?: string };
  };
  type AccountChangeStats = { total: number; pending: number; approved: number; rejected: number } | null;
  const [accountChangeRequests, setAccountChangeRequests] = useState<AccountChangeRequest[]>([]);
  const [accountChangeStats, setAccountChangeStats] = useState<AccountChangeStats>(null);
  const [accountChangeFilter, setAccountChangeFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<AccountChangeRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [clearingAccountChanges, setClearingAccountChanges] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  // 已移除：工作流文档、状态自检与密保邮箱修改入口（改在个人中心提供）

  // 系统重置处理函数
  const handleSystemReset = async () => {
    if (!resetPassword || !confirmationText) {
      showError({ title: '信息不完整', message: '请填写所有必需信息' });
      return;
    }

    if (confirmationText !== 'RESET SYSTEM') {
      showError({ title: '确认文本错误', message: '请输入正确的确认文本: RESET SYSTEM' });
      return;
    }

    setResetLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/system-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: resetPassword,
          confirmationText
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccess({ 
          title: '系统重置成功', 
          message: `所有数据已清空，超级管理员密码已重置为: ${data.adminInfo?.defaultPassword || 'kimochi@2025'}` 
        });
        
        // 清空本地存储并跳转到首页
        setTimeout(() => {
          localStorage.clear();
          window.location.href = '/';
        }, 3000);
      } else {
        throw new Error(data.error || '系统重置失败');
      }
    } catch (error) {
      showError({ 
        title: '重置失败', 
        message: error instanceof Error ? error.message : '系统重置失败，请重试' 
      });
    } finally {
      setResetLoading(false);
    }
  };



  const resetResetDialog = () => {
    setShowResetDialog(false);
    setResetStep(1);
    setResetPassword('');
    setConfirmationText('');
    setResetLoading(false);
  };
  
  usePageVisit('super-admin');

  useEffect(() => {
    checkSuperAdminAccess();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'accountChanges') {
      fetchAccountChangeRequests();
    }
  }, [activeTab, searchQuery, accountTypeFilter, collegeFilter, majorFilter, currentPage, accountChangeFilter]);

  const checkSuperAdminAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // 验证高级管理员权限
      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 403) {
          setAccessDenied(true);
          setLoading(false);
          return;
        } else if (response.status === 401) {
          router.push('/login');
          return;
        }
        return;
      }

      fetchDashboardData();
    } catch (error) {
      console.error('验证权限失败:', error);
      router.push('/login');
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('获取数据看板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        q: searchQuery,
        accountType: accountTypeFilter,
        page: currentPage.toString(),
        limit: '20',
        college: collegeFilter,
        major: majorFilter
      });

      const response = await fetch(`/api/admin/user-management?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountChangeRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/account-change/admin?status=${accountChangeFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('获取账号变更申请失败');
      const data = await response.json();
      setAccountChangeRequests(data.requests || []);
      setAccountChangeStats(data.statistics || null);
    } catch (e) {
      console.error('获取账号变更申请失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const getReqStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReqStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待审核';
      case 'approved':
        return '已通过';
      case 'rejected':
        return '已拒绝';
      case 'cancelled':
        return '已撤销';
      default:
        return '未知';
    }
  };

  const openReview = (request: AccountChangeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewReason('');
    setShowReviewDialog(true);
  };

  const submitReview = async () => {
    if (!selectedRequest) return;
    try {
      setReviewing(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/account-change/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: selectedRequest.id, action: reviewAction, reviewReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '审核失败');
      showSuccess({ title: '审核成功', message: data.message });
      setShowReviewDialog(false);
      setSelectedRequest(null);
      fetchAccountChangeRequests();
      try { refreshNotifications?.(true, { adminMessages: true }); } catch {}
    } catch (e) {
      showError({ title: '审核失败', message: e instanceof Error ? e.message : '审核失败' });
    } finally {
      setReviewing(false);
    }
  };

  // 删除单条账号变更申请
  const deleteAccountChangeRequest = async (requestId: string) => {
    try {
      setDeletingRequestId(requestId);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/account-change/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      showSuccess({ title: '删除成功', message: '已删除该申请' });
      fetchAccountChangeRequests();
      try { refreshNotifications?.(true, { adminMessages: true }); } catch {}
    } catch (e) {
      showError({ title: '删除失败', message: e instanceof Error ? e.message : '删除失败' });
    } finally {
      setDeletingRequestId(null);
    }
  };

  // 清空全部账号变更申请（仅超级管理员有效，服务端校验）
  const clearAllAccountChangeRequests = async () => {
    try {
      setClearingAccountChanges(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/account-change/admin?clearAll=true', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '清空失败');
      showSuccess({ title: '已清空', message: data.message || '所有申请已清空' });
      fetchAccountChangeRequests();
      try { refreshNotifications?.(true, { adminMessages: true }); } catch {}
    } catch (e) {
      showError({ title: '清空失败', message: e instanceof Error ? e.message : '清空失败' });
    } finally {
      setClearingAccountChanges(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess({
          title: '用户创建成功',
          message: `用户 "${newUser.name}" 已成功创建`,
          duration: 3000
        });
        setShowCreateUser(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          accountType: 'self',
          studentId: '',
          className: '',
          teacherId: '',
          phone: '',
          office: '',
          college: '',
          major: ''
        });
        fetchUsers();
        if (activeTab === 'dashboard') {
          fetchDashboardData(); // 更新统计数据
        }
      } else {
        showError({
          title: '创建用户失败',
          message: result.error || '请检查输入信息后重试',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      showError({
        title: '创建用户失败',
        message: '网络错误，请稍后重试',
        duration: 4000
      });
    }
  };

  const handleDeleteUser = async (user: User) => {
    showConfirm({
      title: '删除用户',
      message: `确定要删除用户 "${user.name}" 吗？`,
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消',
      details: [
        `姓名: ${user.name}`,
        `账号: ${getUserAccount(user)}`,
        `类型: ${user.accountType}`,
        '此操作无法撤销，将删除用户的所有数据'
      ],
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/user-management?userId=${user.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });

        const result = await response.json();
        if (response.ok) {
          showSuccess({
            title: '用户删除成功',
            message: result.message,
            duration: 3000
          });
          fetchUsers();
          if (activeTab === 'dashboard') {
            fetchDashboardData();
          }
        } else {
          throw new Error(result.error || '删除用户失败');
        }
      }
    });
  };

  const handleResetPassword = (user: User) => {
    // 检查是否可以重置该用户密码
    const canReset = user.isSuperAdmin ? false : true; // 不能重置其他超级管理员密码
    
    if (!canReset) {
      showError({
        title: '权限不足',
        message: '不能重置其他超级管理员的密码',
        duration: 3000
      });
      return;
    }

    showConfirm({
      title: '确认重置密码',
      message: `确定要重置用户 "${user.name}" 的密码吗？`,
      type: 'warning',
      confirmText: '重置',
      cancelText: '取消',
      details: [
        `姓名: ${user.name}`,
        `账号: ${getUserAccount(user)}`,
        `类型: ${getAccountTypeLabel(user)}`,
        '密码将被重置为: kimochi@2025',
        '用户需要使用新密码重新登录'
      ],
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

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
            showSuccess({
              title: '重置成功',
              message: `用户 "${user.name}" 的密码已重置为 kimochi@2025`,
              duration: 4000
            });
          } else {
            throw new Error(result.error || '重置密码失败');
          }
        } catch (error) {
          console.error('重置密码失败:', error);
          showError({
            title: '重置失败',
            message: error instanceof Error ? error.message : '网络错误，请稍后重试',
            duration: 4000
          });
        }
      }
    });
  };

  if (accessDenied) {
    return <SuperAdminAccessDenied />;
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">加载高级管理员面板...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-white to-blue-50/30 overflow-y-auto apple-scrollbar touch-scroll" style={{ paddingTop: 'var(--nav-offset)' }}>
      {/* 顶部导航 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-black/[0.06] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">高级管理员控制台</h1>
              <p className="text-gray-500 text-sm">系统监控与用户管理</p>
            </div>
          <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                普通管理员
              </button>
              <button
                onClick={() => setShowResetDialog(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center space-x-2 shadow-lg shadow-red-500/25"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>系统重置</span>
              </button>
            </div>
          </div>
          
          {/* 标签切换 */}
          <div className="flex space-x-1 mt-4 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              数据看板
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'users'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              用户管理
            </button>
            {/* 账号/密保变更审批入口（与前两者统一风格，点击跳转独立页面） */}
            <button
              onClick={() => setActiveTab('accountChanges')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'accountChanges' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              账号/密保变更审批
            </button>
          </div>
        </div>
      </div>

      {/* showWorkflowDialog 相关 UI 已移除 */}
      

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-8">
            {/* 概览卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">累计用户</p>
                    <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.totalUsers}</p>
                    <p className="text-green-600 text-xs mt-1">增长 {dashboardData.overview.userGrowthRate}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">在线用户</p>
                    <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.onlineUsers}</p>
                    <p className="text-blue-600 text-xs mt-1">实时统计</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">总访问次数</p>
                    <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.totalVisits}</p>
                    <p className="text-purple-600 text-xs mt-1">页面浏览</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">功能使用</p>
                    <p className="text-lg font-bold text-gray-900">
                      天气 {dashboardData.overview.totalWeatherQueries}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      心语 {dashboardData.overview.totalDailyMessages}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* 图表和详细数据 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 用户类型分布 */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">用户类型分布</h3>
                <div className="space-y-3">
                  {dashboardData.userTypeDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700">{item.label}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ 
                              width: `${(item.count / dashboardData.overview.totalUsers) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 热门功能 */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">热门功能</h3>
                <div className="space-y-3">
                  {dashboardData.popularFeatures.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700 flex-shrink-0 min-w-[100px]">{getFeatureLabel(item.feature)}</span>
                      <div className="flex items-center space-x-3 flex-1 ml-4">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(item.usage / Math.max(...dashboardData.popularFeatures.map(f => f.usage))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 min-w-[40px] text-right">{item.usage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 最近注册用户 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">最近注册用户</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">姓名</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">账号</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">类型</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">学院/专业</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">注册时间</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">状态</th>
                      </tr>
                    </thead>
                  <tbody>
                    {dashboardData.recentUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            {user.nickname && (
                              <p className="text-xs text-gray-500">{user.nickname}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{getUserAccount(user)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.accountType === 'admin' ? 'bg-red-100 text-red-700' :
                            user.accountType === 'teacher' ? 'bg-purple-100 text-purple-700' :
                            user.accountType === 'student' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {getAccountTypeLabel(user)}
                          </span>
                        </td>
                          <td className="py-3 px-4 text-gray-700">
                            {user.accountType === 'student' ? (
                              <span>{(user as any).college || '-'}{((user as any).college || (user as any).major) ? ' · ' : ''}{(user as any).major || '-'}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            user.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                              user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            {user.isOnline ? '在线' : '离线'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* 搜索和筛选 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="搜索用户（姓名、邮箱、学号）..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md placeholder-gray-400"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  <div className="min-w-[140px]">
                    <AppleSelect
                      value={accountTypeFilter}
                      onChange={setAccountTypeFilter}
                      placeholder="所有类型"
                      options={[
                        { value: 'all', label: '所有类型', icon: '👥' },
                        { value: 'self', label: '普通用户', icon: '👤' },
                        { value: 'student', label: '学生用户', icon: '🎓' },
                        { value: 'teacher', label: '教师用户', icon: '👨‍🏫' },
                        { value: 'admin', label: '管理员', icon: '👑' }
                      ]}
                    />
                  </div>
                  <div className="min-w-[160px]">
                    <AppleSelect
                      value={collegeFilter}
                      onChange={setCollegeFilter}
                      placeholder="全部学院"
                      options={[{ value: 'all', label: '全部学院' }].concat(
                        Array.from(new Set(users.map((u:any)=>u.college).filter(Boolean))).sort().map((c:any)=>({value:c,label:c}))
                      )}
                    />
                  </div>
                  <div className="min-w-[160px]">
                    <AppleSelect
                      value={majorFilter}
                      onChange={setMajorFilter}
                      placeholder="全部专业"
                      options={[{ value: 'all', label: '全部专业' }].concat(
                        Array.from(new Set(users.map((u:any)=>u.major).filter(Boolean))).sort().map((m:any)=>({value:m,label:m}))
                      )}
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 flex items-center space-x-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>创建用户</span>
                </button>
                {/* 仅超级管理员可见：创建超级管理员 */}
                {users.some(u => u.isSuperAdmin) && (
                  <button
                    onClick={() => setShowCreateSuperAdmin(true)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-600/25 flex items-center space-x-2 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4m4-8h4M4 12h4" />
                    </svg>
                    <span>创建超级管理员</span>
                  </button>
                )}
                <button
                  onClick={() => setShowExportDialog(true)}
                  className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center space-x-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-3-3m3 3l3-3M4 20h16" />
                  </svg>
                  <span>导出设置</span>
                </button>
              </div>
            </div>

            {/* 用户列表 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">用户信息</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">账号</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">类型</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">状态</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">注册时间</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
                              {user.nickname?.[0] || user.name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              {user.nickname && (
                                <p className="text-xs text-gray-500">{user.nickname}</p>
                              )}
                              {user.className && (
                                <p className="text-xs text-gray-500">{user.className}</p>
                              )}
                              {user.accountType === 'student' && (user as any).college && (
                                <p className="text-xs text-gray-500">{(user as any).college} · {(user as any).major || '未填专业'}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-gray-900">{getUserAccount(user)}</p>
                            {user.accountType === 'student' && user.email && (
                              <p className="text-xs text-gray-500">邮箱: {user.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col space-y-1">
                            <span className={`px-2 py-1 rounded-full text-xs w-fit ${
                              user.isSuperAdmin ? 'bg-red-100 text-red-700' :
                              user.accountType === 'teacher' ? 'bg-purple-100 text-purple-700' :
                              user.accountType === 'student' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {getAccountTypeLabel(user)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            user.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                              user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            {user.isOnline ? '在线' : '离线'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-700">
                          <div>
                            <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">
                              活跃: {new Date(user.lastActiveAt).toLocaleDateString()}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex space-x-2">
                            {!user.isSuperAdmin && (
                              <button
                                onClick={() => handleResetPassword(user)}
                                className="px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 hover:text-orange-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm font-medium border border-orange-200/50 shadow-sm hover:shadow-md"
                              >
                                重置密码
                              </button>
                            )}
                            {!user.isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm font-medium border border-red-200/50 shadow-sm hover:shadow-md"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-6 space-x-3">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:shadow-md transition-all duration-200 font-medium text-gray-700 shadow-sm"
                  >
                    上一页
                  </button>
                  <div className="px-4 py-2 bg-blue-50/80 border border-blue-200/50 rounded-xl text-blue-700 font-medium shadow-sm">
                    第 {currentPage} 页，共 {totalPages} 页
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:shadow-md transition-all duration-200 font-medium text-gray-700 shadow-sm"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'accountChanges' && (
          <div className="space-y-8">
            {/* 统计卡片 */}
            {accountChangeStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><span className="text-xl">📋</span></div>
                    <div>
                      <p className="text-sm text-gray-600">总申请数</p>
                      <p className="text-2xl font-bold text-gray-900">{accountChangeStats.total}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center"><span className="text-xl">⏳</span></div>
                    <div>
                      <p className="text-sm text-gray-600">待审核</p>
                      <p className="text-2xl font-bold text-yellow-600">{accountChangeStats.pending}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><span className="text-xl">✅</span></div>
                    <div>
                      <p className="text-sm text-gray-600">已通过</p>
                      <p className="text-2xl font-bold text-green-600">{accountChangeStats.approved}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><span className="text-xl">❌</span></div>
                    <div>
                      <p className="text-sm text-gray-600">已拒绝</p>
                      <p className="text-2xl font-bold text-red-600">{accountChangeStats.rejected}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 过滤器 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">筛选申请</h2>
                <div className="flex items-center space-x-4">
                  <AppleSelect
                    value={accountChangeFilter}
                    onChange={setAccountChangeFilter as any}
                    options={[
                      { value: 'all', label: '全部申请' },
                      { value: 'pending', label: '待审核' },
                      { value: 'approved', label: '已通过' },
                      { value: 'rejected', label: '已拒绝' },
                    ]}
                  />
                  <AppleButton onClick={fetchAccountChangeRequests} isLoading={loading} size="sm">刷新</AppleButton>
                  <AppleButton onClick={clearAllAccountChangeRequests} isLoading={clearingAccountChanges} size="sm" variant="destructive">清空全部</AppleButton>
                </div>
              </div>
            </div>

            {/* 列表 */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">申请列表</h2></div>
              {loading ? (
                <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" /><span className="ml-3 text-gray-600">加载中...</span></div>
              ) : accountChangeRequests.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {accountChangeRequests.map((request) => (
                    <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">{request.changeType === 'email' ? '📧' : '📱'}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900">{request.user.name} 申请修改{request.changeType === 'email' ? '邮箱' : '手机号'}</h3>
                              <p className="text-sm text-gray-600">{request.user.accountType} • {request.user.createdByType}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">当前值</p>
                              <p className="text-gray-900">{request.currentValue}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">新值</p>
                              <p className="text-gray-900">{request.newValue}</p>
                            </div>
                          </div>
                          {request.reason && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-1">申请理由</p>
                              <div className="w-full">
                                <p className="text-gray-900 bg-gray-50 p-4 rounded-xl border border-gray-200/60">{request.reason}</p>
                              </div>
                            </div>
                          )}
                          {request.reviewReason && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-1">审核备注</p>
                              <div className="w-full">
                                <p className="text-gray-900 bg-gray-50 p-4 rounded-xl border border-gray-200/60">{request.reviewReason}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                            <span>申请时间：{new Date(request.createdAt).toLocaleString('zh-CN')}</span>
                            {request.processedAt && (<span>处理时间：{new Date(request.processedAt).toLocaleString('zh-CN')}</span>)}
                            {request.reviewer && (<span>审核人：{request.reviewer.name}</span>)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 ${getReqStatusColor(request.status)} bg-white/70`}>{getReqStatusLabel(request.status)}</span>
                          {request.status === 'pending' && (
                            <>
                              <AppleButton size="sm" variant="primary" onClick={() => openReview(request, 'approve')}>通过</AppleButton>
                              <AppleButton size="sm" variant="destructive" onClick={() => openReview(request, 'reject')}>拒绝</AppleButton>
                            </>
                          )}
                          <AppleButton size="sm" variant="secondary" onClick={() => deleteAccountChangeRequest(request.id)} isLoading={deletingRequestId === request.id}>删除</AppleButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center"><span className="text-gray-400 text-2xl">📋</span></div><p className="text-gray-500">暂无申请记录</p></div>
              )}
            </div>

            {/* 审核对话框 */}
            {showReviewDialog && selectedRequest && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-200/50 w-full max-w-md mx-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200/50">
                    <h3 className="text-lg font-semibold text-gray-900">{reviewAction === 'approve' ? '通过申请' : '拒绝申请'}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedRequest.user.name} 的{selectedRequest.changeType === 'email' ? '邮箱' : '手机号'}变更申请</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">变更内容</p>
                      <div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm">{selectedRequest.currentValue} → {selectedRequest.newValue}</p></div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">审核备注 {reviewAction === 'reject' && <span className="text-red-500">*</span>}</label>
                      <AppleTextarea value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} placeholder={reviewAction === 'approve' ? '请输入审核备注（可选）' : '请说明拒绝理由'} rows={3} maxLength={500} />
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <AppleButton variant="secondary" onClick={() => setShowReviewDialog(false)} disabled={reviewing} className="flex-1">取消</AppleButton>
                      <AppleButton variant={reviewAction === 'approve' ? 'primary' : 'destructive'} onClick={submitReview} isLoading={reviewing} className="flex-1">确认{reviewAction === 'approve' ? '通过' : '拒绝'}</AppleButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 创建用户模态框 - Apple 风格设计 */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
            onClick={() => setShowCreateUser(false)}
          />
          
          {/* 模态框 */}
          <div className="relative w-full max-w-md max-h-[82dvh]">
            <div className="rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-black/[0.05] overflow-hidden flex flex-col max-h-[82dvh]">
              
              {/* 头部 */}
              <div className="px-8 pt-8 pb-4 text-center border-b border-black/[0.05] shrink-0">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 shadow-sm">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">添加新用户</h3>
                <p className="text-sm text-gray-500">创建一个新的系统账户</p>
              </div>

              {/* 表单 */}
              <form onSubmit={handleCreateUser} className="flex flex-col flex-1">
                <div className="px-8 py-6 space-y-6 overflow-y-auto flex-1">
                  <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">姓名</label>
                    <input
                      type="text"
                      required
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                      placeholder="请输入用户姓名"
                    />
                  </div>
                  
                  {/* 自助注册：邮箱或手机号；教师：此邮箱为个人信息，可选；学生无需 */}
                  {newUser.accountType === 'self' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">账号标识（邮箱或手机号）</label>
                      <input
                        type="text"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                        placeholder="请输入邮箱或手机号"
                      />
                      <p className="mt-1 text-xs text-gray-500">支持邮箱或 11 位大陆手机号</p>
                    </div>
                  ) : newUser.accountType === 'teacher' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">邮箱地址（教师可选）</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                        placeholder="请输入邮箱地址（可留空）"
                      />
                      <p className="mt-1 text-xs text-gray-500">此邮箱仅作为个人信息，非登录账号；教师可选填</p>
                    </div>
                  ) : null}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">登录密码</label>
                    <div className="relative">
                      <input
                        type={showCreatePw ? 'text' : 'password'}
                        required
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                        placeholder="请输入登录密码"
                      />
                      <button type="button" onClick={() => setShowCreatePw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">{showCreatePw ? '🙈' : '👁️'}</button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">账户类型</label>
                    <AppleSelect
                      value={newUser.accountType}
                      onChange={(value) => setNewUser({...newUser, accountType: value})}
                      placeholder="选择账户类型"
                      options={[
                        { value: 'self', label: '自助注册', icon: '👤' },
                        { value: 'teacher', label: '教师', icon: '👨‍🏫' },
                        { value: 'student', label: '学生', icon: '🎓' }
                      ]}
                    />
                  </div>
                  
                  {newUser.accountType === 'teacher' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">工号</label>
                        <input
                          type="text"
                          required
                          value={newUser.teacherId}
                          onChange={(e) => setNewUser({...newUser, teacherId: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                          placeholder="请输入教师工号"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">联系电话（可选）</label>
                          <input
                            type="tel"
                            value={newUser.phone}
                            onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                            placeholder="请输入联系电话"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">办公室（可选）</label>
                          <input
                            type="text"
                            value={newUser.office}
                            onChange={(e) => setNewUser({...newUser, office: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                            placeholder="请输入办公室"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {newUser.accountType === 'student' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">学号</label>
                        <input
                          type="text"
                          required
                          value={newUser.studentId}
                          onChange={(e) => setNewUser({...newUser, studentId: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                          placeholder="请输入学号"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">班级</label>
                        <input
                          type="text"
                          required
                          value={newUser.className}
                          onChange={(e) => setNewUser({...newUser, className: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                          placeholder="请输入班级"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">学院</label>
                          <input
                            type="text"
                            required
                            value={newUser.college}
                            onChange={(e) => setNewUser({...newUser, college: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                            placeholder="请输入学院"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">专业</label>
                          <input
                            type="text"
                            required
                            value={newUser.major}
                            onChange={(e) => setNewUser({...newUser, major: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                            placeholder="请输入专业"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  </div>
                </div>

                {/* 按钮区域 - 固定在底部 */}
                <div className="px-8 py-6 border-t border-black/[0.05] bg-gray-50/50 shrink-0">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateUser(false)}
                      className="flex-1 px-6 py-3 bg-gray-100/80 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 disabled:opacity-60"
                      disabled={newUser.accountType === 'student' && (!newUser.studentId || !newUser.className || !newUser.college || !newUser.major)}
                    >
                      创建用户
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 创建超级管理员模态框 */}
      {showCreateSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreateSuperAdmin(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-8 pt-8 pb-4 text-center border-b border-black/[0.05]">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 shadow-sm">
                <span className="text-purple-600 text-2xl">👑</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">创建超级管理员</h3>
              <p className="text-sm text-gray-500">仅限现有超级管理员操作</p>
            </div>
            <form onSubmit={handleCreateSuperAdmin} className="px-8 py-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">账号（邮箱或工号）</label>
                <input
                  value={superForm.account}
                  onChange={e=>setSuperForm({...superForm, account: e.target.value})}
                  required
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                  placeholder="请输入邮箱或工号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">姓名（可选）</label>
                <input
                  value={superForm.name}
                  onChange={e=>setSuperForm({...superForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                  placeholder="默认为 超级管理员"
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-900 mb-2">登录密码</label>
                <input
                  type={superForm.showPw ? 'text' : 'password'}
                  value={superForm.password}
                  onChange={e=>setSuperForm({...superForm, password: e.target.value})}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                  placeholder="至少 8 位"
                />
                <button type="button" onClick={()=>setSuperForm({...superForm, showPw: !superForm.showPw})} className="absolute right-3 top-[42px] text-gray-500">{superForm.showPw?'🙈':'👁️'}</button>
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={()=>setShowCreateSuperAdmin(false)} className="flex-1 px-6 py-3 bg-gray-100/80 text-gray-700 rounded-xl">取消</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 导出设置对话框 */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowExportDialog(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">导出用户数据</h3>
              <p className="text-xs text-gray-500 mt-1">选择导出列，支持按学院分组导出（ZIP）</p>
              <p className="text-xs text-gray-500 mt-1">提示：如遇下载后文件名乱码，请升级浏览器或使用新版 Edge/Chrome；ZIP 模式下学院名将自动转换为 ASCII 文件名。</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">导出列</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-700">
                  {[
                    ['id','用户ID'],
                    ['name','姓名'],
                    ['nickname','昵称'],
                    ['account','账号'],
                    ['accountType','账户类型'],
                    ['createdByType','注册方式'],
                    ['studentId','学号/工号'],
                    ['email','登录邮箱'],
                    ['personalEmail','个人邮箱'],
                    ['phone','手机号'],
                    ['contactPhone','联系电话'],
                    ['college','学院'],
                    ['major','专业'],
                    ['className','班级'],
                    ['office','办公室'],
                    ['createdAt','注册时间'],
                  ].map(([key,label]) => (
                    <label key={key} className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportColumns.includes(key)}
                        onChange={(e) => {
                          setExportColumns((prev) => {
                            if (e.target.checked) return Array.from(new Set([...prev, key]));
                            return prev.filter(k => k !== key);
                          });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">建议至少选择&ldquo;姓名、账号、账户类型、注册时间&rdquo;。</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">分组导出</h4>
                <div className="flex items-center space-x-4 text-sm">
                  <label className="inline-flex items-center space-x-2">
                    <input type="radio" name="groupBy" checked={exportGroupBy==='none'} onChange={()=>setExportGroupBy('none')} />
                    <span>不分组（单个 CSV）</span>
                  </label>
                  <label className="inline-flex items-center space-x-2">
                    <input type="radio" name="groupBy" checked={exportGroupBy==='college'} onChange={()=>setExportGroupBy('college')} />
                    <span>按学院分组（ZIP 多个 CSV）</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExportDialog(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={exporting || exportColumns.length === 0}
                  onClick={async () => {
                    setExporting(true);
                    try {
                      const token = localStorage.getItem('token');
                      const params = new URLSearchParams({
                        q: searchQuery,
                        accountType: accountTypeFilter,
                        college: collegeFilter,
                        major: majorFilter,
                        format: 'csv',
                        columns: exportColumns.join(','),
                      });
                      if (exportGroupBy === 'college') params.set('groupBy','college');
                      const res = await fetch(`/api/admin/user-management?${params.toString()}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (!res.ok) throw new Error('导出失败');
                      const contentType = res.headers.get('Content-Type') || '';
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      const isZip = contentType.includes('application/zip');
                      a.download = isZip
                        ? `用户导出_分学院_${new Date().toISOString().slice(0,10)}.zip`
                        : `用户清单_${new Date().toISOString().slice(0,10)}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                      setShowExportDialog(false);
                    } catch (e) {
                      console.error(e);
                      alert('导出失败，请重试');
                    } finally {
                      setExporting(false);
                    }
                  }}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-60"
                >
                  {exporting ? '导出中...' : '开始导出'}
                </button>
                <a
                  href="vscode://file/Users/douhao/Desktop/kimochi-dev/kimochi/docs/CONFIGURATION-GUIDE.md"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 text-sm text-blue-600 hover:underline"
                >
                  查看配置文档
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 系统重置对话框 */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden border border-red-200/50">
            {/* 头部 - 危险警告 */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">🚨 系统重置</h2>
                  <p className="text-red-100 text-sm">极度危险操作 - 不可撤销</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {resetStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      第一重确认：了解风险
                    </h3>
                    <div className="space-y-3 text-red-800">
                      <p className="font-medium">⚠️ 此操作将永久删除以下数据：</p>
                      <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                        <li>所有用户账户（包括您自己）</li>
                        <li>所有心理测评数据</li>
                        <li>所有聊天记录和消息</li>
                        <li>所有系统统计数据</li>
                        <li>所有用户行为记录</li>
                      </ul>
                      <p className="font-bold text-red-900 bg-red-100 p-3 rounded-xl mt-4">
                        💀 系统将恢复到全新状态，所有数据将无法恢复！
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={resetResetDialog}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => setResetStep(2)}
                      className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all"
                    >
                      我了解风险，继续
                    </button>
                  </div>
                </div>
              )}

              {resetStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      第二重确认：验证身份
                    </h3>
                    <div className="space-y-4">
                      <p className="text-orange-800 font-medium">请输入您的超级管理员密码以验证身份：</p>
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="输入超级管理员密码"
                        className="w-full px-4 py-3 border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setResetStep(1)}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                    >
                      上一步
                    </button>
                    <button
                      onClick={() => setResetStep(3)}
                      disabled={!resetPassword}
                      className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      验证密码
                    </button>
                  </div>
                </div>
              )}

              {resetStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      第三重确认：最终确认
                    </h3>
                    <div className="space-y-4">
                      <p className="text-red-800 font-medium">
                        请在下方输入框中输入 <code className="bg-red-200 px-2 py-1 rounded font-mono">RESET SYSTEM</code> 以确认执行系统重置：
                      </p>
                      <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder="输入 RESET SYSTEM"
                        className="w-full px-4 py-3 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-mono"
                      />
                      <div className="bg-red-100 border border-red-300 rounded-xl p-4">
                        <p className="text-red-900 font-bold text-center">
                          ⚠️ 点击&ldquo;执行重置&rdquo;后，系统将立即开始删除所有数据！
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setResetStep(2)}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                    >
                      上一步
                    </button>
                    <button
                      onClick={handleSystemReset}
                      disabled={resetLoading || confirmationText !== 'RESET SYSTEM'}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {resetLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>重置中...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>执行重置</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog />
      <SuccessToast />
      <ErrorToast />
    </div>
  );
}
