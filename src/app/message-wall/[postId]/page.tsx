'use client';

import React, { useState, useEffect } from 'react';
import StickerPicker from '@/components/StickerPicker';
import { useRouter, useParams } from 'next/navigation';
import { usePageVisit } from '@/hooks/usePageVisit';
import Link from 'next/link';
import { getMbtiIconPath } from '@/lib/mbtiAssets';
import AppleConfirmDialog from '@/components/AppleConfirmDialog';

interface User {
  id: string;
  name: string;
  nickname: string;
  profileImage: string | null;
  accountType: string;
  className?: string | null;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  gender?: string | null;
  personalityType?: string | null;
}

interface Comment {
  id: string;
  content: string;
  isAnonymous: boolean;
  isPinned: boolean;
  pinnedBy: string | null;
  pinnedAt: string | null;
  createdAt: string;
  user: User;
  replies: Comment[];
}

interface Post {
  id: string;
  title: string;
  content: string;
  visibility: string;
  isAnonymous: boolean;
  isPinned: boolean;
  pinnedBy: string | null;
  pinnedAt: string | null;
  tags: string | null;
  location: string | null;
  mood: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
  comments: Comment[];
  _count: {
    comments: number;
  };
  likeCount?: number;
  liked?: boolean;
}

export default function PostDetailPage() {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorInfo, setAuthorInfo] = useState<any>(null);
  const [commentContent, setCommentContent] = useState('');
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsHasMore, setCommentsHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  
  usePageVisit(`message-wall-post-${postId}`);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub);
      } catch (error) {
        console.error('解析token失败:', error);
      }
    }
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/message-wall/posts/${postId}?page=${commentsPage}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        } else if (response.status === 404) {
          window.dispatchEvent(new CustomEvent('showErrorToast', {
            detail: { message: '帖子不存在' }
          }));
          router.push('/message-wall');
          return;
        }
        throw new Error('获取帖子失败');
      }

      const data = await response.json();
      setPost(data.post);
      // 额外获取作者的 MBTI 信息（非匿名）
      if (data.post?.user?.id && data.post.user.id !== 'anonymous') {
        try {
          const infoRes = await fetch(`/api/chat/user-info?userId=${data.post.user.id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (infoRes.ok) {
            const infoData = await infoRes.json();
            setAuthorInfo(infoData.userInfo || null);
          }
        } catch {}
      }
      if (data.pagination) {
        setCommentsHasMore(!!data.pagination.hasMore);
      } else {
        setCommentsHasMore(false);
      }
    } catch (error) {
      console.error('获取帖子失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '获取帖子失败' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentContent.trim()) {
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '请输入评论内容' }
      }));
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/message-wall/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          postId,
          content: commentContent.trim(),
          isAnonymous: isAnonymousComment,
          replyToId: replyTo?.id || null
        })
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: '评论发布成功！' }
        }));
        setCommentContent('');
        setIsAnonymousComment(false);
        setReplyTo(null);
        fetchPost(); // 重新获取帖子数据
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '评论发布失败' }
        }));
      }
    } catch (error) {
      console.error('评论发布失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '评论发布失败' }
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const submitStickerComment = async (url: string) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('/api/message-wall/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          postId,
          content: url,
          isAnonymous: isAnonymousComment,
          replyToId: replyTo?.id || null,
          messageType: 'sticker'
        })
      });
      if (response.ok) {
        window.dispatchEvent(new CustomEvent('showSuccessToast', { detail: { message: '表情已发布！' } }));
        setReplyTo(null);
        fetchPost();
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: error.error || '发布失败' } }));
      }
    } catch (e) {
      console.error('发布表情失败:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const pinComment = async (commentId: string, isPinned: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/message-wall/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: isPinned ? 'unpin' : 'pin'
        })
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: isPinned ? '取消精选成功' : '精选成功' }
        }));
        fetchPost();
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '操作失败' }
        }));
      }
    } catch (error) {
      console.error('精选操作失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '操作失败' }
      }));
    }
  };

  const loadMoreComments = async () => {
    if (!commentsHasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const token = localStorage.getItem('token');
      const nextPage = commentsPage + 1;
      const res = await fetch(`/api/message-wall/posts/${postId}?page=${nextPage}&limit=10`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPost(prev => prev ? { ...prev, comments: [...prev.comments, ...data.post.comments] } : prev);
        setCommentsPage(nextPage);
        setCommentsHasMore(!!data.pagination?.hasMore);
      }
    } catch {}
    finally { setLoadingMore(false); }
  };

  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/message-wall/comments/${commentToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: '评论删除成功' }
        }));
        fetchPost();
        setShowDeleteDialog(false);
        setCommentToDelete(null);
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '删除失败' }
        }));
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '网络错误，请重试' }
      }));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getVisibilityText = (visibility: string) => {
    const visibilityMap: { [key: string]: string } = {
      public: '公开',
      friends: '仅好友',
      teachers: '仅老师',
      classmates: '仅同学',
      teachers_classmates: '老师和同学'
    };
    return visibilityMap[visibility] || visibility;
  };

  const getUserDisplayName = (user: User) => {
    if (user.id === 'anonymous') return '匿名用户';
    return user.nickname || user.name;
  };

  const getUserAvatar = (user: User) => {
    if (user.id === 'anonymous') {
      return (
        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">?</span>
        </div>
      );
    }
    
    const displayName = getUserDisplayName(user);
    return (
      <div className="w-8 h-8 rounded-full shadow-md relative overflow-hidden">
        {/* 背景渐变作为占位 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500" />
        {/* MBTI 图标（如有） */}
        {user.personalityType ? (
          <img
            src={getMbtiIconPath(user.personalityType, user.gender, false)}
            alt={user.personalityType}
            className="absolute inset-0 w-full h-full object-contain p-0.5"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = getMbtiIconPath(user.personalityType, null, true); }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
            {displayName[0]}
          </div>
        )}
      </div>
    );
  };

  const canManageComment = (comment: Comment) => {
    if (!currentUserId || !post) return false;
    
    // 评论作者可以删除自己的评论
    if (comment.user.id === currentUserId) return true;
    
    // 帖子作者可以删除评论并精选
    if (post.user.id === currentUserId) return true;
    
    // 管理员和老师可以删除和精选所有评论
    // 这里需要从token中获取用户权限，简化处理
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">帖子不存在</h2>
          <Link href="/message-wall" className="text-blue-600 hover:text-blue-700">
            返回留言墙
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Link 
            href="/message-wall"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回留言墙</span>
          </Link>
        </div>

        {/* 帖子详情 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 overflow-hidden shadow-lg mb-8">
          {/* 精选标识 */}
          {post.isPinned && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-6 py-3 flex items-center space-x-2">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-white font-semibold">精选帖子</span>
            </div>
          )}

          <div className="p-8">
            {/* 帖子头部 */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                {getUserAvatar({
                  ...post.user,
                  gender: authorInfo?.gender ?? (post.user as any).gender ?? null,
                  personalityType: (authorInfo?.recentAssessments?.find((a: any) => a.type === 'MBTI')?.personalityType) ?? (post.user as any).personalityType ?? null
                })}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {getUserDisplayName(post.user)}
                    </h3>
                    {post.user.accountType === 'teacher' && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        老师
                      </span>
                    )}
                    {post.user.isAdmin && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        管理员
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="text-sm text-gray-500">
                      {formatTime(post.createdAt)}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 text-blue-700">
                      {getVisibilityText(post.visibility)}
                    </span>
                    {post.location && (
                      <span className="text-xs text-gray-500 flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{post.location}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 帖子内容 */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {post.title}
              </h1>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                {(() => {
                  const marker = '\n\n[images]';
                  const idx = post.content.lastIndexOf(marker);
                  let content = post.content;
                  let imgs: string[] = [];
                  if (idx !== -1) {
                    try { imgs = JSON.parse(post.content.slice(idx + marker.length)) || []; content = post.content.slice(0, idx); } catch {}
                  }
                  return (
                    <>
                      <div>{content}</div>
                      {imgs.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          {imgs.map((u, i) => (
                            <img key={u + i} src={u} alt="图片" className="w-full h-28 object-cover rounded-xl border" />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 标签和心情 */}
            {(post.tags || post.mood) && (
              <div className="flex items-center space-x-2 mb-6">
                {post.tags && JSON.parse(post.tags).map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full font-medium"
                  >
                    #{tag}
                  </span>
                ))}
                {post.mood && (
                  <span className="px-3 py-1 bg-yellow-50 text-yellow-600 text-sm rounded-full font-medium">
                    {post.mood}
                  </span>
                )}
              </div>
            )}

            {/* 统计信息 */}
            <div className="flex items-center space-x-4 pt-6 border-t border-gray-100">
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    const res = await fetch(`/api/message-wall/posts/${post.id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                    const data = await res.json();
                    if (res.ok) {
                      const liked = !!data.liked;
                      setPost(prev => prev ? { ...prev, liked, likeCount: Math.max(0, (prev.likeCount || 0) + (liked ? 1 : -1)) } : prev);
                    }
                  } catch {}
                }}
                className={`flex items-center space-x-2 ${post.liked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500 transition-colors`}
              >
                <svg className="w-5 h-5" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                </svg>
                <span className="text-sm">{post.likeCount ?? 0}</span>
              </button>
              <span className="text-sm text-gray-600">💬 {post._count.comments} 条评论</span>
            </div>
          </div>
        </div>

        {/* 评论区 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 overflow-hidden shadow-lg">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              💬 评论 ({post._count.comments})
            </h2>

            {/* 发表评论 */}
            <div className="space-y-4">
              {replyTo && (
                <div className="bg-blue-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">
                      回复 @{getUserDisplayName(replyTo.user)}
                    </span>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {replyTo.content}
                  </p>
                </div>
              )}

              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={replyTo ? `回复 @${getUserDisplayName(replyTo.user)}...` : "写下你的想法..."}
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm resize-none"
                maxLength={500}
              />
              
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymousComment}
                    onChange={(e) => setIsAnonymousComment(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">匿名评论</span>
                </label>
                
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">
                    {commentContent.length}/500
                  </span>
                  <button
                    onClick={() => setStickerOpen(true)}
                    type="button"
                    className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200"
                    title="表情"
                  >
                    <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={submitComment}
                    disabled={submitting || !commentContent.trim()}
                    className="px-6 py-2 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>发布中...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>发布</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 评论列表 */}
          <div className="divide-y divide-gray-100">
            {post.comments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p>暂无评论，来抢沙发吧！</p>
              </div>
            ) : (
              post.comments.map((comment) => (
                <div key={comment.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    {getUserAvatar(comment.user)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">
                          {getUserDisplayName(comment.user)}
                        </span>
                        {comment.isPinned && (
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )}
                        <span className="text-sm text-gray-500">
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>
                      
                      {/^https?:\/\//.test(comment.content) || comment.content.startsWith('/stickers/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(comment.content) ? (
                        <div className="mb-3">
                          <img src={comment.content} alt="sticker" className="max-w-[200px] max-h-[200px] object-contain rounded-xl border" />
                        </div>
                      ) : (
                        <p className="text-gray-700 mb-3 leading-relaxed">
                          {comment.content}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => setReplyTo(comment)}
                          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          回复
                        </button>
                        
                        {canManageComment(comment) && (
                          <>
                            <button
                              onClick={() => pinComment(comment.id, comment.isPinned)}
                              className="text-sm text-yellow-600 hover:text-yellow-800 transition-colors"
                            >
                              {comment.isPinned ? '取消精选' : '精选'}
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-sm text-red-600 hover:text-red-800 transition-colors"
                            >
                              删除
                            </button>
                          </>
                        )}
                      </div>

                      {/* 回复列表 */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 space-y-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start space-x-3 ml-4 pl-4 border-l-2 border-gray-100">
                              {getUserAvatar(reply.user)}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {getUserDisplayName(reply.user)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatTime(reply.createdAt)}
                                  </span>
                                </div>
                                {/^https?:\/\//.test(reply.content) || reply.content.startsWith('/stickers/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(reply.content) ? (
                                  <img src={reply.content} alt="sticker" className="max-w-[180px] max-h-[180px] object-contain rounded-lg border" />
                                ) : (
                                  <p className="text-gray-700 text-sm leading-relaxed">
                                    {reply.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {commentsHasMore && (
              <div className="p-6 text-center">
                <button onClick={loadMoreComments} disabled={loadingMore} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">
                  {loadingMore ? '加载中...' : '加载更多评论'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 删除评论确认对话框 */}
      <AppleConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteComment}
        title="删除评论"
        message="确定要删除这条评论吗？删除后无法恢复。"
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
        isLoading={isDeleting}
      />
      <StickerPicker isOpen={stickerOpen} onClose={() => setStickerOpen(false)} onSelect={submitStickerComment} title="选择表情" variant="sheet" />
    </div>
  );
}
