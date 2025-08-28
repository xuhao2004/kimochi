"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePageVisit } from "@/hooks/usePageVisit";
// import { AdminAccessDenied } from "@/components/AccessDenied"; // 移除权限限制
import { notificationUtils } from '@/lib/notificationUtils';
import AppleSelect from '@/components/AppleSelect';
import AppleConfirmDialog from '@/components/AppleConfirmDialog';
import { useUnifiedNotification } from '@/contexts/UnifiedNotificationContext';
import FriendRequestDialog from '@/components/FriendRequestDialog';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  isProcessed: boolean;
  createdAt: string;
  userId?: string;
  user?: {
    name: string;
    nickname?: string;
    accountType: string;
  };
}

interface Statistics {
  total: number;
  unread: number;
  read: number;
  unprocessed: number;
  processed: number;
  urgent: number;
  high: number;
  normal: number;
  low: number;
  systemAlerts: number;
  passwordExpired: number;
  profileIncomplete: number;
  apiFailures: number;
  systemErrors: number;
  deepseekAlerts: number;
  weatherAlerts: number;
}

interface FilterState {
  severity: 'all' | 'urgent' | 'high' | 'normal' | 'low';
  status: 'all' | 'unread' | 'read' | 'unprocessed' | 'processed';
  type: 'all' | 'system' | 'api' | 'friends' | 'password' | 'profile';
  timeRange: 'all' | 'today' | 'week' | 'month';
}

export default function NotificationCenterPage() {
  // 使用统一的通知数据
  const { 
    notificationData, 
    totalUnreadCount,
    systemUnreadCount,
    chatUnreadCount,
    friendRequestCount,
    refreshNotifications,
    markMessageAsRead,
    markAllAsRead,
    deleteMessage,
    markAsProcessed,
    isRefreshing 
  } = useUnifiedNotification();
  const [token, setToken] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState<'superAdmin' | 'admin' | 'teacher' | 'student' | 'self' | null>(null);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  
  // 过滤状态
  const [filters, setFilters] = useState<FilterState>({
    severity: 'all',
    status: 'all',
    type: 'all',
    timeRange: 'all'
  });
  
  // 选择状态
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showAdvancedInline, setShowAdvancedInline] = useState(true);
  const [compactActions, setCompactActions] = useState(false);
  const [iconOnlyFilters, setIconOnlyFilters] = useState(false);
  const filtersRowRef = useRef<HTMLDivElement | null>(null);
  
  // 视图状态
  const [sortBy, setSortBy] = useState<'priority' | 'time' | 'status'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 确认对话框状态
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showMarkAllReadConfirm, setShowMarkAllReadConfirm] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  usePageVisit("notification-center");

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
    if (t) {
      fetchUserProfile(t);
      // 初始化时使用统一数据源刷新
      refreshNotifications(true);
    }
    // 支持从外部入口直接打开好友申请对话框
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openFriendRequests') === 'true') {
        setFilters(prev => ({ ...prev, type: 'friends' }));
        setShowFriendRequests(true);
      }
      // 根据可用空间决定是否内联展示“高级筛选”
      const decideAdvanced = () => {
        const w = window.innerWidth;
        // 图标化筛选：当空间不足时隐藏文字，仅保留图标
        // - <640：强制图标模式（iconOnlyFilters=true）
        // - 640~1023：根据测量宽度与阈值切换
        // - >=1024：优先显示文字，但不足时仍退化为图标
        let iconOnly = false;
        if (w < 640) iconOnly = true;

        // 结合实际可用宽度测量（filtersRowRef）决定是否图标化
        if (!iconOnly && filtersRowRef.current) {
          const el = filtersRowRef.current;
          const overflowing = el.scrollWidth > el.clientWidth + 8; // 有溢出即拥挤
          iconOnly = overflowing;
        }
        setIconOnlyFilters(iconOnly);
        setShowAdvancedInline(true); // 统一在一行展示所有筛选，靠图标化来压缩

        // 通知项底部操作区折叠规则：
        // - <640 统一使用“更多”菜单（compactActions=true）
        // - 640~1023 根据宽度阈值切换（<820 折叠）
        // - >=1024 展开底部按钮（compactActions=false）
        if (w < 640) {
          setCompactActions(true);
        } else if (w < 1024) {
          setCompactActions(!(w >= 900));
        } else {
          setCompactActions(false);
        }
      };
      decideAdvanced();
      window.addEventListener('resize', decideAdvanced);
      return () => window.removeEventListener('resize', decideAdvanced);
    }
  }, []);

  useEffect(() => {
    if (token) {
      // 过滤和排序发生变化时，不重新请求，客户端基于统一数据源计算
      // 如需刷新，可触发轻量刷新
    }
  }, [filters, sortBy, sortOrder, token]);

  // 用户类型变更时重新获取，确保管理员能看到管理员消息
  useEffect(() => {
    if (token) {
      refreshNotifications(false);
    }
  }, [userType, token, refreshNotifications]);

  // 监听统一通知数据变化，同步更新页面数据
  // 统一数据变化时，重算统计信息
  useEffect(() => {
    const all = notificationData.systemMessages || [];
    const stats: Statistics = {
      total: all.length,
      unread: all.filter(n => !n.isRead).length,
      read: all.filter(n => n.isRead).length,
      unprocessed: all.filter(n => (n as any).isProcessed === false).length,
      processed: all.filter(n => (n as any).isProcessed === true).length,
      urgent: all.filter(n => n.priority === 'urgent').length,
      high: all.filter(n => n.priority === 'high').length,
      normal: all.filter(n => n.priority === 'normal').length,
      low: all.filter(n => n.priority === 'low').length,
      systemAlerts: all.filter(n => n.type?.startsWith('system_') || n.type?.includes('password') || n.type?.includes('profile')).length,
      passwordExpired: all.filter(n => n.type === 'system_password_expired' || n.type === 'teacher_password_expired' || n.type === 'student_password_expired').length,
      profileIncomplete: all.filter(n => n.type === 'system_profile_incomplete' || n.type === 'teacher_profile_incomplete' || n.type === 'student_profile_incomplete').length,
      apiFailures: all.filter(n => n.type === 'system_api_failure').length,
      systemErrors: all.filter(n => n.type === 'system_system_error' || n.type === 'system_error').length,
      deepseekAlerts: all.filter(n => n.type === 'deepseek_quota_limit').length,
      weatherAlerts: all.filter(n => n.type === 'weather_api_limit').length,
    };
    setStatistics(stats);
  }, [notificationData]);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        if (user.isSuperAdmin) {
          setUserType('superAdmin');
        } else if (user.isAdmin || user.accountType === 'admin') {
          setUserType('admin');
        } else if (user.accountType === 'teacher') {
          setUserType('teacher');
        } else if (user.accountType === 'student') {
          setUserType('student');
        } else {
          setUserType('self'); // 普通注册用户
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  // 基于统一数据源的本地过滤和排序
  const notifications = React.useMemo(() => {
    const all = (notificationData.systemMessages || []) as unknown as Notification[];
    // 过滤
    const filtered = all.filter(n => {
      // 状态过滤
      if (filters.status === 'unread' && n.isRead) return false;
      if (filters.status === 'read' && !n.isRead) return false;
      if (filters.status === 'processed' && !(n as any).isProcessed) return false;
      if (filters.status === 'unprocessed' && (n as any).isProcessed) return false;
      // 类型过滤（友链在单独入口）
      if (filters.type === 'system') {
        return n.type?.startsWith('system_');
      }
      if (filters.type === 'api') {
        return n.type === 'system_api_failure';
      }
      if (filters.type === 'friends') {
        return n.type === 'friend_request' || n.type === 'friend_request_receipt';
      }
      if (filters.type === 'password') {
        return n.type?.includes('password');
      }
      if (filters.type === 'profile') {
        return n.type?.includes('profile');
      }
      return true;
    });

    // 排序
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number, bValue: number;
      switch (sortBy) {
        case 'priority': {
          const priorityOrder: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
          aValue = priorityOrder[a.priority] || 1;
          bValue = priorityOrder[b.priority] || 1;
          break;
        }
        case 'time':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'status':
          aValue = (a as any).isProcessed ? 1 : 0;
          bValue = (b as any).isProcessed ? 1 : 0;
          break;
        default:
          aValue = 0; bValue = 0;
      }
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
    return sorted;
  }, [notificationData, filters, sortBy, sortOrder]);

  const markAsRead = async (messageIds: string[]) => {
    if (!token) return;
    try {
      await Promise.all(messageIds.map(id => {
        const target = notifications.find(n => n.id === id);
        return markMessageAsRead(id, (target as any)?.source);
      }));
      const remainingUnreadAfterUpdate = notifications.filter(n => !messageIds.includes(n.id) && !n.isRead);
      if (filters.status === 'unread' && remainingUnreadAfterUpdate.length === 0) {
        setFilters({ ...filters, status: 'all' });
      }
      refreshNotifications(true);
      window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
    } catch (error) {
      console.error("标记已读失败:", error);
      setError("操作失败");
    }
  };

  // markAsProcessed 函数现在从 useUnifiedNotification 中获取

  const deleteNotifications = async (messageIds: string[]) => {
    if (!token) return;
    try {
      await Promise.all(messageIds.map(id => {
        const target = notifications.find(n => n.id === id);
        return deleteMessage(id, (target as any)?.source);
      }));
      const remainingUnreadAfterDelete = notifications.filter(n => !messageIds.includes(n.id) && !n.isRead);
      if (filters.status === 'unread' && remainingUnreadAfterDelete.length === 0) {
        setFilters({ ...filters, status: 'all' });
      }
      setSelectedNotifications(new Set());
      refreshNotifications(true);
      window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
    } catch (error) {
      console.error("删除失败:", error);
      setError("删除失败");
    }
  };

  const handleClearAllClick = () => {
    if (!token || userType !== 'superAdmin') return;
    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    if (!token || userType !== 'superAdmin') return;
    
    try {
      setIsClearingAll(true);
      const response = await fetch("/api/admin/messages", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ clearAll: true })
      });
      
      const result = await response.json();
      if (response.ok) {
        setSelectedNotifications(new Set());
        refreshNotifications(true);
        // 触发统一通知数据刷新
        refreshNotifications(true);
        setShowClearConfirm(false);
        // 触发全局未读状态更新
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
        }, 100);
        // 使用成功提示而不是alert
        setError(`✅ ${result.message || '所有通知已清空'}`);
        setTimeout(() => setError(''), 3000);
      } else {
        setError(result.error || '清空失败');
      }
    } catch (error) {
      console.error("清空失败:", error);
      setError("清空失败");
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleMarkAllReadClick = () => {
    if (!token) return;
    setShowMarkAllReadConfirm(true);
  };

  const confirmMarkAllRead = async () => {
    if (!token) return;
    
    try {
      setIsMarkingAllRead(true);
      // 使用统一方法，内部会根据用户类型分别处理两套消息源
      await markAllAsRead();
      setSelectedNotifications(new Set());
      refreshNotifications(true);
      refreshNotifications(true);
      setShowMarkAllReadConfirm(false);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
      }, 100);
      setError('✅ 所有通知已标记为已读');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      console.error("标记已读失败:", error);
      setError("操作失败");
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const triggerSystemCheck = async () => {
    if (!token || userType !== 'superAdmin') return;
    
    try {
      setLoading(true);
      await fetch("/api/admin/system-checks", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 等待检查完成后刷新通知（统一数据源）
      setTimeout(() => {
        refreshNotifications(true);
      }, 2000);
    } catch (error) {
      console.error("系统检查失败:", error);
      setError("系统检查失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
    setSelectAll(!selectAll);
  };

  const toggleNotificationSelection = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
    setSelectAll(newSelected.size === notifications.length && notifications.length > 0);
  };

  const getSeverityDisplay = (priority: string) => {
    const severityMap = {
      urgent: { label: '紧急', className: 'bg-red-100 text-red-700 border border-red-200', dot: 'bg-red-500' },
      high: { label: '高', className: 'bg-orange-100 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
      normal: { label: '中', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200', dot: 'bg-yellow-500' },
      low: { label: '低', className: 'bg-blue-100 text-blue-700 border border-blue-200', dot: 'bg-blue-500' }
    };
    const severity = severityMap[priority as keyof typeof severityMap] || severityMap.normal;
    
    return (
      <span className="flex items-center gap-2" title={severity.label}>
        <span className={`inline-flex sm:hidden w-2 h-2 rounded-full ${severity.dot}`} />
        <span className={`hidden sm:inline-flex px-3 py-1 text-xs rounded-full font-medium ${severity.className}`}>{severity.label}</span>
      </span>
    );
  };

  if (!token) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">请先登录...</p>
        </div>
      </div>
    );
  }

  if (!userType || userType === null) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-white to-slate-50 overflow-y-auto apple-scrollbar touch-scroll" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
        {/* 头部：在大屏保持同一行，小屏自动换行；更窄屏动作区独占一行或逐行堆叠 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 nc-header">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">通知中心</h1>
              <p className="text-gray-600 text-sm sm:text-base">系统通知与警报管理</p>
            </div>
            
            {/* 操作按钮（小屏居中 + 横向滚动；大屏靠右对齐、不挤压标题） */}
            <div className="w-full sm:w-auto sm:ml-auto flex justify-center sm:justify-end flex-nowrap space-x-2 sm:space-x-3 overflow-x-auto sm:overflow-visible no-scrollbar px-1 sm:px-0 snap-x nc-actions">
              <button
                onClick={() => setShowFriendRequests(true)}
                className="flex-none flex items-center justify-center text-center h-12 px-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all duration-200 font-medium shadow-lg shadow-indigo-200 relative whitespace-nowrap snap-start tap-44 w-[88vw] sm:w-auto"
                title="查看好友申请"
              >
                <span className="btn-icon mr-2">🫱🏻‍🫲🏻</span>
                <span className="btn-text">查看好友申请</span>
                {friendRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                    {friendRequestCount > 99 ? '99+' : friendRequestCount}
                  </span>
                )}
              </button>
              {userType === 'superAdmin' && (
                <button
                  onClick={triggerSystemCheck}
                  disabled={loading}
                  className="flex-none flex items-center justify-center text-center h-12 px-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg shadow-blue-200 whitespace-nowrap snap-start tap-44 w-[88vw] sm:w-auto"
                  title="运行系统检查"
                >
                  <span className="btn-icon mr-2">🧪</span>
                  <span className="btn-text">{loading ? '检查中...' : '运行系统检查'}</span>
                </button>
              )}
              <button
                onClick={handleMarkAllReadClick}
                disabled={loading || isMarkingAllRead}
                className="flex-none flex items-center justify-center text-center h-12 px-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg shadow-green-200 whitespace-nowrap snap-start tap-44 w-[88vw] sm:w-auto"
                title="已读所有通知"
              >
                {isMarkingAllRead && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span className="btn-icon mr-2">✅</span>
                <span className="btn-text">已读所有通知</span>
              </button>
              {userType === 'superAdmin' && (
                <button
                  onClick={handleClearAllClick}
                  disabled={loading || isClearingAll}
                  className="flex-none flex items-center justify-center text-center h-12 px-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg shadow-red-200 whitespace-nowrap snap-start tap-44 w-[88vw] sm:w-auto"
                  title="清空所有通知"
                >
                  {isClearingAll && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className="btn-icon mr-2">🗑️</span>
                  <span className="btn-text">清空所有通知</span>
                </button>
              )}
            </div>
          </div>
          
          {error && (
            <div className={`mt-4 p-4 rounded-2xl border ${
              error.startsWith('✅') 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={error.startsWith('✅') ? 'text-green-700' : 'text-red-700'}>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* 统计卡片 */}
        {statistics && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
             <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">未读通知</p>
                   <p className="text-2xl sm:text-3xl font-bold text-blue-600">{statistics.unread}</p>
                </div>
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <span className="text-blue-600 text-xl">📬</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">未处理</p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600">{statistics.unprocessed}</p>
                </div>
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <span className="text-orange-600 text-xl">⚠️</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">高优先级</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600">{statistics.urgent + statistics.high}</p>
                </div>
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                  <span className="text-red-600 text-xl">🚨</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">系统警报</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{statistics.systemAlerts}</p>
                </div>
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <span className="text-purple-600 text-xl">🔧</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 过滤器和操作栏（含更多筛选抽屉） */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-gray-200/50 shadow-lg mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
            {/* 过滤器 + 排序（同一行，可横向滚动；垂直居中） */}
            <div ref={filtersRowRef} className="flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar touch-scroll px-2 py-1 h-11 sm:h-auto snap-x snap-mandatory">
              <AppleSelect
                value={filters.severity}
                onChange={(value) => setFilters({ ...filters, severity: value as any })}
                size="compact"
                iconOnly={iconOnlyFilters}
                options={[
                  { value: "all", label: iconOnlyFilters ? "" : "全部优先级", icon: "🎯" },
                  { value: "urgent", label: iconOnlyFilters ? "" : "紧急", icon: "🔴" },
                  { value: "high", label: iconOnlyFilters ? "" : "高", icon: "🟠" },
                  { value: "normal", label: iconOnlyFilters ? "" : "中", icon: "🟡" },
                  { value: "low", label: iconOnlyFilters ? "" : "低", icon: "🔵" }
                ]}
                className={`${iconOnlyFilters ? 'min-w-0' : 'min-w-[180px]'} flex-shrink-0 snap-start`}
              />
              
              <AppleSelect
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value as any })}
                size="compact"
                iconOnly={iconOnlyFilters}
                options={[
                  { value: "all", label: iconOnlyFilters ? "" : "全部状态", icon: "📋" },
                  { value: "unread", label: iconOnlyFilters ? "" : "未读", icon: "🔵" },
                  { value: "read", label: iconOnlyFilters ? "" : "已读", icon: "✅" },
                  { value: "unprocessed", label: iconOnlyFilters ? "" : "未处理", icon: "⏳" },
                  { value: "processed", label: iconOnlyFilters ? "" : "已处理", icon: "✔️" }
                ]}
                className={`${iconOnlyFilters ? 'min-w-0' : 'min-w-[160px]'} flex-shrink-0 snap-start`}
              />
              
              {/* 继续在一行展示：类型/时间 也图标化 */}
              <AppleSelect
                value={filters.type}
                onChange={(value) => setFilters({ ...filters, type: value as any })}
                size="compact"
                iconOnly={iconOnlyFilters}
                options={[
                  { value: "all", label: iconOnlyFilters ? "" : "全部类型", icon: "🏷️" },
                  { value: "system", label: iconOnlyFilters ? "" : "系统异常", icon: "⚠️" },
                  { value: "api", label: iconOnlyFilters ? "" : "API失败", icon: "🔌" },
                  { value: "friends", label: iconOnlyFilters ? "" : "好友与社交", icon: "🫱🏻‍🫲🏻" },
                  ...(userType === 'superAdmin' ? [
                    { value: "password", label: iconOnlyFilters ? "" : "密码过期", icon: "🔒" },
                    { value: "profile", label: iconOnlyFilters ? "" : "信息不完整", icon: "📝" }
                  ] : [])
                ]}
                className={`${iconOnlyFilters ? 'min-w-0' : 'min-w-[170px]'} flex-shrink-0 snap-start`}
              />
              <AppleSelect
                value={filters.timeRange}
                onChange={(value) => setFilters({ ...filters, timeRange: value as any })}
                size="compact"
                iconOnly={iconOnlyFilters}
                options={[
                  { value: "all", label: iconOnlyFilters ? "" : "全部时间", icon: "🕒" },
                  { value: "today", label: iconOnlyFilters ? "" : "今天", icon: "📅" },
                  { value: "week", label: iconOnlyFilters ? "" : "最近一周", icon: "📆" },
                  { value: "month", label: iconOnlyFilters ? "" : "最近一月", icon: "🗓️" }
                ]}
                className={`${iconOnlyFilters ? 'min-w-0' : 'min-w-[170px]'} flex-shrink-0 snap-start`}
              />

              {/* 优先级排序放入同一行，保持平齐 */}
              <AppleSelect
                value={`${sortBy}-${sortOrder}`}
                onChange={(value) => {
                  const [by, order] = value.split('-');
                  setSortBy(by as any);
                  setSortOrder(order as any);
                }}
                size="compact"
                iconOnly={iconOnlyFilters}
                options={[
                  { value: "priority-desc", label: iconOnlyFilters ? "" : "优先级 ↓", icon: "🔽" },
                  { value: "priority-asc", label: iconOnlyFilters ? "" : "优先级 ↑", icon: "🔼" },
                  { value: "time-desc", label: iconOnlyFilters ? "" : "时间 ↓", icon: "📅" },
                  { value: "time-asc", label: iconOnlyFilters ? "" : "时间 ↑", icon: "📅" },
                  { value: "status-desc", label: iconOnlyFilters ? "" : "状态 ↓", icon: "📊" },
                  { value: "status-asc", label: iconOnlyFilters ? "" : "状态 ↑", icon: "📊" }
                ]}
                className={`${iconOnlyFilters ? 'min-w-0' : 'min-w-[150px]'} flex-shrink-0 snap-start`}
              />
            </div>
            
            {/* 批量操作（仅在有选中时出现） */}
            <div className="flex items-center space-x-2 sm:space-x-3 mt-1">
              {selectedNotifications.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">已选择 {selectedNotifications.size} 条</span>
                  <button
                    onClick={() => markAsRead(Array.from(selectedNotifications))}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium transition-colors"
                  >
                    标记已读
                  </button>
                          {(userType === 'superAdmin' || userType === 'admin' || userType === 'teacher') && (
                    <button
                      onClick={async () => {
                        const selectedIds = Array.from(selectedNotifications);
                        for (const id of selectedIds) {
                          await markAsProcessed(id);
                        }
                        refreshNotifications(true);
                      }}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium transition-colors"
                    >
                              已处理
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotifications(Array.from(selectedNotifications))}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 通知列表 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-lg overflow-hidden">
          {loading || isRefreshing ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-2xl">📭</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无通知</h3>
              <p className="text-gray-500">根据当前过滤条件，没有找到相关通知</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* 表头 */}
              <div className="px-4 sm:px-6 py-4 bg-gray-50/80">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">全选</span>
                </div>
              </div>
              
              {/* 通知项 */}
               {notifications.map((notification) => (
                <div 
                  key={`${(notification as any).source || 'user'}-${notification.id}`} 
                  className={`px-4 sm:px-6 py-5 hover:bg-gray-50/50 transition-all duration-200 ${
                    !notification.isRead ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={() => toggleNotificationSelection(notification.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1.5"
                    />
                    
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
                        <span className="text-white text-lg">
                          {notificationUtils.getTypeDisplay(notification.type).icon}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h4 className="flex-1 text-sm sm:text-base font-semibold text-gray-900 leading-tight truncate">
                          {notification.title}
                        </h4>
                         <div className="flex items-center gap-2 flex-shrink-0 ml-2 sm:ml-4">
                          {getSeverityDisplay(notification.priority)}
                          {notification.isProcessed && (
                            <span className="inline-flex items-center h-6 px-2.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">
                              已处理
                            </span>
                          )}
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full self-center"></span>
                          )}
                          {/* 更多菜单（三点）：仅在紧凑模式下显示 */}
                          {compactActions && (
                            <div className="relative inline-block">
                              <button
                                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 self-center text-sm sm:text-base leading-none -translate-y-[5px] sm:translate-y-0"
                                title="更多"
                                aria-label="更多"
                                onClick={() => setOpenMenuId(openMenuId === notification.id ? null : notification.id)}
                              >
                                ⋯
                              </button>
                              {openMenuId === notification.id && (
                                <div className="absolute right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 min-w-[160px]">
                                  <button
                                    onClick={() => markAsRead([notification.id])}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                  >标记已读</button>
                                  {(userType === 'superAdmin' || userType === 'admin' || userType === 'teacher') && !notification.isProcessed && (
                                    <button
                                      onClick={() => markAsProcessed(notification.id)}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                    >标记已处理</button>
                                  )}
                                  <button
                                    onClick={() => deleteNotifications([notification.id])}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >删除</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                           <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-3 break-words">
                        {notification.content}
                       </p>
                       {/* 快捷操作按钮移动到底部操作区左侧，外观与“标记已读”一致 */}
                      
                      {notification.user && (
                        <p className="text-sm text-gray-500 mb-3">
                          相关用户: {notification.user.nickname || notification.user.name}
                          {notification.user.accountType === 'teacher' && ' (老师)'}
                          {notification.user.accountType === 'admin' && ' (管理员)'}
                        </p>
                      )}
                      
                       <div className="flex items-center justify-between gap-3">
                        <p className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                          {new Date(notification.createdAt).toLocaleString('zh-CN')}
                        </p>
                        
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                          {/* 额外功能按钮（统一放置在“标记已读”左侧，等高样式） */}
                          {(notification.type === 'system_profile_incomplete') && (
                            <button
                              onClick={() => { window.location.href = '/profile?openEditDialog=true'; }}
                              className="inline-flex items-center h-8 px-3 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition-colors whitespace-nowrap"
                            >
                              完善
                            </button>
                          )}
                          {(notification.type === 'system_password_required' || notification.type === 'system_password_expired') && (
                            <button
                              onClick={() => { window.location.href = '/profile?openPasswordDialog=true'; }}
                              className="inline-flex items-center h-8 px-3 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium transition-colors whitespace-nowrap"
                            >
                              修改
                            </button>
                          )}
                          {!compactActions && !notification.isRead && (
                            <button
                              onClick={() => markAsRead([notification.id])}
                              className="inline-flex items-center h-8 px-3 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition-colors whitespace-nowrap"
                            >
                              标记已读
                            </button>
                          )}
                            
                          {!compactActions && !notification.isProcessed && (userType === 'superAdmin' || userType === 'admin' || userType === 'teacher') && (
                            <button
                              onClick={() => markAsProcessed(notification.id)}
                              className="inline-flex items-center h-8 px-3 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition-colors whitespace-nowrap"
                            >
                              已处理
                            </button>
                          )}
                          
                          {!compactActions && (
                            <button
                              onClick={() => deleteNotifications([notification.id])}
                              className="inline-flex items-center h-8 px-3 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors whitespace-nowrap"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 更多筛选抽屉 */}
      {showMoreFilters && (
        <div className="fixed inset-0 z-[1000]">
          <div
            className="absolute inset-0 bg-black/30 backdrop-enter"
            onClick={() => setShowMoreFilters(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl border-l border-gray-200 drawer-enter p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">更多筛选</h3>
              <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200" onClick={() => setShowMoreFilters(false)} aria-label="关闭">✕</button>
            </div>
            <div className="space-y-4">
              <div className="text-xs text-gray-500">分组：较少使用</div>
              <AppleSelect
                value={filters.type}
                onChange={(value) => setFilters({ ...filters, type: value as any })}
                size="compact"
                options={[
                  { value: "all", label: "全部类型", icon: "🏷️" },
                  { value: "system", label: "系统异常", icon: "⚠️" },
                  { value: "api", label: "API失败", icon: "🔌" },
                  { value: "friends", label: "好友与社交", icon: "🫱🏻‍🫲🏻" },
                  ...(userType === 'superAdmin' ? [
                    { value: "password", label: "密码过期", icon: "🔒" },
                    { value: "profile", label: "信息不完整", icon: "📝" }
                  ] : [])
                ]}
              />
              <AppleSelect
                value={filters.timeRange}
                onChange={(value) => setFilters({ ...filters, timeRange: value as any })}
                size="compact"
                options={[
                  { value: "all", label: "全部时间", icon: "🕒" },
                  { value: "today", label: "今天", icon: "📅" },
                  { value: "week", label: "最近一周", icon: "📆" },
                  { value: "month", label: "最近一月", icon: "🗓️" }
                ]}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                onClick={() => setShowMoreFilters(false)}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 清空所有通知确认对话框 */}
      <AppleConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearAll}
        title="清空所有通知"
        message="确定要清空所有通知吗？此操作将永久删除所有通知消息，无法撤销。请谨慎操作。"
        confirmText="确认清空"
        cancelText="取消"
        variant="destructive"
        isLoading={isClearingAll}
      />

      {/* 已读所有通知确认对话框 */}
      <AppleConfirmDialog
        isOpen={showMarkAllReadConfirm}
        onClose={() => setShowMarkAllReadConfirm(false)}
        onConfirm={confirmMarkAllRead}
        title="已读所有通知"
        message="确定要将所有通知标记为已读吗？此操作会清除所有未读状态，您确定要继续吗？"
        confirmText="确认标记"
        cancelText="取消"
        variant="default"
        isLoading={isMarkingAllRead}
      />

      {/* 好友申请对话框 */}
      <FriendRequestDialog
        isOpen={showFriendRequests}
        onClose={() => setShowFriendRequests(false)}
        onRequestProcessed={() => {
          // 处理后立即刷新数据，避免通知残留
          refreshNotifications(true);
        }}
      />
    </div>
  );
}
