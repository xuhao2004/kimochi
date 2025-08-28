"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
}

export default function AccessDenied({
  title = "权限不足",
  message = "抱歉，您没有权限访问此页面",
  showHomeButton = true,
  showBackButton = true
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        {/* 权限图标 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-6 shadow-sm border border-red-200/50">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v3m0-3h3m-3 0h-3m-3-9a9 9 0 1118 0 9 9 0 01-18 0zm0 0a9 9 0 0118 0v0a9 9 0 01-18 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          {/* 403状态码 */}
          <div className="text-6xl font-bold text-gray-300 mb-2">403</div>
        </div>

        {/* 标题和描述 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
        
        {/* 详细说明 */}
        <div className="bg-blue-50/50 border border-blue-200/50 rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">可能的原因：</h3>
          <ul className="text-sm text-blue-700 space-y-2 text-left">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              您的账户权限级别不足
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              会话已过期，请重新登录
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              访问的页面需要特殊权限
            </li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-100/80 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium"
            >
              返回上页
            </button>
          )}
          {showHomeButton && (
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium shadow-lg shadow-blue-500/25"
            >
              返回首页
            </button>
          )}
        </div>

        {/* 联系信息 */}
        <div className="mt-8 text-xs text-gray-500">
          如需帮助，请联系系统管理员
        </div>
      </div>
    </div>
  );
}

// 专门用于管理员权限的组件
export function AdminAccessDenied() {
  return (
    <AccessDenied
      title="需要管理员权限"
      message="此页面仅限管理员访问，请使用管理员账户登录"
    />
  );
}

// 专门用于超级管理员权限的组件
export function SuperAdminAccessDenied() {
  return (
    <AccessDenied
      title="需要高级管理员权限"
      message="此页面仅限高级管理员访问，请联系系统管理员获取权限"
    />
  );
}
