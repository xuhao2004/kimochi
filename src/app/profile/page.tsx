"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getZodiacIconPath } from "@/lib/zodiacAssets";
import { getMbtiIconPath } from "@/lib/mbtiAssets";
import { usePageVisit } from "@/hooks/usePageVisit";
import AvatarUpload from "@/app/components/AvatarUpload";
import PasswordResetDialog from "@/components/PasswordResetDialog";
import AppleSelect from "@/components/AppleSelect";
import { useSuccessToast } from "@/components/SuccessToast";
import { useErrorToast } from "@/components/ErrorToast";
import AccountChangeRequestDialog from "@/components/AccountChangeRequestDialog";
import SecurityEmailChangeDialog from "@/components/SecurityEmailChangeDialog";

type UserProfile = {
  id: string;
  email: string | null; // 登录账号邮箱
  personalEmail: string | null; // 个人联系邮箱
  securityEmail?: string | null; // 密保邮箱（账号）
  studentId: string | null;
  teacherId: string | null;
  name: string;
  nickname: string | null;
  zodiac: string | null;
  gender: string | null;
  birthDate: string | null;
  className: string | null;
  college: string | null;
  major: string | null;
  office: string | null;
  phone: string | null;
  contactPhone?: string | null;
  accountType: string;
  profileImage: string | null;
  hasUpdatedProfile: boolean;
  isSuperAdmin: boolean;
  genderModified: boolean;
  nicknameModified: boolean;
  createdByType: string | null;
  createdAt: string;
  lastLocationName: string | null;
  lastWeatherSummary: string | null;
  lastWeatherTempC: number | null;
  lastWeatherUpdatedAt: string | null;
  lastDailyMessage: string | null;
  lastDailyAt: string | null;
  // 微信绑定状态（网页/小程序）
  wechatOpenId?: string | null;
  wechatBoundAt?: string | null;
  weappOpenId?: string | null;
  weappBoundAt?: string | null;
  pendingNameChangeTo?: string | null;
  pendingNameChangeRequestId?: string | null;
};

type UserStats = {
  totalDailyQuotes: number;
  weatherUpdates: number;
  accountAge: number;
  lastActiveDate: string;
  favoriteWeather: string;
  mostActiveTime: string;
  totalAssessments: number;
  completedThisMonth: number;
};

export default function ProfilePage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [assessmentStats, setAssessmentStats] = useState<{totalAssessments: number, completedThisMonth: number}>({totalAssessments: 0, completedThisMonth: 0});
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  
  // 统一卡片基础样式，保证风格一致与等高
  const unifiedCardBaseClassName = "rounded-2xl bg-white/70 backdrop-blur-xl border border-black/[0.08] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03] h-full";
  const formLabelClassName = "flex items-center h-6 space-x-2 text-sm font-semibold text-gray-800";
  // 网页微信绑定为预研功能（默认关闭），需要时设置 NEXT_PUBLIC_WEB_WECHAT_BIND_ENABLED=1
  const enableWebWechat = false; // 暂时隐藏网页端微信绑定
  const disableVerification = false; // 允许密保邮箱修改与验证码流程
  
  // Toast hooks
  const { showSuccess, SuccessToast } = useSuccessToast();
  const { showError, ErrorToast } = useErrorToast();
  
  // 密码重置相关状态
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isFirstTimeChange, setIsFirstTimeChange] = useState(false);
  
  // 账号变更申请相关状态
  const [showAccountChangeDialog, setShowAccountChangeDialog] = useState(false);
  const [changeType, setChangeType] = useState<'email'>('email');
  const [accountChangeRequests, setAccountChangeRequests] = useState<any[]>([]);
  const [showSecEmailDialog, setShowSecEmailDialog] = useState(false);
  
  // 个人信息编辑状态
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    nickname: '',
    email: '',
    personalEmail: '',
    gender: '',
    birthDate: '',
    office: '',
    contactPhone: ''
  });
  
  // 隐私保护辅助函数
  const maskSensitiveInfo = (value: string | null, type: 'email' | 'phone'): string => {
    if (!value) return '未设置';
    
    if (type === 'email') {
      const [user, domain] = value.split('@');
      if (user.length <= 2) {
        return `${user}****@${domain}`;
      }
      return `${user.slice(0, 2)}****@${domain}`;
    } else if (type === 'phone') {
      if (value.length <= 7) {
        return `${value.slice(0, 3)}****`;
      }
      return `${value.slice(0, 3)}****${value.slice(-4)}`;
    }
    
    return value;
  };
  
  // 检查字段是否可编辑
  const isFieldEditable = (field: 'email' | 'phone'): boolean => {
    if (!profile) return false;
    if (profile.isSuperAdmin) return true;
    
    if (field === 'email') {
      return profile.createdByType !== 'email_register';
    } else if (field === 'phone') {
      return false;
    }
    
    return false;
  };
  
  // 记录页面访问
  usePageVisit("profile");

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("token");
    setToken(t);
    if (t) {
      fetchProfile(t);
      fetchRecentAssessments(t);
      fetchUserStats(t);
      fetchAccountChangeRequests(t);
    }
    
    // 检查URL参数，如果包含openPasswordDialog=true则自动打开密码修改对话框
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openPasswordDialog') === 'true') {
      setShowPasswordDialog(true);
      // 首次修改仅在使用默认密码时提示
      setIsFirstTimeChange(false);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    if (urlParams.get('openEditDialog') === 'true') {
      setShowEditDialog(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    if (urlParams.get('openSecurityEmailDialog') === 'true') {
      setShowSecEmailDialog(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  async function fetchProfile(authToken: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.user);
        // 设置编辑表单的初始值
        setEditForm({
          name: data.user.name || '',
          nickname: data.user.nickname || '',
          email: data.user.email || '',
          personalEmail: data.user.personalEmail || '',
          gender: data.user.gender || '',
          birthDate: data.user.birthDate ? data.user.birthDate.split('T')[0] : '',
          office: data.user.office || '',
          contactPhone: data.user.contactPhone || ''
        });
        // 在个人中心加载时检查是否为默认密码，用于精准显示"安全提醒"
        checkDefaultPassword(authToken);
      }
    } catch (error) {
      console.log("获取个人信息失败:", error);
    } finally {
      setLoading(false);
    }
  }

  // 微信网页绑定：拉起授权并绑定/解绑
  const bindWechatOnWeb = async () => {
    if (!enableWebWechat) {
      showError({ title: '预研中', message: '网页微信授权暂未开放，请通过小程序完成绑定' });
      return;
    }
    if (process.env.NEXT_PUBLIC_DISABLE_VERIFICATION_CODE === '1') {
      showError({ title: '已停用', message: '验证码相关功能停用，网页微信绑定不可用' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      // 由后端提供授权地址，避免在前端暴露应用配置
      const resp = await fetch('/api/auth/wechat/login');
      const data = await resp.json();
      if (resp.ok && data.authorizeUrl) {
        window.location.href = data.authorizeUrl as string;
      } else {
        showError({ title: '未开通', message: data.error || '微信网页授权未开通' });
      }
    } catch {}
  };

  const unbindWechatOnWeb = async () => {
    if (!enableWebWechat) {
      showError({ title: '预研中', message: '网页微信授权暂未开放，请通过小程序完成解绑' });
      return;
    }
    if (process.env.NEXT_PUBLIC_DISABLE_VERIFICATION_CODE === '1') {
      showError({ title: '已停用', message: '验证码相关功能停用，网页微信绑定不可用' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/auth/wechat/unbind', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '解绑失败');
      showSuccess({ title: '解绑成功', message: '已解绑微信（网页）' });
      fetchProfile(token);
    } catch (e) {
      showError({ title: '解绑失败', message: e instanceof Error ? e.message : '解绑失败' });
    }
  };

  // 小程序绑定：展示指引 + 刷新绑定状态
  const showWeappBindGuide = () => {
    // 简洁弹窗，指引用户在小程序内完成绑定
    alert('小程序绑定指引:\n1) 打开微信 → 搜索并进入小程序\n2) 进入个人资料页 → 点击"绑定微信（小程序）"\n3) 成功后返回此页面点击"刷新绑定状态"');
  };

  const refreshWeappBindStatus = async () => {
    const tk = localStorage.getItem('token');
    if (tk) await fetchProfile(tk);
  };

  const unbindWeapp = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/auth/weapp/unbind', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '解绑失败');
      showSuccess({ title: '解绑成功', message: '已解绑微信（小程序）' });
      fetchProfile(token);
    } catch (e) {
      showError({ title: '解绑失败', message: e instanceof Error ? e.message : '解绑失败' });
    }
  };

  // 检查是否使用默认密码
  async function checkDefaultPassword(authToken: string) {
    try {
      const response = await fetch('/api/auth/check-default-password', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (response.ok && data.isDefaultPassword) {
        setIsNewUser(data.isNewUser || false);
        // 只有默认密码用户才显示安全提醒
        setIsFirstTimeChange(true);
      }
    } catch (error) {
      console.log("检查默认密码失败:", error);
    }
  }

  // 处理密码修改
  async function handlePasswordChange(oldPassword: string, newPassword: string, emailCode?: string) {
    if (!token) throw new Error('未登录');

    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword, newPassword, emailCode })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '修改密码失败');
    }

    // 密码修改成功，显示成功提示
    showSuccess({ title: '密码修改成功！', message: '您的密码已成功更新，请重新登录' });
    try { if (data.forceLogout) { localStorage.removeItem('token'); window.location.href = '/relogin?reason=password_changed'; return; } } catch {}
    
      // 重新检查默认密码状态，仅在默认密码用户场景使用
      setTimeout(() => {
        checkDefaultPassword(token);
      }, 1000);
    
    return data;
  }

  // 处理个人信息更新
  async function handleProfileUpdate() {
    if (!token || !profile) return;

    try {
      setLoading(true);
      const payload: any = {
        name: editForm.name,
        nickname: editForm.nickname,
        email: editForm.email,
        personalEmail: editForm.personalEmail,
        gender: editForm.gender,
        birthDate: editForm.birthDate,
        office: editForm.office,
        contactPhone: editForm.contactPhone
      };
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = data?.error || '更新失败';
        if (msg.includes('姓名需通过申请变更')) {
          const reason = window.prompt('姓名一年仅能修改一次，需要提交申请并由超级管理员审核。请输入申请理由：');
          if (reason && reason.trim()) {
            const resp2 = await fetch('/api/profile/name-change', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ newName: editForm.name, reason: reason.trim() })
            });
            const data2 = await resp2.json();
            if (!resp2.ok) throw new Error(data2.error || '姓名变更申请提交失败');
            showSuccess({ title: '申请已提交', message: '姓名更改申请已发送，等待审核' });
            fetchProfile(token);
            setShowEditDialog(false);
            return;
          }
        }
        throw new Error(msg);
      }

      // 更新profile数据
      setProfile(data.user);
      setShowEditDialog(false);
      
      // 显示成功提示
      showSuccess({ title: '个人信息更新成功！', message: '您的个人资料已成功保存' });
      
      // 重新获取最新的profile数据以确保显示正确
      if (token) {
        fetchProfile(token);
      }
    } catch (error) {
      showError({ title: '更新失败', message: error instanceof Error ? error.message : '个人信息更新失败，请重试' });
    } finally {
      setLoading(false);
    }
  }

  // 取消编辑
  function handleCancelEdit() {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        nickname: profile.nickname || '',
        email: profile.email || '',
        personalEmail: profile.personalEmail || '',
        gender: profile.gender || '',
        birthDate: profile.birthDate ? profile.birthDate.split('T')[0] : '',
        office: profile.office || '',
        contactPhone: (profile as any).contactPhone || ''
      });
    }
    setShowEditDialog(false);
  }

  async function fetchRecentAssessments(authToken: string) {
    try {
      const res = await fetch("/api/profile/recent-assessments", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRecentAssessments(data.recentAssessments);
        setAssessmentStats(data.stats);
      }
    } catch (error) {
      console.log("获取最近测评失败:", error);
    }
  }

  async function fetchUserStats(authToken: string) {
    try {
      const res = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUserStats(data.stats);
      }
    } catch (error) {
      console.log("获取使用统计失败:", error);
    }
  }

  // 获取账号变更申请记录
  async function fetchAccountChangeRequests(authToken: string) {
    try {
      const res = await fetch("/api/account-change/request", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAccountChangeRequests(data.requests || []);
      }
    } catch (error) {
      console.log("获取账号变更申请失败:", error);
    }
  }

  // 处理账号变更申请
  const handleAccountChangeRequest = (type: 'email' | 'phone') => {
    if (!profile) return;
    
    // 检查是否有权限申请修改
    if (profile.isSuperAdmin) {
      showError({ title: '无需申请', message: '超级管理员可以直接修改账号信息' });
      return;
    }
    
    const currentValue = type === 'email' ? profile.email : profile.phone;
    if (!currentValue) {
      showError({ title: '无法申请', message: `您当前没有设置${type === 'email' ? '邮箱' : '手机号'}` });
      return;
    }
    
    if (type === 'email' && profile.createdByType !== 'email_register') {
      showError({ title: '无法申请', message: '您不是邮箱注册用户，无法申请修改邮箱' });
      return;
    }
    
    if (type === 'phone' && profile.createdByType !== 'phone_register') {
      showError({ title: '无法申请', message: '您不是手机号注册用户，无法申请修改手机号' });
      return;
    }

    // 检查是否有待处理的申请（未撤销/未处理）
    const pendingRequest = accountChangeRequests.find(req => req.status === 'pending');
    if (pendingRequest) {
      showError({ title: '请等待审核', message: '您有一个申请正在审核中，请等待审核完成或撤销后再申请' });
      return;
    }

    setChangeType('email');
    setShowAccountChangeDialog(true);
  };

  // 申请成功回调
  const handleAccountChangeSuccess = () => {
    showSuccess({ title: '申请已提交', message: '您的账号变更申请已提交，请等待管理员审核' });
    if (token) {
      fetchAccountChangeRequests(token);
    }
  };

  // 获取申请状态显示
  const getRequestStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: '待审核', color: 'text-yellow-600 bg-yellow-100' };
      case 'approved':
        return { label: '已通过', color: 'text-green-600 bg-green-100' };
      case 'rejected':
        return { label: '已拒绝', color: 'text-red-600 bg-red-100' };
      case 'cancelled':
        return { label: '已撤销', color: 'text-gray-600 bg-gray-100' };
      default:
        return { label: '未知', color: 'text-gray-600 bg-gray-100' };
    }
  };

  const handleAvatarChange = (newAvatar: string | null) => {
    if (profile) {
      setProfile({ ...profile, profileImage: newAvatar });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SCL90': return 'SCL-90';
      case 'MBTI': return 'MBTI';
      case 'SDS':
      case 'SDS/SAS': return 'SDS/SAS';
      default: return type;
    }
  };

  const getRiskLevelColor = (level: string | null) => {
    switch (level) {
      case 'low': return 'text-gray-700 bg-gray-100';
      case 'medium': return 'text-gray-700 bg-orange-100';
      case 'high': return 'text-gray-800 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskLevelLabel = (level: string | null) => {
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中风险';
      case 'high': return '高风险';
      default: return '未评估';
    }
  };

  if (!mounted) {
    return null;
  }

  if (!token) {
    return (
      <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.04),transparent_50%)]" />
        <div className="min-h-[calc(100dvh-var(--nav-offset))] flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-2xl">🔒</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">需要登录</h2>
            <p className="text-gray-500 mb-6">请先登录以查看个人中心</p>
            <Link href="/login" className="inline-block px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors duration-200">
              立即登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.04),transparent_50%)] pointer-events-none" />

      <div className="min-h-[calc(100dvh-var(--nav-offset))] p-6 relative z-10 overflow-y-auto apple-scrollbar touch-scroll">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">个人中心</h1>
            <p className="text-gray-500 mt-2">管理你的个人信息和设置</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              <span className="ml-3 text-gray-600">加载中...</span>
            </div>
          ) : profile ? (
            <div className="space-y-8">
              {/* 用户基本信息卡片 */}
              <div className="w-full">
                <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-black/[0.08] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      {/* 苹果风格头像上传 */}
                      <AvatarUpload
                        userId={profile.id}
                        name={profile.name}
                        currentAvatar={profile.profileImage}
                        onAvatarChange={handleAvatarChange}
                        size="lg"
                      />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {profile.nickname || profile.name}
                        </h2>
                        <p className="text-gray-500 text-sm">
                          {profile.accountType === "student"
                            ? (profile.studentId || '未设置学号')
                            : profile.accountType === "teacher"
                            ? (profile.teacherId || '未设置工号')
                            : profile.isSuperAdmin && profile.email
                            ? profile.email
                            : (profile.studentId || profile.teacherId || profile.email || '未设置')}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            profile.isSuperAdmin
                              ? "bg-red-100 text-red-700"
                              : profile.accountType === "teacher" || profile.accountType === "admin"
                              ? "bg-orange-100 text-orange-700"
                              : profile.accountType === "student"
                              ? "bg-blue-100 text-blue-700"
                              : profile.accountType === "weapp"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {profile.isSuperAdmin
                              ? "超级管理员"
                              : profile.accountType === "teacher" || profile.accountType === "admin"
                              ? "老师"
                              : profile.accountType === "student"
                              ? "学生"
                              : profile.accountType === "weapp"
                              ? "微信用户"
                              : "注册用户"}
                          </span>
                          {/* 来源徽标 */}
                          {profile.createdByType && !profile.isSuperAdmin && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              profile.createdByType === 'weapp_oauth' || profile.createdByType === 'wechat_oauth'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : profile.createdByType === 'email_register' || profile.createdByType === 'phone_register'
                                ? 'bg-gray-50 text-gray-700 border border-gray-200'
                                : profile.createdByType === 'super_admin'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : profile.createdByType === 'admin_created'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-gray-50 text-gray-600 border border-gray-200'
                            }`}>
                              {profile.createdByType === 'weapp_oauth' || profile.createdByType === 'wechat_oauth' ? '微信注册'
                                : profile.createdByType === 'email_register' || profile.createdByType === 'phone_register' ? '自助注册'
                                : profile.createdByType === 'super_admin' ? '超管注册'
                                : profile.createdByType === 'admin_created' ? '管理员创建'
                                : profile.createdByType}
                            </span>
                          )}
                          {/* 创建来源标签：用于区分"超管注册"等 */}
                          {profile.createdByType === 'super_admin' && !profile.isSuperAdmin && (
                            <span className="inline-block px-2 py-1 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                              超管注册
                            </span>
                          )}
                          {profile.nickname && profile.nickname !== profile.name && (
                            <span className="text-xs text-gray-400">
                              ({profile.name})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 编辑按钮 */}
                    <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 w-full sm:w-auto ml-auto order-last sm:order-none">
                      <button
                        onClick={() => setShowPasswordDialog(true)}
                        className="flex-none h-10 px-4 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors text-sm font-medium border border-orange-200/50 flex items-center justify-center"
                      >
                        修改密码
                      </button>
                      <button
                        onClick={() => setShowEditDialog(true)}
                        className="flex-none h-10 px-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200/50 flex items-center justify-center"
                      >
                        编辑资料
                      </button>
                    </div>
                  </div>

                  {/* 绑定与安全 - 紧凑分组，避免与其他卡片拥挤 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* 小程序绑定（紧凑卡片） */}
                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 min-h-[120px] flex items-center">
                      <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl leading-none">🟢</span>
                          <div>
                            <p className="font-medium text-gray-900">微信绑定（小程序）</p>
                            <p className="text-xs text-gray-600">在小程序个人资料页完成绑定</p>
                            {profile && (
                              <p className="mt-1 text-xs text-gray-600">
                                <span>当前状态：</span>
                                {profile.weappOpenId ? (
                                  <span className="text-green-700">已绑定</span>
                                ) : (
                                  <span className="text-red-600">未绑定</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0 sm:ml-auto justify-end">
                          <button onClick={refreshWeappBindStatus} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200">刷新</button>
                          <Link href="/weapp-bind" className="px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200">绑定码</Link>
                          {profile?.weappOpenId && (
                            <button onClick={unbindWeapp} className="px-2.5 py-1 text-xs bg-red-50 text-red-600 rounded-full hover:bg-red-100">解绑</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 密保邮箱（账号） */}
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 min-h-[120px] flex items-start sm:items-center">
                      <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl leading-none">🛡️</span>
                          <div>
                            <p className="font-medium text-gray-900">{profile.email ? '密保邮箱（账号）' : '密保邮箱'}</p>
                            <p className="text-xs sm:text-sm text-gray-700 break-all">{profile.securityEmail || '未设置'}</p>
                            <p className="hidden sm:block text-xs text-amber-700 mt-1">用于敏感操作与登录找回</p>
                          </div>
                        </div>
                        <div className="flex sm:ml-auto justify-end">
                          <button onClick={() => setShowSecEmailDialog(true)} className="px-3 py-1 text-xs bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors mt-1 sm:mt-0">{profile.securityEmail ? '修改' : '去完善'}</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 查看模式 - 显示其他个人信息 */}
                  <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
                    {/* 性别 - 所有用户 */}
                    <div className="p-4 rounded-xl bg-pink-50 border border-pink-100">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {profile.gender === "男" ? "👨" : profile.gender === "女" ? "👩" : profile.gender === "不方便透露" ? "🤐" : "❓"}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">性别</p>
                          <p className="text-sm text-gray-600">{profile.gender || "未填写"}</p>
                        </div>
                      </div>
                    </div>

                    {/* 生日 - 所有用户 */}
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🎂</span>
                        <div>
                          <p className="font-medium text-gray-900">生日</p>
                          <p className="text-sm text-gray-600">
                            {profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('zh-CN') : "未填写"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 星座 - 有生日的用户显示（带图标）*/}
                    {profile.zodiac && (
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-blue-100 flex items-center justify-center">
                            <img src={getZodiacIconPath(profile.zodiac, 'png')} alt={profile.zodiac || '星座'} className="w-8 h-8 object-contain" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">星座</p>
                            <p className="text-sm text-gray-600">{profile.zodiac}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 移除"邮箱"卡片，保留"个人邮箱" */}

                    {/* 登录手机号卡片已下线 */}

                    {/* 学院 - 仅学生用户 */}
                    {profile.accountType === 'student' && (
                      <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🏛️</span>
                          <div>
                            <p className="font-medium text-gray-900">学院</p>
                            <p className="text-sm text-gray-600">{profile.college || "未填写"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 专业 - 仅学生用户 */}
                    {profile.accountType === 'student' && (
                      <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📚</span>
                          <div>
                            <p className="font-medium text-gray-900">专业</p>
                            <p className="text-sm text-gray-600">{profile.major || "未填写"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 班级 - 仅学生用户 */}
                    {profile.accountType === 'student' && (
                      <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-100">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🏫</span>
                          <div>
                            <p className="font-medium text-gray-900">班级</p>
                            <p className="text-sm text-gray-600">{profile.className || "未填写"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 办公室 - 老师和超级管理员 */}
                    {(profile.accountType === 'teacher' || profile.accountType === 'admin' || profile.isSuperAdmin) && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🏢</span>
                          <div>
                            <p className="font-medium text-gray-900">办公室</p>
                            <p className="text-sm text-gray-600">{profile.office || "未填写"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                     {/* 联系电话 - 所有用户均可填写（与登录账号无关） */}
                    {(profile.accountType === 'teacher' || profile.accountType === 'admin' || 
                      profile.accountType === 'self' || profile.accountType === 'student' || profile.isSuperAdmin) && (
                      <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 flex items-center">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📞</span>
                          <div>
                            <p className="font-medium text-gray-900">联系电话</p>
                              <p className="text-sm text-gray-600">{(profile as any).contactPhone || "未填写"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 个人邮箱 - 所有用户 */}
                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 flex items-center">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📧</span>
                        <div>
                          <p className="font-medium text-gray-900">个人邮箱</p>
                          <p className="text-sm text-gray-600">{profile.personalEmail || "未填写"}</p>
                        </div>
                      </div>
                    </div>

                    {/* 创建/注册时间 */}
                    <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📅</span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {profile.accountType === "admin" ? "创建时间" :
                             profile.accountType === "student" ? "创建时间" : "注册时间"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(profile.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 仪表盘卡片区域（等高、统一风格） */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch content-stretch">
                {/* 最近天气 */}
                <div className="h-full md:col-span-1">
                  <div className={`${unifiedCardBaseClassName} min-h-[160px]`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-black/[0.06]">
                        <span className="text-xl">🌤️</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">最近天气</h3>
                    </div>
                    {profile.lastWeatherSummary ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">{profile.lastLocationName}</p>
                        <p className="font-medium">{profile.lastWeatherSummary} · {profile.lastWeatherTempC}°C</p>
                        <p className="text-xs text-gray-500">
                          {profile.lastWeatherUpdatedAt ? new Date(profile.lastWeatherUpdatedAt).toLocaleString('zh-CN') : '暂无数据'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">暂无天气数据</p>
                    )}
                  </div>
                </div>

                {/* 最近心语 */}
                <div className="h-full">
                  <div className={`${unifiedCardBaseClassName} min-h-[160px]`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center border border-black/[0.06]">
                        <span className="text-xl">💭</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">最近心语</h3>
                    </div>
                    {profile.lastDailyMessage ? (
                      <div className="space-y-3">
                        <blockquote className="text-sm text-gray-700 italic leading-relaxed">
                          {profile.lastDailyMessage}
                        </blockquote>
                        <p className="text-xs text-gray-500">
                          {profile.lastDailyAt ? new Date(profile.lastDailyAt).toLocaleString('zh-CN') : '暂无数据'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">暂无心语记录</p>
                    )}
                  </div>
                </div>

                {/* 测评统计 */}
                <div className="h-full">
                  <div className={`${unifiedCardBaseClassName} min-h-[160px]`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center border border-black/[0.06]">
                        <span className="text-xl">📊</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">测评统计</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">累计测评</span>
                        <span className="font-semibold text-lg text-blue-600">{assessmentStats.totalAssessments}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">本月完成</span>
                        <span className="font-semibold text-lg text-green-600">{assessmentStats.completedThisMonth}</span>
                      </div>
                      <Link href="/assessments/history" className="block w-full text-center py-2 mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                        查看完整历史
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 账号变更申请记录（整行） */}
                {accountChangeRequests.length > 0 && (
                  <div className="md:col-span-2">
                    <div className={`${unifiedCardBaseClassName} min-h-[160px]`}>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-black/[0.06]">
                          <span className="text-xl">📋</span>
                        </div>
                        <h3 className="font-semibold text-gray-900">账号变更申请</h3>
                      </div>
                      <div className="space-y-3">
                        {accountChangeRequests.slice(0, 3).map((request) => {
                          const statusDisplay = getRequestStatusDisplay(request.status);
                          return (
                            <div key={request.id} className="p-3 bg-white/70 rounded-xl border border-gray-200/60">
                              <div className="flex items-center justify-between flex-nowrap">
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg">{request.changeType === 'email' ? '📧' : '📱'}</span>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">申请修改{request.changeType === 'email' ? '邮箱' : '手机号'}</p>
                                    <p className="text-xs text-gray-600">{new Date(request.createdAt).toLocaleDateString('zh-CN')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 whitespace-nowrap shrink-0">
                                  <span className={`px-2 py-1 rounded-full text-[12px] font-medium ${statusDisplay.color} inline-flex items-center min-w-[52px] justify-center`}>{statusDisplay.label}</span>
                                  {request.status === 'pending' && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`/api/account-change/request?requestId=${request.id}`, {
                                            method: 'DELETE',
                                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                          });
                                          const data = await res.json();
                                          if (!res.ok) throw new Error(data.error || '撤销失败');
                                          showSuccess({ title: '已撤销', message: '申请已撤销' });
                                          if (token) fetchAccountChangeRequests(token);
                                        } catch (e) {
                                          showError({ title: '撤销失败', message: e instanceof Error ? e.message : '撤销失败' });
                                        }
                                      }}
                                      className="px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors inline-flex items-center"
                                    >
                                      撤销
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {accountChangeRequests.length > 3 && (
                        <div className="text-center mt-4">
                          <p className="text-xs text-gray-500">显示最近3条记录</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 最近测评 */}
                <div className={`h-full ${accountChangeRequests.length > 0 ? 'md:col-span-1' : 'md:col-span-3'}`}> 
                  <div className={`${unifiedCardBaseClassName} min-h-[160px]`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center border border-black/[0.06]">
                        <span className="text-xl">🧠</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">最近测评</h3>
                    </div>
                    {recentAssessments.length > 0 ? (
                      <div className="space-y-3">
                        {recentAssessments.slice(0, 3).map((assessment) => (
                          <Link key={assessment.id} href={`/assessments/${assessment.type.toLowerCase()}/result?id=${assessment.id}`} className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">{getTypeLabel(assessment.type)}</span>
                              {assessment.riskLevel && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(assessment.riskLevel)}`}>{getRiskLevelLabel(assessment.riskLevel)}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{assessment.completedAt ? new Date(assessment.completedAt).toLocaleDateString('zh-CN') : '未完成'}</p>
                            {assessment.type === 'MBTI' && assessment.personalityType ? (
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded-md overflow-hidden bg-white border flex items-center justify-center">
                                  <img src={getMbtiIconPath(assessment.personalityType, profile.gender, false)} alt={assessment.personalityType} className="max-w-full max-h-full object-contain object-center" onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = getMbtiIconPath(assessment.personalityType, null, true); }} />
                                </div>
                                <p className="text-xs text-blue-600 font-medium">{assessment.personalityType}</p>
                              </div>
                            ) : assessment.type === 'SCL90' && assessment.overallScore ? (
                              <p className="text-xs text-gray-600 mt-1">评分: {assessment.overallScore.toFixed(2)}</p>
                            ) : (assessment.type === 'SDS' || assessment.type === 'SDS/SAS') && assessment.overallScore ? (
                              <p className="text-xs text-purple-700 mt-1">SDS/SAS 指数: {Math.round(assessment.overallScore)}</p>
                            ) : null}
                          </Link>
                        ))}
                        {recentAssessments.length > 3 && (
                          <Link href="/assessments/history" className="block text-center py-2 text-blue-600 text-sm hover:text-blue-700">查看更多 ({recentAssessments.length - 3}+)</Link>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-2">暂无测评记录</p>
                        <Link href="/assessments" className="inline-block px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">开始测评</Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 使用统计部分 */}
              {userStats && (
                <div className="mt-8 lg:col-span-3">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">使用统计</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* 心语统计 */}
                    <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-black/[0.08] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <span className="text-purple-600 text-xl">💭</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">心语时刻</h3>
                          <p className="text-sm text-gray-500">总生成次数</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mb-2">{userStats.totalDailyQuotes}</p>
                      <p className="text-sm text-gray-600">每一句都是专属温暖</p>
                    </div>

                    {/* 测评统计 */}
                    <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-black/[0.08] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <span className="text-indigo-600 text-xl">🧠</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">心理测评</h3>
                          <p className="text-sm text-gray-500">累计完成次数</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mb-2">{userStats.totalAssessments}</p>
                      <p className="text-sm text-gray-600">了解自己，成长更好</p>
                    </div>

                    {/* 本月测评 */}
                    <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-black/[0.08] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <span className="text-emerald-600 text-xl">📅</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">本月测评</h3>
                          <p className="text-sm text-gray-500">当月完成次数</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mb-2">{userStats.completedThisMonth}</p>
                      <p className="text-sm text-gray-600">持续关注心理健康</p>
                    </div>

                    {/* 天气统计 */}
                    <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-black/[0.08] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <span className="text-blue-600 text-xl">🌤️</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">天气查询</h3>
                          <p className="text-sm text-gray-500">总查询次数</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mb-2">{userStats.weatherUpdates}</p>
                      <p className="text-sm text-gray-600">关注天气，关注心情</p>
                    </div>

                    {/* 使用天数 */}
                    <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-black/[0.08] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <span className="text-green-600 text-xl">📅</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">使用天数</h3>
                          <p className="text-sm text-gray-500">注册至今</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mb-2">{userStats.accountAge}</p>
                      <p className="text-sm text-gray-600">感谢一路陪伴</p>
                    </div>

                    {/* 活跃时段 */}
                    <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-black/[0.08] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                          <span className="text-pink-600 text-xl">🕐</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">活跃时段</h3>
                          <p className="text-sm text-gray-500">最常使用时间</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">{userStats.mostActiveTime}</p>
                      <p className="text-sm text-gray-600">你的专属时光</p>
                    </div>
                  </div>

                  {/* 使用建议 */}
                  <div className="mt-6 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 p-6 border border-purple-100/50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 使用建议</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-start space-x-2">
                        <span className="text-purple-500 mt-0.5">✨</span>
                        <p>每天获取一句心语，让温暖陪伴你的每一天</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-indigo-500 mt-0.5">🧠</span>
                        <p>定期进行心理测评，关注自己的心理健康状态</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-500 mt-0.5">🌤️</span>
                        <p>定期查看天气，关注外在环境与内心状态</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-500 mt-0.5">📱</span>
                        <p>坚持使用，让心晴成为你的情感陪伴工具</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">❌</span>
              </div>
              <p className="text-gray-500">加载个人信息失败</p>
            </div>
          )}


        </div>
      </div>

      {/* 密码重置对话框 */}
      <PasswordResetDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onPasswordChange={handlePasswordChange}
        isNewUser={isNewUser}
        isFirstTimeChange={isFirstTimeChange}
        userType={profile?.accountType || "用户"}
      />

      {/* 个人信息编辑弹窗 */}
      {showEditDialog && profile && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white/98 backdrop-blur-2xl rounded-[28px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] w-full max-w-3xl mx-auto overflow-hidden border border-white/40 animate-in slide-in-from-bottom-4 duration-300 h-[85vh] flex flex-col">
            {/* 精美头部 - 固定 */}
            <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-100/80 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5"></div>
              <div className="relative p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">编辑个人资料</h2>
                      <p className="text-gray-600 text-sm font-medium">更新您的个人信息和偏好设置</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEditDialog(false)}
                    className="w-10 h-10 bg-gray-100/80 hover:bg-gray-200/80 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 精美内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="p-8">
              <form onSubmit={(e) => { e.preventDefault(); handleProfileUpdate(); }} className="space-y-8">
                {/* 表单分组 */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* 姓名 */}
                    <div className="space-y-3">
                      <label className={formLabelClassName}>
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>姓名</span>
                        {profile.isSuperAdmin || profile.accountType === 'teacher' ? (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">可随时修改</span>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">需申请，一年仅一次</span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className={`w-full px-4 py-4 min-h-[56px] border border-gray-200/80 rounded-2xl focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500/60 transition-all duration-200 text-gray-900 placeholder-gray-400 shadow-sm bg-gray-50/80 hover:bg-gray-50`}
                          placeholder="请输入您的姓名"
                          />
                      </div>
                      {profile.pendingNameChangeTo && (
                        <p className="text-xs text-amber-700">原：{profile.name}；新：{profile.pendingNameChangeTo}（待审核）</p>
                      )}
                    </div>

                    {/* 昵称 */}
                    <div className="space-y-3">
                      <label className={formLabelClassName}>
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>昵称</span>
                        {!profile.isSuperAdmin && profile.accountType === 'admin' && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">(管理员只能修改一次)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editForm.nickname}
                          onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                          className="w-full px-4 py-4 min-h-[56px] bg-gray-50/80 border border-gray-200/80 rounded-2xl focus:ring-3 focus:ring-purple-500/20 focus:border-purple-500/60 transition-all duration-200 text-gray-900 placeholder-gray-400 shadow-sm hover:bg-gray-50"
                          placeholder="请输入您的昵称（可选）"
                        />
                      </div>
                    </div>

                    {/* 个人邮箱 */}
                    <div className="space-y-3">
                      <label className={formLabelClassName}>
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        <span>个人邮箱</span>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">可多次修改</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={editForm.personalEmail}
                          onChange={(e) => setEditForm({...editForm, personalEmail: e.target.value})}
                          className="w-full px-4 py-4 min-h-[56px] bg-gray-50/80 border border-gray-200/80 rounded-2xl focus:ring-3 focus:ring-green-500/20 focus:border-green-500/60 transition-all duration-200 text-gray-900 placeholder-gray-400 shadow-sm hover:bg-gray-50"
                          placeholder="请输入您的个人邮箱（可选）"
                        />
                      </div>
                    </div>

                    {/* 性别 - 使用 AppleSelect 组件 */}
                    <div className="space-y-3">
                      <label className={formLabelClassName}>
                        <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span>性别</span>
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">一年仅可修改一次（老师与超管不限）</span>
                      </label>
                        <div className="relative">
                         <AppleSelect
                          value={editForm.gender}
                          onChange={(value) => setEditForm({...editForm, gender: value})}
                          disabled={false}
                          placeholder="请选择性别"
                          options={[
                            { value: '男', label: '男', icon: '👨' },
                            { value: '女', label: '女', icon: '👩' },
                            { value: '不方便透露', label: '不方便透露', icon: '🤐' }
                          ]}
                           className=""
                        />
                      </div>
                    </div>

                    {/* 生日 - 所有人可见，一年仅能修改一次（老师/超管不限） */}
                    <div className="lg:col-span-2 space-y-3">
                        <label className={formLabelClassName}>
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>生日</span>
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">一年仅可修改一次（老师与超管不限）</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={editForm.birthDate}
                            onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})}
                            className={`w-full px-4 py-4 min-h-[56px] border border-gray-200/80 rounded-2xl focus:ring-3 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-all duration-200 text-gray-900 shadow-sm bg-gray-50/80 hover:bg-gray-50`}
                            max={new Date().toISOString().split('T')[0]}
                            disabled={false}
                          />
                        </div>
                      </div>

                    {/* 办公室 - 仅老师和超级管理员 */}
                    {(profile.accountType === 'teacher' || profile.isSuperAdmin) && (
                      <div className="space-y-3">
                        <label className={formLabelClassName}>
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>办公室</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={editForm.office}
                            onChange={(e) => setEditForm({...editForm, office: e.target.value})}
                            className="w-full px-4 py-4 min-h-[56px] bg-gray-50/80 border border-gray-200/80 rounded-2xl focus:ring-3 focus:ring-emerald-500/20 focus:border-emerald-500/60 transition-all duration-200 text-gray-900 placeholder-gray-400 shadow-sm hover:bg-gray-50"
                            placeholder="请输入您的办公室（可选）"
                          />
                        </div>
                      </div>
                    )}

                 {/* 联系电话（可自由修改，不影响登录账号） */}
                    {(profile.accountType === 'teacher' || 
                      profile.accountType === 'self' || profile.accountType === 'student' || profile.isSuperAdmin) && (
                      <div className="space-y-3">
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-800">
                          <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>联系电话</span>
                          <span className="text-xs text-violet-600 bg-violet-50 px-2 py-1 rounded-full">可多次修改</span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                              value={editForm.contactPhone}
                              onChange={(e) => setEditForm({...editForm, contactPhone: e.target.value})}
                            className="w-full px-4 py-4 min-h-[56px] bg-gray-50/80 border border-gray-200/80 rounded-2xl focus:ring-3 focus:ring-violet-500/20 focus:border-violet-500/60 transition-all duration-200 text-gray-900 placeholder-gray-400 shadow-sm hover:bg-gray-50"
                            placeholder="请输入您的联系电话（可选）"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 精美权限提示 */}
                {!profile.isSuperAdmin && (
                  <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/40 rounded-2xl p-6 shadow-sm">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-2xl"></div>
                    <div className="relative flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-amber-900 mb-3 flex items-center space-x-2">
                          <span>📝 修改权限说明</span>
                        </h4>
                        <div className="space-y-3 text-sm text-amber-800">
                          <div className="flex items-start space-x-3 p-3 bg-white/60 rounded-xl border border-amber-200/30">
                            <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div>
                              <p className="font-medium">姓名、性别和生日</p>
                              <p className="text-xs text-amber-700 mt-1">普通用户只能修改一次，请谨慎操作</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 bg-white/60 rounded-xl border border-amber-200/30">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div>
                              <p className="font-medium">个人邮箱和昵称</p>
                              <p className="text-xs text-amber-700 mt-1">个人联系邮箱可以多次修改，与登录账号无关</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 bg-white/60 rounded-xl border border-amber-200/30">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div>
                              <p className="font-medium">超级管理员</p>
                              <p className="text-xs text-amber-700 mt-1">拥有所有字段的无限修改权限</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </form>
              </div>
            </div>

            {/* 精美操作按钮 - 固定底部 */}
            <div className="flex-shrink-0 p-6 bg-gray-50/80 border-t border-gray-100/80">
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 group relative px-8 py-4 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-2xl hover:from-gray-200 hover:to-gray-100 transition-all duration-300 font-semibold border border-gray-200/80 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>取消</span>
                  </div>
                </button>
                <button
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="flex-1 group relative px-8 py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center space-x-2">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>保存中...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>保存更改</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 账号变更申请对话框 */}
      <AccountChangeRequestDialog
        isOpen={showAccountChangeDialog}
        onClose={() => setShowAccountChangeDialog(false)}
        changeType={changeType}
        currentValue={(profile?.email || '')}
        onSuccess={handleAccountChangeSuccess}
      />

      {/* 密保邮箱修改（所有用户可见；内部根据身份与开关控制具体流程） */}
      <SecurityEmailChangeDialog
        isOpen={showSecEmailDialog}
        onClose={() => setShowSecEmailDialog(false)}
        currentEmail={profile?.securityEmail}
        onSuccess={() => { if (token) fetchProfile(token); }}
      />

      {/* Toast 通知 */}
      <SuccessToast />
      <ErrorToast />
    </div>
  );
}
