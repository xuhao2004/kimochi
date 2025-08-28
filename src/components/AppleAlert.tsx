'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

interface AlertContextType {
  showAlert: (options: {
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
  }) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (options: {
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
  }) => {
    setAlertState({
      isOpen: true,
      title: options.title,
      message: options.message,
      onConfirm: options.onConfirm,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      type: options.type || 'info'
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (alertState.onConfirm) {
      alertState.onConfirm();
    }
    hideAlert();
  };

  const getTypeStyles = () => {
    switch (alertState.type) {
      case 'error':
        return {
          background: 'bg-gradient-to-br from-red-50 to-red-100',
          icon: '❌',
          iconBg: 'bg-red-100 text-red-600',
          confirmBg: 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
        };
      case 'warning':
        return {
          background: 'bg-gradient-to-br from-orange-50 to-orange-100',
          icon: '⚠️',
          iconBg: 'bg-orange-100 text-orange-600',
          confirmBg: 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500'
        };
      case 'success':
        return {
          background: 'bg-gradient-to-br from-green-50 to-green-100',
          icon: '✅',
          iconBg: 'bg-green-100 text-green-600',
          confirmBg: 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
        };
      default:
        return {
          background: 'bg-gradient-to-br from-blue-50 to-blue-100',
          icon: 'ℹ️',
          iconBg: 'bg-blue-100 text-blue-600',
          confirmBg: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={hideAlert}
          />
          
          {/* 对话框 */}
          <div 
            className={`relative max-w-md w-full ${typeStyles.background} rounded-2xl shadow-2xl border border-white/50 overflow-hidden`}
            style={{
              animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* 头部 */}
            <div className="px-6 py-5 border-b border-white/30">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full ${typeStyles.iconBg} flex items-center justify-center text-xl`}>
                  {typeStyles.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {alertState.title}
                  </h3>
                </div>
              </div>
            </div>
            
            {/* 内容 */}
            <div className="px-6 py-5">
              <p className="text-gray-700 leading-relaxed">
                {alertState.message}
              </p>
            </div>
            
            {/* 底部按钮 */}
            <div className="px-6 py-4 bg-white/50 flex items-center justify-end space-x-3">
              {alertState.onConfirm && alertState.cancelText && (
                <button
                  onClick={hideAlert}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                >
                  {alertState.cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${typeStyles.confirmBg}`}
              >
                {alertState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </AlertContext.Provider>
  );
}

// 便捷函数
export const createAppleAlert = () => {
  let showAlertFunction: AlertContextType['showAlert'] | null = null;
  
  const setShowAlert = (fn: AlertContextType['showAlert']) => {
    showAlertFunction = fn;
  };
  
  const alert = (message: string, title: string = '提示') => {
    if (showAlertFunction) {
      showAlertFunction({
        title,
        message,
        type: 'info'
      });
    }
  };
  
  const confirm = (message: string, onConfirm: () => void, title: string = '确认') => {
    if (showAlertFunction) {
      showAlertFunction({
        title,
        message,
        onConfirm,
        confirmText: '确定',
        cancelText: '取消',
        type: 'warning'
      });
    }
  };
  
  const error = (message: string, title: string = '错误') => {
    if (showAlertFunction) {
      showAlertFunction({
        title,
        message,
        type: 'error'
      });
    }
  };
  
  const success = (message: string, title: string = '成功') => {
    if (showAlertFunction) {
      showAlertFunction({
        title,
        message,
        type: 'success'
      });
    }
  };
  
  return { alert, confirm, error, success, setShowAlert };
};
