"use client";

import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  details?: string[];
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  type = 'warning',
  details = [],
  isLoading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '🚨',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-500 hover:bg-red-600',
          borderColor: 'border-red-200'
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          confirmBg: 'bg-amber-500 hover:bg-amber-600',
          borderColor: 'border-amber-200'
        };
      default:
        return {
          icon: 'ℹ️',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBg: 'bg-blue-500 hover:bg-blue-600',
          borderColor: 'border-blue-200'
        };
    }
  };

  const { icon, iconBg, iconColor, confirmBg, borderColor } = getIconAndColor();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* 对话框 */}
      <div className="relative w-full max-w-md" style={{ animation: 'dialogBounceIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-black/[0.05] overflow-hidden transition-all duration-300 transform scale-100 opacity-100">
          
          {/* 头部图标 */}
          <div className="px-8 pt-8 pb-4 text-center border-b border-black/[0.05]">
            <div className={`inline-flex items-center justify-center w-16 h-16 ${iconBg} rounded-full mb-4 shadow-sm border border-black/[0.05]`}>
              {type === 'danger' ? (
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ) : type === 'warning' ? (
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {title}
            </h2>
            
            <p className="text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>

          {/* 详细信息 */}
          {details.length > 0 && (
            <div className="px-8 py-4">
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-black/[0.05]">
                <p className="text-sm font-medium text-gray-900 mb-3">操作详情：</p>
                <ul className="text-sm text-gray-700 space-y-2">
                  {details.map((detail, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 按钮区域 */}
          <div className="px-8 pb-8">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 rounded-xl bg-gray-100/80 text-gray-700 py-3 hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 rounded-xl ${confirmBg} text-white py-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                  type === 'danger' ? 'shadow-red-500/25' : type === 'warning' ? 'shadow-amber-500/25' : 'shadow-blue-500/25'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>处理中...</span>
                  </>
                ) : (
                  <span>{confirmText}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using confirm dialog
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    details?: string[];
    onConfirm?: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const [isLoading, setIsLoading] = React.useState(false);

  const showConfirm = React.useCallback((options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    details?: string[];
    onConfirm: () => void | Promise<void>;
  }) => {
    setDialogState({
      isOpen: true,
      ...options
    });
  }, []);

  const hideConfirm = React.useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    setIsLoading(false);
  }, []);

  const handleConfirm = React.useCallback(async () => {
    if (dialogState.onConfirm) {
      setIsLoading(true);
      try {
        await dialogState.onConfirm();
        hideConfirm();
      } catch (error) {
        console.error('确认操作失败:', error);
        setIsLoading(false);
      }
    }
  }, [dialogState.onConfirm, hideConfirm]);

  const ConfirmDialogComponent = React.useCallback(() => (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      onClose={hideConfirm}
      onConfirm={handleConfirm}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      type={dialogState.type}
      details={dialogState.details}
      isLoading={isLoading}
    />
  ), [dialogState, hideConfirm, handleConfirm, isLoading]);

  return {
    showConfirm,
    ConfirmDialog: ConfirmDialogComponent
  };
}
