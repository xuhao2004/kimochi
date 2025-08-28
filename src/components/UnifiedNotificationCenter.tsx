"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { notificationUtils } from '@/lib/notificationUtils';
import { useUnifiedNotification } from '@/contexts/UnifiedNotificationContext';

interface SystemMessage {
  id: string;
  type: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  isProcessed?: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    nickname: string;
    accountType: string;
  };
  relatedPostId?: string;
  relatedCommentId?: string;
  source?: 'user_message' | 'admin_message';
  userId?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  roomId: string;
  roomName: string;
  senderName: string;
  isRead: boolean;
  createdAt: string;
}

interface FriendRequest {
  id: string;
  user: {
    id: string;
    name: string;
    nickname: string;
    profileImage: string;
    accountType: string;
  };
  createdAt: string;
}

interface NotificationCenterProps {
  token?: string;
  userType?: 'superAdmin' | 'admin' | 'teacher' | 'student' | 'self';
}

interface FilterOptions {
  severity: 'all' | 'low' | 'medium' | 'high' | 'critical';
  status: 'all' | 'unread' | 'read' | 'unprocessed' | 'processed';
  type: 'all' | 'system' | 'personal' | 'chat' | 'friends';
  timeRange: 'all' | 'today' | 'week' | 'month';
}

export default function UnifiedNotificationCenter({ token, userType }: NotificationCenterProps) {
  console.log('🔧 UnifiedNotificationCenter 初始化:', { token: token ? '有token' : '无token', userType });
  const [mounted, setMounted] = useState(false);
  
  // 使用统一的通知数据管理
  const {
    notificationData,
    totalUnreadCount,
    systemUnreadCount,
    chatUnreadCount,
    friendRequestCount,
    refreshNotifications,
    markMessageAsRead,
    isRefreshing
  } = useUnifiedNotification();
  
  // 从统一数据源获取数据
  const { systemMessages, chatMessages } = notificationData;
  
  // 调试信息
  React.useEffect(() => {
    console.log('🔍 小铃铛预览数据调试:', {
      总系统消息数: systemMessages.length,
      未读系统消息数: systemMessages.filter(m => !m.isRead).length,
      未读消息详情: systemMessages.filter(m => !m.isRead).map(m => ({
        id: m.id,
        title: m.title,
        type: m.type,
        source: m.source,
        isRead: m.isRead
      })),
      // 专门查找系统检查消息
      系统检查相关消息: systemMessages.filter(m => 
        m.title?.includes('系统健康检查') || 
        m.title?.includes('系统检查') || 
        m.type === 'system_error'
      ).map(m => ({
        id: m.id,
        title: m.title,
        type: m.type,
        source: m.source,
        isRead: m.isRead,
        content: m.content?.substring(0, 100) + '...'
      }))
    });
  }, [systemMessages]);
  
  // 悬浮和交互状态
  const [isHovering, setIsHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 过滤和视图状态
  const [filters, setFilters] = useState<FilterOptions>({
    severity: 'all',
    status: 'unread',
    type: 'all',
    timeRange: 'all'
  });
  
  // 引用
  const bellRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 当过滤器改变时刷新数据
  useEffect(() => {
    if (token) {
      refreshNotifications(false); // 非强制刷新，受防抖控制
    }
  }, [filters, token, refreshNotifications]);

  // 优化的悬停逻辑 - 避免误操作
  useEffect(() => {
    console.log('🔄 悬停逻辑 useEffect 触发:', { 
      isHovering, 
      totalUnreadCount, 
      showPreview,
      mounted 
    });

    // 清除之前的timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (isHovering && totalUnreadCount > 0 && mounted) {
      // 记录悬停开始时间
      const startTime = Date.now();
      
      console.log('⏰ 开始1.2秒倒计时显示预览');
      
      // 延长悬停时间至1.2秒，减少误操作
      hoverTimeoutRef.current = setTimeout(() => {
        console.log('✅ 1.2秒倒计时结束，显示预览窗口');
        // 确保用户真的持续悬停了足够时间
        if (Date.now() - startTime >= 1200) {
          setShowPreview(true);
        }
      }, 1200);
    } else {
      if (showPreview) {
        console.log('❌ 隐藏预览窗口');
      }
      setShowPreview(false);
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, [isHovering, totalUnreadCount, mounted, showPreview]);

  // 处理鼠标事件
  const handleMouseEnter = () => {
    console.log('🖱️ 鼠标进入铃铛按钮');
    setIsHovering(true);
  };

  const handleMouseLeave = (event: React.MouseEvent) => {
    console.log('🖱️ 鼠标离开铃铛按钮');
    // 检查是否移动到预览窗口
    const relatedTarget = event.relatedTarget as Element;
    if (
      (previewRef.current && previewRef.current.contains(relatedTarget)) ||
      (backdropRef.current && backdropRef.current.contains(relatedTarget))
    ) {
      console.log('🖱️ 移动到预览窗口，保持悬停状态');
      return;
    }
    setIsHovering(false);
  };

  const handlePreviewMouseLeave = (event: React.MouseEvent) => {
    const relatedTarget = event.relatedTarget as Element;
    
    // 如果鼠标移动到铃铛按钮，不立即关闭
    if (
      (bellRef.current && bellRef.current.contains(relatedTarget)) ||
      (backdropRef.current && backdropRef.current.contains(relatedTarget))
    ) {
      return;
    }
    
    // 清除悬停timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // 添加延迟关闭，防止用户意外移动鼠标导致窗口闪烁
    setTimeout(() => {
      setIsHovering(false);
      setShowPreview(false);
    }, 200);
  };

  // 包装统一数据管理的方法
  const handleMarkAsRead = async (messageId: string, source?: 'user_message' | 'admin_message') => {
    try {
      await markMessageAsRead(messageId, source);
      console.log('✅ 消息已读状态更新完成');
    } catch (error) {
      console.error('❌ 标记消息已读失败:', error);
    }
  };

  const getSeverityBadge = (priority: string) => {
    const severityMap = {
      urgent: { label: '紧急', className: 'bg-red-100 text-red-600 border-red-200' },
      high: { label: '高', className: 'bg-orange-100 text-orange-600 border-orange-200' },
      normal: { label: '中', className: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
      low: { label: '低', className: 'bg-blue-100 text-blue-600 border-blue-200' }
    };
    const severity = severityMap[priority as keyof typeof severityMap] || severityMap.normal;
    
    return (
      <span className={`px-2 py-0.5 text-xs rounded-md border font-medium ${severity.className}`}>
        {severity.label}
      </span>
    );
  };

  // 数据同步检查和调试信息
  console.log('🔍 统一通知中心数据同步检查:', {
    currentFilter: filters.status,
    totalMessages: systemMessages.length,
    系统消息未读_去重后: systemUnreadCount,
    好友请求数量: friendRequestCount,
    聊天未读: chatUnreadCount,
    全局总未读: totalUnreadCount,
    数据来源: '统一数据管理',
    isRefreshing
  });

  if (!token || !mounted) return null;

  return (
    <>
      {/* 铃铛按钮 */}
      <div className="relative">
        <button
          ref={bellRef}
          onClick={() => window.location.href = '/notification-center'}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`relative p-2.5 rounded-xl transition-all duration-300 group ${
            totalUnreadCount > 0
              ? 'text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 shadow-sm'
              : 'text-gray-600 hover:text-gray-700 bg-white/60 hover:bg-white/80 shadow-sm'
          } backdrop-blur-sm border border-white/20`}
          title="通知中心"
        >
          {/* 铃铛图标 */}
          <div className="relative">
            <svg 
              className={`w-6 h-6 transition-all duration-300 ${
                totalUnreadCount > 0 ? 'animate-pulse' : ''
              } group-hover:scale-110`} 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2C10.34 2 9 3.34 9 5V5.32C6.78 6.44 5.25 8.61 5.25 11.25V16L3 18.25V19H21V18.25L18.75 16V11.25C18.75 8.61 17.22 6.44 15 5.32V5C15 3.34 13.66 2 12 2Z"/>
              <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"/>
            </svg>
            
            {/* 动态波纹效果 */}
            {totalUnreadCount > 0 && (
              <>
                <div className="absolute -inset-2 border-2 border-blue-400 rounded-full animate-ping opacity-20" />
                <div className="absolute -inset-3 border-2 border-blue-300 rounded-full animate-ping opacity-10" style={{ animationDelay: '0.5s' }} />
              </>
            )}
          </div>
          
          {/* 未读数量徽章 */}
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-bounce">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
          
          {/* 刷新状态指示器 */}
          {isRefreshing && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse">
              <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
            </div>
          )}
        </button>

        {/* 侧边栏样式预览窗口 */}
        {mounted && showPreview && totalUnreadCount > 0 && typeof window !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start justify-end pointer-events-none">
            {/* 半透明背景遮罩 */}
            <div 
              ref={backdropRef}
              className="absolute inset-0 bg-black/10 backdrop-blur-sm pointer-events-auto"
              style={{
                animation: 'fadeIn 0.3s ease-out forwards'
              }}
              onClick={() => {
                setIsHovering(false);
                setShowPreview(false);
              }}
            />
            
            {/* 侧边栏预览面板 */}
            <div 
              ref={previewRef}
              className="relative w-full max-w-sm h-full bg-white/95 backdrop-blur-2xl shadow-2xl border-l border-gray-200/50 flex flex-col pointer-events-auto"
              style={{
                animation: 'slideInFromRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={handlePreviewMouseLeave}
            >
              {/* 侧边栏头部 */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-2xl border-b border-gray-200/50 p-6 z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">通知中心</h3>
                    <p className="text-sm text-gray-500 mt-1">预览最新消息</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                      {totalUnreadCount} 条未读
                    </span>
                    {isRefreshing && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
                
                {/* 快速跳转按钮 */}
                <button
                  onClick={() => window.location.href = '/notification-center'}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  查看全部通知 →
                </button>

                {/* 显著的查看好友申请按钮 */}
                <button
                  onClick={() => {
                    // 进入通知中心并打开好友申请视图
                    window.location.href = '/notification-center?openFriendRequests=true';
                    // 同时刷新统一通知，减少未读残留
                    window.dispatchEvent(new CustomEvent('refreshNotifications'));
                  }}
                  className="w-full mt-3 py-2 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-semibold shadow shadow-indigo-200 flex items-center justify-center"
                >
                  <span className="mr-2">🫱🏻‍🫲🏻</span> 查看好友申请
                  {friendRequestCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[11px] rounded-full font-bold">
                      {friendRequestCount > 99 ? '99+' : friendRequestCount}
                    </span>
                  )}
                </button>
              </div>
                
              <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
                <div className="space-y-3">
                  {/* 系统消息预览 */}
                  {systemMessages.filter(m => !m.isRead).slice(0, 3).map((message) => (
                    <div 
                      key={`preview-${message.source || 'user'}-${message.id}`} 
                      className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-200 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        handleMarkAsRead(message.id, message.source);
                        setShowPreview(false);
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {notificationUtils.getTypeDisplay(message.type).icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {message.title}
                          </p>
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {message.content}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            {getSeverityBadge(message.priority)}
                            <span className="text-xs text-gray-400">
                              {new Date(message.createdAt).toLocaleTimeString('zh-CN', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 聊天消息预览 */}
                  {chatMessages.slice(0, 2).map((message) => (
                    <div 
                      key={`preview-chat-${message.id}`} 
                      className="p-3 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 hover:border-green-200 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">💬</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {message.senderName}
                          </p>
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 更多通知提示 */}
                  {totalUnreadCount > 5 && (
                    <div className="text-center py-3 mt-4 border-t border-gray-200/50">
                      <p className="text-sm text-gray-500 mb-2">
                        还有 {totalUnreadCount - 5} 条通知...
                      </p>
                      <button
                        onClick={() => window.location.href = '/notification-center'}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        查看全部 →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
