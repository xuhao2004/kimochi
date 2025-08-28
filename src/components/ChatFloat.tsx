'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUnifiedNotification } from '@/contexts/UnifiedNotificationContext';

interface UnreadMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    nickname: string;
    profileImage: string;
  };
  chatRoom: {
    id: string;
    name: string;
    type: string;
  };
}

export default function ChatFloat() {
  const [showPreview, setShowPreview] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  // 使用统一的通知数据管理
  const {
    notificationData,
    totalUnreadCount,
    chatUnreadCount,
    refreshLightweight
  } = useUnifiedNotification();
  
  // 从统一数据源获取聊天消息
  const { chatMessages } = notificationData;
  const isFloatVisible = chatUnreadCount > 0;

  useEffect(() => {
    const t = localStorage.getItem('token');
    setToken(t);
    // 移除重复的轮询逻辑，统一由UnifiedNotificationContext管理
  }, []);



  if (!token || !isFloatVisible) {
    return null;
  }

  return (
    <>
      {/* 悬浮聊天按钮 */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* 消息预览弹窗 */}
          {showPreview && chatMessages.length > 0 && (
            <div className="absolute bottom-16 right-0 w-80 bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="p-4 border-b border-black/[0.08]">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">💬 未读消息</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {chatMessages.slice(0, 3).map((message) => (
                  <Link
                    key={message.id}
                    href="/messages"
                    className="block p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {message.senderName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {message.senderName}
                          </p>
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleTimeString('zh-CN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{message.content}</p>
                        <p className="text-xs text-gray-400 mt-1">来自: {message.roomName}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              <div className="p-3 bg-gray-50/80">
                <Link
                  href="/messages"
                  className="block w-full text-center py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  查看所有消息
                </Link>
              </div>
            </div>
          )}

          {/* 悬浮按钮 */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="relative w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-[0_8px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.4)] hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            
            {/* 未读消息数量徽章 - 苹果风格 */}
            {chatUnreadCount > 0 && (
              <div className="absolute -top-2 -right-2 min-w-[24px] h-6 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center px-2 shadow-lg shadow-red-500/50 border-2 border-white animate-bounce">
                <span className="font-bold text-[11px] leading-none">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
              </div>
            )}

            {/* 脉冲动画 */}
            <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"></div>
          </button>

          {/* 快速访问心理老师按钮 */}
          <Link
            href="/messages"
            className="absolute -top-16 right-0 w-12 h-12 bg-white/90 backdrop-blur-xl text-gray-700 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center border border-black/[0.08] group"
            title="联系心理老师"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 欢迎提示 - 首次访问时显示 */}
      {chatUnreadCount === 0 && (
        <div className="fixed bottom-24 right-6 z-40 max-w-xs">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 animate-in fade-in-0 slide-in-from-right-5 duration-500">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                👋
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">欢迎使用心语聊天！</p>
                <p className="text-xs text-gray-600">您可以随时与心理老师进行专业咨询，或与朋友交流心得。</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Link
                href="/messages"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                开始聊天 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
