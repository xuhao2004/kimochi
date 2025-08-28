'use client';

import React, { forwardRef } from 'react';

interface AppleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const AppleButton = forwardRef<HTMLButtonElement, AppleButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading;

  // 基础样式
  const baseStyles = `
    inline-flex items-center justify-center font-medium rounded-2xl
    apple-transition focus:outline-none focus:ring-3
    ${fullWidth ? 'w-full' : ''}
    ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer apple-button-hover'}
  `;

  // 尺寸样式
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm gap-1.5',
    md: 'px-4 py-3 text-sm gap-2',
    lg: 'px-6 py-4 text-base gap-2.5',
    xl: 'px-8 py-5 text-lg gap-3'
  }[size];

  // 变体样式
  const variantStyles = {
    primary: `
      bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg
      ${isDisabled 
        ? 'opacity-50' 
        : 'hover:from-blue-600 hover:to-indigo-600 hover:shadow-xl'
      }
      focus:ring-blue-500/50
    `,
    secondary: `
      bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 shadow-sm
      ${isDisabled 
        ? 'opacity-50' 
        : 'hover:from-gray-200 hover:to-gray-300 hover:shadow-md'
      }
      focus:ring-gray-500/50
    `,
    destructive: `
      bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg
      ${isDisabled 
        ? 'opacity-50' 
        : 'hover:from-red-600 hover:to-red-700 hover:shadow-xl'
      }
      focus:ring-red-500/50
    `,
    ghost: `
      bg-transparent text-gray-600
      ${isDisabled 
        ? 'opacity-50' 
        : 'hover:bg-gray-100/80 hover:text-gray-800 active:bg-gray-200/80'
      }
      focus:ring-gray-500/30
    `,
    outline: `
      bg-transparent border-2 border-gray-300 text-gray-700
      ${isDisabled 
        ? 'opacity-50 border-gray-200' 
        : 'hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100'
      }
      focus:ring-gray-500/30
    `
  }[variant];

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {/* 左侧图标或加载动画 */}
      {isLoading ? (
        <div className={`border-2 border-current border-t-transparent rounded-full animate-spin ${
          size === 'sm' ? 'w-3 h-3' : 
          size === 'md' ? 'w-4 h-4' : 
          size === 'lg' ? 'w-5 h-5' : 'w-6 h-6'
        }`} />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}

      {/* 按钮文本 */}
      <span className="truncate">
        {isLoading && loadingText ? loadingText : children}
      </span>

      {/* 右侧图标（仅在非加载状态下显示） */}
      {!isLoading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
});

AppleButton.displayName = 'AppleButton';

export default AppleButton;
