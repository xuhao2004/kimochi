'use client';

import React, { useEffect, useState } from 'react';

interface AppleConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export default function AppleConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  isLoading = false
}: AppleConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, isLoading]);

  if (!isVisible) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500 ease-in-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleBackdropClick}
    >
      {/* 背景遮罩 - 苹果风格磨砂效果 */}
      <div 
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          isOpen ? 'backdrop-blur-md bg-black/20' : 'backdrop-blur-none bg-transparent'
        }`}
      />
      
      {/* 对话框容器 */}
      <div
        className={`relative transform ${
          isOpen 
            ? 'scale-100 translate-y-0 opacity-100' 
            : 'scale-90 translate-y-8 opacity-0'
        }`}
        style={{
          animation: isOpen 
            ? 'dialogBounceIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' 
            : 'dialogSlideOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards'
        }}
      >
        {/* 主对话框 - 苹果风格圆角卡片 */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-80 mx-4">
          {/* 标题区域 */}
          <div className="px-6 pt-6 pb-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>

          {/* 分割线 */}
          <div className="border-t border-gray-100" />

          {/* 按钮区域 */}
          <div className="flex">
            {/* 取消按钮 */}
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 text-center text-blue-500 font-medium transition-all duration-300 ease-out rounded-bl-2xl ${
                isLoading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-50 active:bg-blue-100 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {cancelText}
            </button>

            {/* 垂直分割线 */}
            <div className="w-px bg-gray-100" />

            {/* 确认按钮 */}
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 text-center font-semibold transition-all duration-300 ease-out rounded-br-2xl flex items-center justify-center space-x-2 ${
                variant === 'destructive'
                  ? isLoading
                    ? 'text-red-400 cursor-not-allowed'
                    : 'text-red-600 hover:bg-red-50 active:bg-red-100 hover:scale-[1.02] active:scale-95'
                  : isLoading
                    ? 'text-blue-400 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50 active:bg-blue-100 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isLoading && (
                <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin transition-all duration-300 ${
                  variant === 'destructive' ? 'border-red-400' : 'border-blue-400'
                }`} 
                style={{ 
                  animation: 'spin 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              )}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
