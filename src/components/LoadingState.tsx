"use client";

import React from 'react';

interface LoadingStateProps {
  /** 是否显示加载状态 */
  loading: boolean;
  /** 加载文本 */
  text?: string;
  /** 大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 类型 */
  type?: 'spinner' | 'dots' | 'pulse';
  /** 是否全屏显示 */
  fullScreen?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 子组件（加载时隐藏） */
  children?: React.ReactNode;
}

export default function LoadingState({
  loading,
  text = '加载中...',
  size = 'md',
  type = 'spinner',
  fullScreen = false,
  className = '',
  children
}: LoadingStateProps) {
  if (!loading && children) {
    return <>{children}</>;
  }

  if (!loading) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm'
    : 'flex items-center justify-center p-8';

  const renderSpinner = () => (
    <div className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin`} />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} bg-blue-500 rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`} />
  );

  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        <div className="mb-3">
          {renderLoader()}
        </div>
        {text && (
          <p className={`text-gray-600 ${textSizeClasses[size]}`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 页面级加载状态组件
 */
export function PageLoadingState({
  text = '页面加载中...',
  size = 'lg'
}: {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="text-center">
        <div className="mb-4">
          <div className={`${size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'} border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto`} />
        </div>
        <p className="text-gray-600 text-lg">{text}</p>
      </div>
    </div>
  );
}

/**
 * 卡片加载状态组件
 */
export function CardLoadingState({
  text = '加载中...',
  lines = 3
}: {
  text?: string;
  lines?: number;
}) {
  return (
    <div className="rounded-3xl border border-black/[0.08] bg-white/80 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgb(0,0,0,0.12)]">
      <div className="animate-pulse">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full mr-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded mb-2 last:mb-0" style={{ width: `${100 - i * 10}%` }}></div>
        ))}
      </div>
      {text && (
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500">{text}</p>
        </div>
      )}
    </div>
  );
}

/**
 * 列表加载状态组件
 */
export function ListLoadingState({
  count = 3,
  text = '加载中...'
}: {
  count?: number;
  text?: string;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardLoadingState key={i} text={i === 0 ? text : undefined} />
      ))}
    </div>
  );
}

/**
 * 按钮加载状态组件
 */
export function ButtonLoadingState({
  loading,
  children,
  text = '处理中...',
  disabled,
  className = '',
  ...props
}: {
  loading: boolean;
  children: React.ReactNode;
  text?: string;
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}) {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`relative ${className} ${loading ? 'cursor-not-allowed opacity-75' : ''}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          <span>{text}</span>
        </div>
      )}
      <div className={loading ? 'invisible' : 'visible'}>
        {children}
      </div>
    </button>
  );
}

/**
 * 错误状态组件
 */
export function ErrorState({
  title = '加载失败',
  message = '请稍后重试',
  onRetry,
  retryText = '重试',
  showRetry = true
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  showRetry?: boolean;
}) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">{message}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {retryText}
        </button>
      )}
    </div>
  );
}

/**
 * 空状态组件
 */
export function EmptyState({
  title = '暂无数据',
  message = '这里还没有任何内容',
  icon,
  action
}: {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const defaultIcon = (
    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
        {icon || defaultIcon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">{message}</p>
      {action}
    </div>
  );
}
