"use client";

import React from 'react';

interface Friend {
  id: string;
  name: string;
  nickname: string;
  profileImage: string;
  accountType: string;
  isAdmin: boolean;
  friendshipId: string;
}

interface DeleteFriendDialogProps {
  isOpen: boolean;
  friend: Friend | null;
  onClose: () => void;
  onConfirm: (friendId: string, friendshipId: string) => void;
  isLoading?: boolean;
}

const DeleteFriendDialog: React.FC<DeleteFriendDialogProps> = ({
  isOpen,
  friend,
  onClose,
  onConfirm,
  isLoading = false
}) => {
  if (!isOpen || !friend) return null;

  const handleConfirm = () => {
    if (friend && !isLoading) {
      onConfirm(friend.id, friend.friendshipId);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      <div 
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          animation: 'dialogBounceIn 0.38s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* 头部 */}
        <div className="p-8 text-center">
          {/* 用户头像 */}
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 via-pink-500 to-red-600 rounded-3xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6 shadow-xl">
            {friend.nickname?.[0] || friend.name[0]}
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3 tracking-tight">
            删除好友
          </h3>
          
          <p className="text-gray-600 leading-relaxed mb-2">
            确定要删除好友
          </p>
          <p className="text-lg font-semibold text-gray-900 mb-4">
            {friend.nickname || friend.name}
          </p>
          
          <div className="bg-red-50/80 border border-red-200/60 rounded-2xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-red-800 mb-1">注意</p>
                <p className="text-sm text-red-700 leading-relaxed">
                  删除后将无法直接聊天，如需重新添加需要发送好友申请
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="p-6 pt-0">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-4 px-6 bg-gray-100/80 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200/80 transition-all duration-300 hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>删除中...</span>
                </div>
              ) : (
                '确认删除'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteFriendDialog;
