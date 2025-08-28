'use client';

import React, { useState, useRef, useEffect } from 'react';
import AppleConfirmDialog from './AppleConfirmDialog';

interface Post {
  id: string;
  title: string;
  userId: string;
  isDeleted: boolean;
}

interface PostActionsMenuProps {
  post: Post;
  currentUserId: string;
  isAdmin: boolean;
  onDelete?: (postId: string) => void;
  onReport?: (postId: string, postTitle: string) => void;
}

export default function PostActionsMenu({ 
  post, 
  currentUserId, 
  isAdmin,
  onDelete,
  onReport 
}: PostActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = post.userId === currentUserId;
  const canDelete = isOwner || isAdmin;
  const canReport = !isOwner && !post.isDeleted;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // 如果既不能删除也不能举报，则不显示菜单
  if (!canDelete && !canReport) {
    return null;
  }

  const handleDeleteClick = () => {
    if (!canDelete) return;
    setIsOpen(false);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/message-wall/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: '帖子已删除' }
        }));
        onDelete?.(post.id);
      } else {
        const data = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: data.error || '删除失败' }
        }));
      }
    } catch (error) {
      console.error('删除帖子失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '网络错误，请重试' }
      }));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleReport = () => {
    if (!canReport) return;
    setIsOpen(false);
    onReport?.(post.id, post.title);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* 三点菜单按钮 - 苹果风格 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group p-2.5 text-gray-400 hover:text-gray-600 apple-transition rounded-full hover:bg-gray-100/80 active:bg-gray-200/80 active:scale-95 ${
          isOpen ? 'bg-gray-100 text-gray-600' : ''
        }`}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 transform transition-transform duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        )}
      </button>

      {/* 下拉菜单 - 苹果风格 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-[100]">
          <div 
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 py-2 min-w-[140px] transform transition-all duration-300 ease-out"
            style={{
              animation: 'menuSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              opacity: 0,
              transform: 'translateY(-8px) scale(0.95)'
            }}
          >
            {canDelete && (
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50/80 active:bg-red-100/80 apple-transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 first:rounded-t-2xl last:rounded-b-2xl hover:scale-[1.02] active:scale-95"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="font-medium">删除帖子</span>
              </button>
            )}
            
            {canReport && (
              <>
                {canDelete && <div className="h-px bg-gray-100 mx-2" />}
                <button
                  onClick={handleReport}
                  className="w-full px-4 py-3 text-left text-sm text-orange-600 hover:bg-orange-50/80 active:bg-orange-100/80 apple-transition flex items-center space-x-3 first:rounded-t-2xl last:rounded-b-2xl hover:scale-[1.02] active:scale-95"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.86-.833-2.64 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="font-medium">举报帖子</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <AppleConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="删除帖子"
        message={isOwner 
          ? '确定要删除这个帖子吗？删除后无法恢复。' 
          : '确定要删除这个帖子吗？'}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
