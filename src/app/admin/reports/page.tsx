'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppleButton from '@/components/AppleButton';
import AppleSelect from '@/components/AppleSelect';
import AppleTextarea from '@/components/AppleTextarea';
import SuccessToast from '@/components/SuccessToast';
import ErrorToast from '@/components/ErrorToast';

// 账户类型映射函数
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

interface Report {
  id: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  post: {
    id: string;
    title: string;
    content: string;
    isDeleted: boolean;
    user: {
      id: string;
      name: string;
      nickname: string;
      accountType: string;
    };
  };
  reporter: {
    id: string;
    name: string;
    nickname: string;
    accountType: string;
  };
  reviewer?: {
    id: string;
    name: string;
    nickname: string;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'resolved', label: '已处理' },
  { value: 'dismissed', label: '已驳回' },
  { value: 'all', label: '全部' }
];

const statusColors = {
  pending: 'bg-orange-100 text-orange-800 border-orange-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  dismissed: 'bg-gray-100 text-gray-800 border-gray-200'
};

const statusLabels = {
  pending: '待处理',
  resolved: '已处理',
  dismissed: '已驳回'
};

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processingAction, setProcessingAction] = useState<'resolve' | 'dismiss' | null>(null);
  const [successToast, setSuccessToast] = useState<{isOpen: boolean, title: string, message?: string}>({isOpen: false, title: '', message: ''});
  const [errorToast, setErrorToast] = useState<{isOpen: boolean, title: string, message?: string}>({isOpen: false, title: '', message: ''});

  useEffect(() => {
    fetchReports();
  }, [selectedStatus, pagination.page]);

  // 监听来自通知的参数
  useEffect(() => {
    const reportId = searchParams.get('reportId');
    const postId = searchParams.get('postId');
    
    if (reportId) {
      // 如果有reportId参数，直接打开该举报的详情
      fetchReportDetail(reportId);
    } else if (postId) {
      // 如果有postId参数，找到并显示相关的举报
      fetchReportsByPostId(postId);
    }
    
    // 设置状态过滤器（从URL参数）
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl && statusFromUrl !== selectedStatus) {
      setSelectedStatus(statusFromUrl);
    }
  }, [searchParams]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/reports?status=${selectedStatus}&page=${pagination.page}&limit=${pagination.limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports);
        setPagination(data.pagination);
      } else {
        setErrorToast({ isOpen: true, title: '获取失败', message: data.error || '获取举报列表失败' });
      }
    } catch (error) {
      console.error('获取举报列表失败:', error);
      setErrorToast({ isOpen: true, title: '网络错误', message: '网络错误，请重试' });
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetail = async (reportId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${reportId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSelectedReport(data.report);
      } else {
        setErrorToast({ isOpen: true, title: '获取失败', message: data.error || '获取举报详情失败' });
      }
    } catch (error) {
      console.error('获取举报详情失败:', error);
      setErrorToast({ isOpen: true, title: '网络错误', message: '网络错误，请重试' });
    }
  };

  const fetchReportsByPostId = async (postId: string) => {
    try {
      const token = localStorage.getItem('token');
      // 获取与特定帖子相关的举报
      const response = await fetch(
        `/api/reports?status=${selectedStatus}&page=1&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        // 过滤出与指定帖子相关的举报
        const relatedReports = data.reports.filter((report: Report) => report.post.id === postId);
        
        if (relatedReports.length > 0) {
          // 如果找到相关举报，显示第一个
          setSelectedReport(relatedReports[0]);
          // 同时更新列表显示相关举报
          setReports(relatedReports);
          setPagination({
            total: relatedReports.length,
            page: 1,
            limit: 100,
            totalPages: 1
          });
                     } else {
               setErrorToast({ isOpen: true, title: '未找到', message: '未找到相关举报' });
             }
           } else {
             setErrorToast({ isOpen: true, title: '获取失败', message: data.error || '获取举报列表失败' });
           }
         } catch (error) {
           console.error('获取举报列表失败:', error);
           setErrorToast({ isOpen: true, title: '网络错误', message: '网络错误，请重试' });
    }
  };

  const handleReportAction = async (action: 'resolve' | 'dismiss') => {
    if (!selectedReport) return;

    try {
      setProcessingAction(action);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          reviewNote: reviewNote.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const successTitle = action === 'resolve' ? '举报处理成功' : '举报驳回成功';
        const successMessage = action === 'resolve' 
          ? '确认违规帖子已删除，相关用户已收到通知。' 
          : '经审核该内容未发现问题，举报者已收到通知。';
          
        setSuccessToast({ 
          isOpen: true, 
          title: successTitle,
          message: successMessage
        });
        
        // 刷新列表和关闭详情
        setSelectedReport(null);
        setReviewNote('');
        fetchReports();
        
        // 触发通知刷新事件
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
        
        // 显示全局成功提示
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { 
            message: action === 'resolve' ? '举报已处理，帖子已删除' : '举报已驳回'
          }
        }));
        
      } else {
        setErrorToast({ isOpen: true, title: '处理失败', message: data.error || '处理失败，请重试' });
      }
    } catch (error) {
      console.error('处理举报失败:', error);
      setErrorToast({ isOpen: true, title: '网络错误', message: '网络错误，请重试' });
    } finally {
      setProcessingAction(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // 更新URL参数但不刷新页面
    const newParams = new URLSearchParams(searchParams);
    newParams.set('status', status);
    newParams.delete('reportId'); // 清除reportId参数
    router.replace(`/admin/reports?${newParams.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      {/* 成功提示 */}
      <SuccessToast
        isOpen={successToast.isOpen}
        title={successToast.title}
        message={successToast.message}
        onClose={() => setSuccessToast({isOpen: false, title: '', message: ''})}
      />

      {/* 错误提示 */}
      <ErrorToast
        isOpen={errorToast.isOpen}
        title={errorToast.title}
        message={errorToast.message}
        onClose={() => setErrorToast({isOpen: false, title: '', message: ''})}
      />

      <div className="min-h-[calc(100dvh-var(--nav-offset))] flex flex-col">
        {/* 页面标题 - 固定 */}
        <div className="flex-shrink-0 px-4 py-8 border-b border-black/[0.08] bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">举报管理</h1>
            <p className="text-gray-600">管理和处理用户举报的内容</p>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <AppleSelect
                label="状态筛选"
                value={selectedStatus}
                onChange={(value) => handleStatusChange(value)}
                options={statusOptions}
                className="w-48"
              />
              
              <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-xl">
                共 {pagination.total} 条举报
              </div>
            </div>

            <AppleButton
              variant="ghost"
              onClick={() => fetchReports()}
              disabled={loading}
            >
              刷新列表
            </AppleButton>
            </div>
          </div>
        </div>

        {/* 主要内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto apple-scrollbar touch-scroll">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* 举报列表 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">加载中...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">暂无举报记录</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-6 hover:bg-gray-50/50 transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[report.status]}`}>
                          {statusLabels[report.status]}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(report.createdAt)}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                        被举报帖子：{report.post.title}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">举报理由：</span>
                          {report.reason}
                        </div>
                        <div>
                          <span className="font-medium">举报人：</span>
                          {report.reporter.nickname || report.reporter.name}
                          <span className="ml-1 text-xs text-gray-400">
                            ({report.reporter.accountType === 'student' ? '学生' : 
                              report.reporter.accountType === 'teacher' ? '教师' : '其他'})
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">被举报人：</span>
                          {report.post.user.nickname || report.post.user.name}
                          <span className="ml-1 text-xs text-gray-400">
                            ({report.post.user.accountType === 'student' ? '学生' : 
                              report.post.user.accountType === 'teacher' ? '教师' : '其他'})
                          </span>
                        </div>
                        {report.reviewer && (
                          <div>
                            <span className="font-medium">处理人：</span>
                            {report.reviewer.nickname || report.reviewer.name}
                          </div>
                        )}
                      </div>
                      
                      {report.description && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">补充说明：</span>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{report.description}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  第 {pagination.page} 页，共 {pagination.totalPages} 页
                </div>
                <div className="flex space-x-2">
                  <AppleButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1 || loading}
                  >
                    上一页
                  </AppleButton>
                  <AppleButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages || loading}
                  >
                    下一页
                  </AppleButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 举报详情模态框 */}
      {selectedReport && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 backdrop-blur-md bg-black/20 transition-all duration-300"
            onClick={() => setSelectedReport(null)} 
          />
          
          {/* 模态框容器 */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">举报详情</h2>
                <p className="text-sm text-gray-500 mt-1">审核和处理举报内容</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2.5 hover:bg-gray-100/80 rounded-full transition-all duration-200 active:scale-95"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 滚动内容区域 */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
              <div className="space-y-6">
                {/* 举报信息 */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50 rounded-2xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">举报信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">举报时间：</span>
                      <p className="text-gray-600">{formatDate(selectedReport.createdAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">举报理由：</span>
                      <p className="text-gray-600">{selectedReport.reason}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">举报人：</span>
                      <p className="text-gray-600">
                        {selectedReport.reporter.nickname || selectedReport.reporter.name}
                        <span className="ml-1 text-xs text-gray-400">
                          ({selectedReport.reporter.accountType === 'student' ? '学生' : 
                            selectedReport.reporter.accountType === 'teacher' ? '教师' : '其他'})
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">当前状态：</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${statusColors[selectedReport.status]}`}>
                        {statusLabels[selectedReport.status]}
                      </span>
                    </div>
                    {selectedReport.description && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">补充说明：</span>
                        <p className="text-gray-600 mt-1 p-3 bg-white/60 rounded-xl border border-white/40">
                          {selectedReport.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 被举报内容 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">被举报内容</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="font-medium text-gray-700">帖子标题：</span>
                      <p className="text-gray-900 mt-1 font-medium">{selectedReport.post.title}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">帖子内容：</span>
                      <div className="mt-2 p-4 bg-white/60 rounded-xl border border-white/40 max-h-40 overflow-y-auto">
                        <p className="text-gray-600 whitespace-pre-wrap">{selectedReport.post.content}</p>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">作者：</span>
                      <p className="text-gray-600">
                        {selectedReport.post.user.nickname || selectedReport.post.user.name}
                        <span className="ml-1 text-xs text-gray-400">
                          ({getAccountTypeLabel(selectedReport.post.user.accountType)})
                        </span>
                      </p>
                    </div>
                    {selectedReport.post.isDeleted && (
                      <div className="p-3 bg-red-100 border border-red-200 rounded-xl">
                        <p className="text-red-700 text-sm font-medium">⚠️ 此帖子已被删除</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 审核记录 */}
                {selectedReport.status !== 'pending' && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">审核记录</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">处理时间：</span>
                        <p className="text-gray-600">{selectedReport.reviewedAt && formatDate(selectedReport.reviewedAt)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">处理人：</span>
                        <p className="text-gray-600">{selectedReport.reviewer?.nickname || selectedReport.reviewer?.name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">处理结果：</span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${statusColors[selectedReport.status]}`}>
                          {statusLabels[selectedReport.status]}
                        </span>
                      </div>
                      {selectedReport.reviewNote && (
                        <div>
                          <span className="font-medium text-gray-700">处理备注：</span>
                          <p className="text-gray-600 mt-1 p-3 bg-white/60 rounded-xl border border-white/40">
                            {selectedReport.reviewNote}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 处理操作 */}
                {selectedReport.status === 'pending' && (
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 rounded-2xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">处理操作</h3>
                    <div className="space-y-4">
                      <AppleTextarea
                        label="处理备注（可选）"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="请填写处理原因或备注信息..."
                        rows={3}
                        maxLength={500}
                      />
                      <div className="flex space-x-3">
                        <AppleButton
                          variant="destructive"
                          onClick={() => handleReportAction('resolve')}
                          disabled={!!processingAction}
                          isLoading={processingAction === 'resolve'}
                          loadingText="处理中..."
                          className="flex-1"
                        >
                          确认违规并删除帖子
                        </AppleButton>
                        <AppleButton
                          variant="secondary"
                          onClick={() => handleReportAction('dismiss')}
                          disabled={!!processingAction}
                          isLoading={processingAction === 'dismiss'}
                          loadingText="处理中..."
                          className="flex-1"
                        >
                          驳回举报
                        </AppleButton>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[100dvh]" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="text-lg text-gray-600">加载中...</div>
    </div>}>
      <ReportsPageContent />
    </Suspense>
  );
}
