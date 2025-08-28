'use client';

import React, { useState, useEffect } from 'react';
import AppleButton from './AppleButton';
import AppleInput from './AppleInput';
import AppleTextarea from './AppleTextarea';
import { useAlert } from './AppleAlert';

interface ViolationReason {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  onSuccess: () => void;
}

const categoryNames = {
  spam: '垃圾信息',
  inappropriate: '不当内容',
  harassment: '骚扰行为',
  fake: '虚假信息',
  other: '其他'
};

export default function ReportModal({ isOpen, onClose, postId, postTitle, onSuccess }: ReportModalProps) {
  const { showAlert } = useAlert();
  const [reasons, setReasons] = useState<ViolationReason[]>([]);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchViolationReasons();
    }
  }, [isOpen]);

  const fetchViolationReasons = async () => {
    try {
      setLoadingReasons(true);
      const response = await fetch('/api/violation-reasons');
      const data = await response.json();
      
      if (data.success) {
        setReasons(data.reasons);
      }
    } catch (error) {
      console.error('获取违规理由失败:', error);
    } finally {
      setLoadingReasons(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason && !customReason.trim()) {
      showAlert({
        title: '请填写举报理由',
        message: '请选择或填写举报理由',
        type: 'warning'
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          postId,
          reason: selectedReason || customReason.trim(),
          description: description.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        // 显示成功弹窗
        setNotification({ 
          type: 'success', 
          message: '举报已提交成功！我们会尽快处理您的举报，感谢您对社区环境的维护。' 
        });
        
        // 也触发全局成功提示（备用）
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: data.message || '举报已提交' }
        }));
        
        // 延迟关闭以让用户看到成功消息
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        setNotification({ 
          type: 'error', 
          message: data.error || '举报提交失败，请重试' 
        });
        
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: data.error || '举报失败' }
        }));
      }
    } catch (error) {
      console.error('举报失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '网络错误，请重试' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    setDescription('');
    setNotification(null);
    onClose();
  };

  if (!isOpen) return null;

  // 按分类分组理由
  const groupedReasons = reasons.reduce((acc, reason) => {
    if (!acc[reason.category]) {
      acc[reason.category] = [];
    }
    acc[reason.category].push(reason);
    return acc;
  }, {} as Record<string, ViolationReason[]>);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 背景遮罩 - 苹果风格磨砂效果 */}
      <div 
        className="absolute inset-0 backdrop-blur-md bg-black/20 transition-all duration-300"
        onClick={handleClose} 
      />
      
      {/* 模态框容器 */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-lg max-h-[90vh] overflow-hidden" style={{ animation: 'dialogBounceIn 0.36s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        {/* 通知提示 */}
        {notification && (
          <div className={`absolute top-4 left-4 right-4 z-50 p-4 rounded-2xl border ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          } transition-all duration-300`}>
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {notification.type === 'success' ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-relaxed">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className={`flex-shrink-0 p-1 rounded-full hover:bg-opacity-20 transition-colors ${
                  notification.type === 'success' ? 'hover:bg-green-600' : 'hover:bg-red-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">举报帖子</h2>
            <p className="text-sm text-gray-500 mt-1">帮助我们维护社区环境</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 hover:bg-gray-100/80 rounded-full transition-all duration-200 active:scale-95"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 滚动内容区域 */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {/* 被举报帖子信息 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200/50 rounded-2xl">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-full">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.86-.833-2.64 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-orange-800">举报的帖子</p>
            </div>
            <p className="text-sm text-gray-700 bg-white/60 p-3 rounded-xl border border-white/40 line-clamp-2">
              {postTitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 举报理由选择 */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-4">
                选择举报理由 <span className="text-red-500">*</span>
              </label>
              
              {loadingReasons ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-sm text-gray-600">加载理由列表...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedReasons).map(([category, categoryReasons]) => (
                    <div key={category} className="bg-gray-50/50 rounded-2xl p-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>{categoryNames[category as keyof typeof categoryNames] || category}</span>
                      </h4>
                      <div className="space-y-2">
                        {categoryReasons.map((reason) => (
                          <label
                            key={reason.id}
                            className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                              selectedReason === reason.name
                                ? 'border-blue-500 bg-blue-50/80 shadow-sm'
                                : 'border-gray-200/60 hover:border-blue-300/60 hover:bg-blue-50/30'
                            }`}
                          >
                            <input
                              type="radio"
                              name="reason"
                              value={reason.name}
                              checked={selectedReason === reason.name}
                              onChange={(e) => {
                                setSelectedReason(e.target.value);
                                setCustomReason('');
                              }}
                              className="sr-only"
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm mb-1">
                                {reason.name}
                              </div>
                              {reason.description && (
                                <div className="text-xs text-gray-600 leading-relaxed">
                                  {reason.description}
                                </div>
                              )}
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ml-3 transition-all duration-200 ${
                              selectedReason === reason.name 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-gray-300 group-hover:border-blue-400'
                            }`}>
                              {selectedReason === reason.name && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* 自定义理由 */}
                  <div className="bg-gray-50/50 rounded-2xl p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                      <span>自定义理由</span>
                    </h4>
                    <AppleInput
                      value={customReason}
                      onChange={(e) => {
                        setCustomReason(e.target.value);
                        if (e.target.value.trim()) {
                          setSelectedReason('');
                        }
                      }}
                      placeholder="请描述具体的违规行为..."
                      maxLength={100}
                      className="w-full"
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 详细描述 - 可选 */}
            <div>
              <AppleTextarea
                label="补充说明（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="如需补充具体情况，请在此详细描述违规行为..."
                rows={4}
                maxLength={500}
                helperText="补充说明为可选项，如果预设理由已足够清晰可不填写"
              />
            </div>
          </form>
        </div>

        {/* 底部按钮区域 */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="flex space-x-3">
            <AppleButton
              variant="ghost"
              size="lg"
              fullWidth
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </AppleButton>
            <AppleButton
              variant="destructive"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={loading || (!selectedReason && !customReason.trim()) || loadingReasons}
              isLoading={loading}
              loadingText="提交中..."
            >
              提交举报
            </AppleButton>
          </div>

          {/* 温馨提示 */}
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl">
            <div className="flex items-start space-x-3">
              <div className="p-1.5 bg-amber-100 rounded-full mt-0.5">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">温馨提示：</span>
                  我们会认真对待每一个举报，请选择合适的举报理由。如预设理由无法准确描述问题，可填写自定义理由或补充说明。恶意举报可能会影响您的账户信誉。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
