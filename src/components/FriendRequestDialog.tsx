"use client";

import React, { useState, useEffect } from 'react';

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

interface FriendRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestProcessed?: () => void;
}

const FriendRequestDialog: React.FC<FriendRequestDialogProps> = ({
  isOpen,
  onClose,
  onRequestProcessed
}) => {
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    if (isOpen) {
      fetchFriendRequests();
    }
  }, [isOpen]);

  const fetchFriendRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/friends/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReceivedRequests(data.receivedRequests || []);
        setSentRequests(data.sentRequests || []);
      }
    } catch (error) {
      console.error('获取好友请求失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async (friendshipId: string, action: 'accept' | 'reject') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/friends/requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ friendshipId, action })
      });

      if (response.ok) {
        // 从列表中移除已处理的请求
        setReceivedRequests(prev => prev.filter(req => req.id !== friendshipId));
        onRequestProcessed?.();
        // 即时刷新统一通知与未读计数，避免误导
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
        window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
        
        if (action === 'accept') {
          // 触发成功通知事件
          window.dispatchEvent(new CustomEvent('showSuccessToast', {
            detail: { message: '好友申请已接受' }
          }));
        }
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '处理请求失败' }
        }));
      }
    } catch (error) {
      console.error('处理好友请求失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '处理请求失败' }
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div 
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          animation: 'dialogBounceIn 0.36s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200/60">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 tracking-tight">好友申请</h3>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 选项卡 */}
          <div className="flex space-x-1 bg-gray-100/60 rounded-2xl p-1.5 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'received'
                  ? 'bg-white/90 text-blue-600 shadow-lg shadow-blue-500/10 scale-[0.98]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
            >
              收到的申请 ({receivedRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'sent'
                  ? 'bg-white/90 text-blue-600 shadow-lg shadow-blue-500/10 scale-[0.98]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
            >
              发送的申请 ({sentRequests.length})
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* 收到的申请 */}
              {activeTab === 'received' && (
                <div className="space-y-4">
                  {receivedRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-100/80 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">暂无好友申请</p>
                      <p className="text-gray-400 text-sm mt-1">当有新的好友申请时会显示在这里</p>
                    </div>
                  ) : (
                    receivedRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="flex items-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/60 hover:bg-white/80 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
                      >
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold mr-4 shadow-lg">
                          {request.user.nickname?.[0] || request.user.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate mb-1">
                            {request.user.nickname || request.user.name}
                          </p>
                          <p className="text-sm text-gray-500 font-medium">
                            {request.user.accountType === 'teacher' ? '心理老师' : 
                             request.user.accountType === 'student' ? '学生' : '注册用户'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleFriendRequest(request.id, 'accept')}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 active:scale-95"
                          >
                            接受
                          </button>
                          <button
                            onClick={() => handleFriendRequest(request.id, 'reject')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all duration-300 hover:scale-105 active:scale-95"
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 发送的申请 */}
              {activeTab === 'sent' && (
                <div className="space-y-4">
                  {sentRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-100/80 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">暂无发送的申请</p>
                      <p className="text-gray-400 text-sm mt-1">你发送的好友申请会显示在这里</p>
                    </div>
                  ) : (
                    sentRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="flex items-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/60 hover:bg-white/80 hover:shadow-lg hover:shadow-yellow-500/5 transition-all duration-300"
                      >
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold mr-4 shadow-lg">
                          {request.user.nickname?.[0] || request.user.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate mb-1">
                            {request.user.nickname || request.user.name}
                          </p>
                          <p className="text-sm text-gray-500 font-medium">
                            {request.user.accountType === 'teacher' ? '心理老师' : 
                             request.user.accountType === 'student' ? '学生' : '注册用户'}
                          </p>
                        </div>
                        <div className="px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 text-sm font-semibold rounded-xl border border-yellow-200/60">
                          <span className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span>等待回复</span>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestDialog;
