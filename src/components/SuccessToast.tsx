"use client";

import React, { useEffect } from 'react';

interface SuccessToastProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  duration?: number;
}

export default function SuccessToast({
  isOpen,
  onClose,
  title,
  message,
  duration = 3000
}: SuccessToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      
      {/* 成功提示卡片 */}
      <div className="relative pointer-events-auto">
        <div className="rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-black/[0.05] overflow-hidden transform transition-all duration-300 scale-100 opacity-100 animate-[slideUp_0.3s_ease-out]">
          
          {/* 内容 */}
          <div className="px-8 py-8 text-center">
            {/* 成功图标 */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 shadow-sm border border-green-200/50">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            
            {message && (
              <p className="text-gray-600 leading-relaxed max-w-sm">
                {message}
              </p>
            )}
          </div>

          {/* 进度条 */}
          {duration > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 ease-linear"
                style={{
                  animation: `shrink ${duration}ms linear forwards`
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Hook for using success toast
export function useSuccessToast() {
  const [toastState, setToastState] = React.useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    duration?: number;
  }>({
    isOpen: false,
    title: ''
  });

  const showSuccess = React.useCallback((options: {
    title: string;
    message?: string;
    duration?: number;
  }) => {
    setToastState({
      isOpen: true,
      ...options
    });
  }, []);

  const hideSuccess = React.useCallback(() => {
    setToastState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const SuccessToastComponent = React.useCallback(() => (
    <SuccessToast
      isOpen={toastState.isOpen}
      onClose={hideSuccess}
      title={toastState.title}
      message={toastState.message}
      duration={toastState.duration}
    />
  ), [toastState, hideSuccess]);

  return {
    showSuccess,
    SuccessToast: SuccessToastComponent
  };
}
