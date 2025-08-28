"use client";

import React, { useState, useEffect } from 'react';
import { usePageVisit } from '@/hooks/usePageVisit';
import AppleButton from '@/components/AppleButton';
import AppleSelect from '@/components/AppleSelect';
import AppleTextarea from '@/components/AppleTextarea';
import { useSuccessToast } from '@/components/SuccessToast';
import { useErrorToast } from '@/components/ErrorToast';
import { useUnifiedNotification } from '@/contexts/UnifiedNotificationContext';

// 账户类型和创建方式映射函数
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

function getCreatedByTypeLabel(createdByType: string | undefined) {
  if (!createdByType) return '自助注册';
  const typeMap: Record<string, string> = {
    'super_admin': '超级管理员创建',
    'admin_created': '管理员创建',
    'email_register': '邮箱注册',
    'phone_register': '手机注册',
    'weapp_oauth': '微信注册',
    'wechat_oauth': '微信注册',
  };
  return typeMap[createdByType] || '自助注册';
}

interface AccountChangeRequest {
  id: string;
  changeType: 'email' | 'phone' | 'name';
  currentValue: string;
  newValue: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  processedAt?: string;
  reviewReason?: string;
  user: {
    id: string;
    name: string;
    nickname?: string;
    accountType: string;
    createdByType?: string;
  };
  reviewer?: {
    name: string;
    nickname?: string;
  };
}

interface Statistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function AccountChangesPage() {
  const [requests, setRequests] = useState<AccountChangeRequest[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [clearing, setClearing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccountChangeRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const { showSuccess, SuccessToast } = useSuccessToast();
  const { showError, ErrorToast } = useErrorToast();
  const { refreshNotifications } = useUnifiedNotification();

  usePageVisit("admin-account-changes");

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/account-change/admin?status=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('获取申请列表失败');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setStatistics(data.statistics || null);
    } catch (error) {
      showError({ 
        title: '加载失败', 
        message: error instanceof Error ? error.message : '获取申请列表失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  // 删除单条申请（仅管理员）
  const deleteRequest = async (requestId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/account-change/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      showSuccess({ title: '删除成功', message: '已删除该申请' });
      fetchRequests();
      refreshNotifications(true, { adminMessages: true });
    } catch (error) {
      showError({ title: '删除失败', message: error instanceof Error ? error.message : '删除失败' });
    } finally {
      setLoading(false);
    }
  };

  // 清空全部申请（仅超级管理员）
  const clearAllRequests = async () => {
    try {
      setClearing(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/account-change/admin?clearAll=true', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '清空失败');
      showSuccess({ title: '已清空', message: data.message || '所有申请已清空' });
      fetchRequests();
      refreshNotifications(true, { adminMessages: true });
    } catch (error) {
      showError({ title: '清空失败', message: error instanceof Error ? error.message : '清空失败' });
    } finally {
      setClearing(false);
    }
  };

  const handleReview = (request: AccountChangeRequest, action: 'approve' | 'reject') => {
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: reviewAction,
          reviewReason
        })
      });

      if (!response.ok) {
        throw new Error('审核失败');
      }

      const data = await response.json();
      
      showSuccess({ 
        title: '审核成功', 
        message: data.message 
      });
      
      setShowReviewDialog(false);
      setSelectedRequest(null);
      fetchRequests(); // 刷新列表
      refreshNotifications(true, { adminMessages: true });
      
    } catch (error) {
      showError({ 
        title: '审核失败', 
        message: error instanceof Error ? error.message : '审核操作失败' 
      });
    } finally {
      setReviewing(false);
    }
  };

  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">账号变更申请管理</h1>
            <p className="text-gray-500 mt-2">审核用户的邮箱和手机号变更申请</p>
          </div>

          {/* 统计卡片 */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">总申请数</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl">⏳</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">待审核</p>
                    <p className="text-2xl font-bold text-yellow-600">{statistics.pending}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl">✅</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">已通过</p>
                    <p className="text-2xl font-bold text-green-600">{statistics.approved}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl">❌</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">已拒绝</p>
                    <p className="text-2xl font-bold text-red-600">{statistics.rejected}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 过滤器 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">筛选申请</h2>
              <div className="flex items-center space-x-4">
                <AppleSelect
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: '全部申请' },
                    { value: 'pending', label: '待审核' },
                    { value: 'approved', label: '已通过' },
                    { value: 'rejected', label: '已拒绝' }
                  ]}
                />
                <AppleButton
                  onClick={fetchRequests}
                  isLoading={loading}
                  size="sm"
                >
                  刷新
                </AppleButton>
                <AppleButton
                  onClick={clearAllRequests}
                  isLoading={clearing}
                  size="sm"
                  variant="destructive"
                >
                  清空全部
                </AppleButton>
              </div>
            </div>
          </div>

          {/* 申请列表 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">申请列表</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                <span className="ml-3 text-gray-600">加载中...</span>
              </div>
            ) : requests.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {requests.map((request) => (
                  <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl">
                            {request.changeType === 'email' ? '📧' : request.changeType === 'phone' ? '📱' : '📝'}
                          </span>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {request.user.name} 申请修改{request.changeType === 'email' ? '邮箱' : request.changeType === 'phone' ? '手机号' : '姓名'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {getAccountTypeLabel(request.user.accountType)} • {getCreatedByTypeLabel(request.user.createdByType)}
                            </p>
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
                          {request.processedAt && (
                            <span>处理时间：{new Date(request.processedAt).toLocaleString('zh-CN')}</span>
                          )}
                          {request.reviewer && (
                            <span>审核人：{request.reviewer.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 ${getStatusColor(request.status)} bg-white`}>{getStatusLabel(request.status)}</span>
                        {request.status === 'pending' && (
                          <>
                            <AppleButton size="sm" variant="primary" onClick={() => handleReview(request, 'approve')}>通过</AppleButton>
                            <AppleButton size="sm" variant="destructive" onClick={() => handleReview(request, 'reject')}>拒绝</AppleButton>
                          </>
                        )}
                        <AppleButton size="sm" variant="secondary" onClick={() => deleteRequest(request.id)}>删除</AppleButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">📋</span>
                </div>
                <p className="text-gray-500">暂无申请记录</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 审核对话框 */}
      {showReviewDialog && selectedRequest && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200/50 w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900">
                {reviewAction === 'approve' ? '通过申请' : '拒绝申请'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedRequest.user.name} 的{selectedRequest.changeType === 'email' ? '邮箱' : selectedRequest.changeType === 'phone' ? '手机号' : '姓名'}变更申请
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">变更内容</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm">
                    {selectedRequest.currentValue} → {selectedRequest.newValue}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  审核备注 {reviewAction === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <AppleTextarea
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder={
                    reviewAction === 'approve' 
                      ? '请输入审核备注（可选）' 
                      : '请说明拒绝理由'
                  }
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <AppleButton
                  variant="secondary"
                  onClick={() => setShowReviewDialog(false)}
                  disabled={reviewing}
                  className="flex-1"
                >
                  取消
                </AppleButton>
                <AppleButton
                  variant={reviewAction === 'approve' ? 'primary' : 'destructive'}
                  onClick={submitReview}
                  isLoading={reviewing}
                  className="flex-1"
                >
                  确认{reviewAction === 'approve' ? '通过' : '拒绝'}
                </AppleButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <SuccessToast />
      <ErrorToast />
    </div>
  );
}
