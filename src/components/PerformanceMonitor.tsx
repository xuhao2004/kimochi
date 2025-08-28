'use client';

import React, { useState, useEffect } from 'react';
import { usePageVisibility } from '@/hooks/usePageVisibility';

interface PerformanceStats {
  totalRequests: number;
  savedRequests: number;
  lastRequestTime: number;
  pageVisibilityChanges: number;
  userActivityChanges: number;
  connectionType: string;
}

/**
 * 性能监控看板 - 苹果风格
 * 仅在开发环境显示，帮助开发者了解优化效果
 */
export default function PerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats>({
    totalRequests: 0,
    savedRequests: 0,
    lastRequestTime: 0,
    pageVisibilityChanges: 0,
    userActivityChanges: 0,
    connectionType: 'unknown'
  });
  
  const [isVisible, setIsVisible] = useState(false);
  const [startTime] = useState(Date.now());
  const isPageVisible = usePageVisibility();

  // 仅在开发环境显示
  useEffect(() => {
    setIsVisible(process.env.NODE_ENV === 'development');
  }, []);

  // 监听页面可见性变化
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      pageVisibilityChanges: prev.pageVisibilityChanges + 1
    }));
  }, [isPageVisible]);

  // 监听网络状态
  useEffect(() => {
    const updateConnectionType = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        setStats(prev => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown'
        }));
      }
    };

    updateConnectionType();
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateConnectionType);
      return () => connection.removeEventListener('change', updateConnectionType);
    }
  }, []);

  // 监听全局事件来统计请求
  useEffect(() => {
    const handleRequest = (event: CustomEvent) => {
      setStats(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        lastRequestTime: Date.now()
      }));
    };

    const handleSkippedRequest = (event: CustomEvent) => {
      setStats(prev => ({
        ...prev,
        savedRequests: prev.savedRequests + 1
      }));
    };

    window.addEventListener('performance_request' as any, handleRequest);
    window.addEventListener('performance_skipped' as any, handleSkippedRequest);

    return () => {
      window.removeEventListener('performance_request' as any, handleRequest);
      window.removeEventListener('performance_skipped' as any, handleSkippedRequest);
    };
  }, []);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '未知';
    const seconds = Math.round((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟前`;
    return `${Math.round(seconds / 3600)}小时前`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    return `${Math.round(seconds / 3600)}小时`;
  };

  const getSavingsPercentage = () => {
    const total = stats.totalRequests + stats.savedRequests;
    if (total === 0) return 0;
    return Math.round((stats.savedRequests / total) * 100);
  };

  const getConnectionColor = (type: string) => {
    switch (type) {
      case '4g': return 'text-green-600 bg-green-100';
      case '3g': return 'text-yellow-600 bg-yellow-100';
      case '2g':
      case 'slow-2g': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl p-4 min-w-[280px] max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            ⚡ 性能监控
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {/* 页面状态 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">页面状态</span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              isPageVisible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isPageVisible ? '🟢 活跃' : '🔴 静默'}
            </span>
          </div>

          {/* 网络状态 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">网络</span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              getConnectionColor(stats.connectionType)
            }`}>
              📶 {stats.connectionType.toUpperCase()}
            </span>
          </div>

          {/* 请求统计 */}
          <div className="border-t border-gray-200 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{stats.totalRequests}</div>
                <div className="text-xs text-gray-600">实际请求</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{stats.savedRequests}</div>
                <div className="text-xs text-gray-600">节省请求</div>
              </div>
            </div>
            
            <div className="mt-2 text-center">
              <div className="text-sm font-medium text-gray-900">
                节省 {getSavingsPercentage()}% 的请求
              </div>
            </div>
          </div>

          {/* 时间信息 */}
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">运行时长</span>
              <span className="text-xs font-medium">
                {formatDuration(Date.now() - startTime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">最后请求</span>
              <span className="text-xs font-medium">
                {formatTime(stats.lastRequestTime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">页面切换</span>
              <span className="text-xs font-medium">
                {stats.pageVisibilityChanges} 次
              </span>
            </div>
          </div>

          {/* 优化建议 */}
          {getSavingsPercentage() < 20 && (
            <div className="border-t border-gray-200 pt-3">
              <div className="bg-yellow-50 rounded-lg p-2">
                <div className="text-xs font-medium text-yellow-800 mb-1">💡 优化建议</div>
                <div className="text-xs text-yellow-700">
                  {isPageVisible ? 
                    '当前页面活跃，考虑切换到后台测试优化效果' : 
                    '静默模式优化生效中，请求频率已降低'
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 性能监控工具函数
 */
export const performanceTracker = {
  // 记录请求
  recordRequest: () => {
    if (process.env.NODE_ENV === 'development') {
      window.dispatchEvent(new CustomEvent('performance_request'));
    }
  },
  
  // 记录跳过的请求
  recordSkippedRequest: (reason: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚫 跳过请求: ${reason}`);
      window.dispatchEvent(new CustomEvent('performance_skipped', { detail: reason }));
    }
  },
  
  // 记录优化事件
  recordOptimization: (type: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ 性能优化: ${type}`, data);
    }
  }
};
