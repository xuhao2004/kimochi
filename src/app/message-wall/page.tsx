'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePageVisit } from '@/hooks/usePageVisit';
import Link from 'next/link';
import CreatePostModal from './components/CreatePostModal';
import PostActionsMenu from '@/components/PostActionsMenu';
import { getMbtiIconPath } from '@/lib/mbtiAssets';
import ReportModal from '@/components/ReportModal';
import MoodStats from '@/components/MoodStats';

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
  userId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    nickname: string;
    profileImage: string | null;
    accountType: string;
    className: string | null;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  };
  comments: Comment[];
  _count: {
    comments: number;
  };
  likeCount?: number;
  liked?: boolean;
}

interface Comment {
  id: string;
  content: string;
  isAnonymous: boolean;
  isPinned: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    nickname: string;
    profileImage: string | null;
    accountType: string;
  };
}

export default function MessageWallPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ isAdmin: boolean; isSuperAdmin: boolean } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPost, setReportPost] = useState<{ id: string; title: string } | null>(null);
  const [showMoodStats, setShowMoodStats] = useState(false);
  const router = useRouter();
  
  usePageVisit('message-wall');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.sub);
      setCurrentUser({
        isAdmin: payload.isAdmin || false,
        isSuperAdmin: payload.isSuperAdmin || false
      });
    } catch (error) {
      console.error('解析token失败:', error);
    }
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const url = new URL('/api/message-wall/posts', window.location.origin);
      if (filter !== 'all') {
        url.searchParams.set('visibility', filter);
      }
      if (filter === 'pinned') {
        url.searchParams.set('pinned', 'true');
      }

      const finalToken = localStorage.getItem('token');
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${finalToken}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('获取帖子列表失败');
      }

      const data = await response.json();
      setPosts(data.posts);
    } catch (error) {
      console.error('获取帖子失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '获取帖子失败' }
      }));
    } finally {
      setLoading(false);
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

  // 处理帖子删除
  const handlePostDelete = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  // 处理帖子举报
  const handlePostReport = (postId: string, postTitle: string) => {
    setReportPost({ id: postId, title: postTitle });
    setShowReportModal(true);
  };

  // 举报成功后的处理
  const handleReportSuccess = () => {
    setShowReportModal(false);
    setReportPost(null);
  };

  const getVisibilityText = (visibility: string) => {
    const visibilityMap: { [key: string]: string } = {
      public: '公开',
      friends: '仅好友',
      selective_friends: '部分好友',
      teachers: '仅老师',
      classmates: '仅同学',
      teachers_classmates: '老师和同学'
    };
    return visibilityMap[visibility] || visibility;
  };

  const getVisibilityColor = (visibility: string) => {
    const colorMap: { [key: string]: string } = {
      public: 'bg-green-100 text-green-700',
      friends: 'bg-blue-100 text-blue-700',
      selective_friends: 'bg-cyan-100 text-cyan-700',
      teachers: 'bg-purple-100 text-purple-700',
      classmates: 'bg-orange-100 text-orange-700',
      teachers_classmates: 'bg-indigo-100 text-indigo-700'
    };
    return colorMap[visibility] || 'bg-gray-100 text-gray-700';
  };

  const getUserDisplayName = (user: any) => {
    if (user.id === 'anonymous') return '匿名用户';
    return user.nickname || user.name;
  };

  const getUserAvatar = (user: any) => {
    if (user.id === 'anonymous') {
      return (
        <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
          <span className="text-white font-bold">?</span>
        </div>
      );
    }
    
    const displayName = getUserDisplayName(user);
    return (
      <div className="w-10 h-10 rounded-full shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500" />
        {user.personalityType ? (
          <img
            src={getMbtiIconPath(user.personalityType, user.gender, false)}
            alt={user.personalityType}
            className="absolute inset-0 w-full h-full object-contain p-0.5"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = getMbtiIconPath(user.personalityType, null, true); }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
            {displayName[0]}
          </div>
        )}
      </div>
    );
  };

  const toggleLike = async (postId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/message-wall/posts/${postId}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        const liked = !!data.liked;
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked, likeCount: Math.max(0, (p.likeCount || 0) + (liked ? 1 : -1)) } : p));
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-y-auto apple-scrollbar touch-scroll" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 max-w-5xl py-8">
        {/* 页面标题和操作栏 */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">💬 留言墙</h1>
              <p className="text-gray-600">分享你的想法，与大家交流</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto h-12 px-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>发布帖子</span>
            </button>
          </div>

          {/* 筛选栏（移动端横向无痕滚动 + 吸附） */}
          <div className="flex flex-nowrap gap-2 sm:gap-3 items-center overflow-x-auto no-scrollbar touch-scroll pr-1 snap-x snap-mandatory h-11">
            {[
              { key: 'all', label: '全部', icon: '🌍' },
              { key: 'pinned', label: '精选', icon: '⭐' },
              { key: 'public', label: '公开', icon: '🌐' },
              { key: 'friends', label: '好友', icon: '👥' },
              { key: 'teachers', label: '老师', icon: '👨‍🏫' },
              { key: 'classmates', label: '同学', icon: '🎓' }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                  className={`flex-none whitespace-nowrap snap-start px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                  filter === item.key
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            
            {/* 心情统计按钮 */}
            <div className="ml-auto flex-none">
              <button
                onClick={() => setShowMoodStats(!showMoodStats)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                  showMoodStats
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md'
                }`}
              >
                <span>📊</span>
                <span>心情统计</span>
              </button>
            </div>
          </div>
        </div>

        {/* 心情统计面板 */}
        {showMoodStats && (
          <div className="mb-8">
            <MoodStats />
          </div>
        )}

        {/* 帖子列表 */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无帖子</h3>
              <p className="text-gray-600 mb-4">成为第一个分享想法的人吧！</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                发布第一个帖子
              </button>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                {/* 精选标识 */}
                {post.isPinned && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-2 flex items-center space-x-2">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-white text-sm font-semibold">精选帖子</span>
                  </div>
                )}

                <div className="p-6">
                  {/* 帖子头部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getUserAvatar(post.user)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">
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
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatTime(post.createdAt)}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getVisibilityColor(post.visibility)}`}>
                            {getVisibilityText(post.visibility)}
                          </span>
                          {post.location && (
                            <span className="text-xs text-gray-500 flex items-center space-x-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{post.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作菜单 */}
                    {currentUserId && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <PostActionsMenu
                          post={post}
                          currentUserId={currentUserId}
                          isAdmin={currentUser?.isAdmin || currentUser?.isSuperAdmin || false}
                          onDelete={handlePostDelete}
                          onReport={handlePostReport}
                        />
                      </div>
                    )}
                  </div>

                  {/* 帖子内容 */}
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      {post.title}
                    </h2>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
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
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {imgs.map((u, i) => (
                                  <img key={u + i} src={u} alt="图片" className="w-full h-24 object-cover rounded-xl border" />
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
                    <div className="flex items-center space-x-2 mb-4">
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

                  {/* 评论预览 */}
                  {post.comments.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="space-y-3">
                        {post.comments.slice(0, 2).map((comment) => (
                          <div key={comment.id} className="flex items-start space-x-3">
                            {getUserAvatar(comment.user)}
                            <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm text-gray-900">
                                  {getUserDisplayName(comment.user)}
                                </span>
                                {comment.isPinned && (
                                  <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                )}
                                <span className="text-xs text-gray-500">
                                  {formatTime(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {post._count.comments > 2 && (
                        <Link
                          href={`/message-wall/${post.id}`}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium inline-block"
                        >
                          查看全部 {post._count.comments} 条评论
                        </Link>
                      )}
                    </div>
                  )}

                  {/* 底部操作栏 */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center space-x-2 ${post.liked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500 transition-colors`}
                      >
                        <svg className="w-5 h-5" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                        </svg>
                        <span className="text-sm">{post.likeCount ?? 0}</span>
                      </button>
                      <Link
                        href={`/message-wall/${post.id}`}
                        className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm">{post._count.comments}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 创建帖子模态框 */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchPosts}
      />

      {/* 举报模态框 */}
      {reportPost && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          postId={reportPost.id}
          postTitle={reportPost.title}
          onSuccess={handleReportSuccess}
        />
      )}
    </div>
  );
}
