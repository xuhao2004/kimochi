'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { usePageVisit } from '@/hooks/usePageVisit';
import CollapsibleContactGroup from '@/components/CollapsibleContactGroup';
import FriendRequestDialog from '@/components/FriendRequestDialog';
import FriendGroupManager from '@/components/FriendGroupManager';
import DeleteFriendDialog from '@/components/DeleteFriendDialog';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useUnread } from '@/contexts/UnreadContext';
import StickerPicker from '@/components/StickerPicker';
import { getMbtiIconPath } from '@/lib/mbtiAssets';

interface ChatRoom {
  id: string;
  name: string;
  type: string;
  lastMessage: any;
  lastMessageAt: string;
  unreadCount: number;
  participants: any[];
  chatTarget: any;
  totalMessages: number;
}

interface Message {
  id: string;
  content: string;
  messageType: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    nickname: string;
    profileImage: string;
    isAdmin: boolean;
  };
  replyTo?: any;
}

interface Friend {
  id: string;
  name: string;
  nickname: string;
  profileImage: string;
  isAdmin: boolean;
  accountType: string;
  friendshipId: string;
}

export default function MessagesPage() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  // 本地强制“正在测试中”覆盖集合：在测评弹窗打开期间，不被服务端消息回写为暂停所覆盖
  const forceInProgressMessageIdsRef = useRef<Set<string>>(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [viewer, setViewer] = useState<{ accountType: string; isSuperAdmin: boolean } | null>(null);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showDeleteFriendDialog, setShowDeleteFriendDialog] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);
  const [deletingFriend, setDeletingFriend] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'message' | 'room' | 'clear';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'message',
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name?: string; mime?: string; size?: number } | null>(null);
  const [sendingAttachment, setSendingAttachment] = useState(false);
  const [latestAssessments, setLatestAssessments] = useState<any[]>([]);
  const [myLatestAssessments, setMyLatestAssessments] = useState<Record<string, any>>({});
  const [assessmentModal, setAssessmentModal] = useState<{ open: boolean; loading: boolean; data: any | null }>({ open: false, loading: false, data: null });
  // 防重复点击：继续按钮的进行中状态集合
  const [continuingInviteIds, setContinuingInviteIds] = useState<Record<string, boolean>>({});
  const [emojiOpen, setEmojiOpen] = useState(false);
  const touchStartXRef = useRef<number>(0);
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const [pinnedRooms, setPinnedRooms] = useState<Record<string, number>>({});
  const [favoriteContacts, setFavoriteContacts] = useState<Record<string, number>>({});
  const [activePanel, setActivePanel] = useState<'none'|'emoji'|'more'|'sticker'|'picker'>('none');
  const [panelHeight, setPanelHeight] = useState(0);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [inputHeight, setInputHeight] = useState(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [controlsHeight, setControlsHeight] = useState(44);
  const moreScrollRef = useRef<HTMLDivElement>(null);
  const [morePage, setMorePage] = useState(0);
  const [pickerTab, setPickerTab] = useState<'emoji'|'sticker'>('emoji');
  const [assessmentSelect, setAssessmentSelect] = useState<{ mode: 'send' | 'invite' | null; } | null>(null);
  // 右侧作用域的轻量错误提示（不遮挡左侧列表）
  const [scopedError, setScopedError] = useState<{ open: boolean; title?: string; message: string } | null>(null);
  // 右侧作用域的“确认取消测试”对话框
  const [cancelTestDialog, setCancelTestDialog] = useState<{ open: boolean; messageId?: string } >({ open: false });
  const AssessmentRunner = useMemo(() => InlineAssessmentRunner, []);
  const sendInviteAssessment = async () => {
    if (!selectedRoom) return;
    try {
      // 使用右侧会话区域内的选择弹窗，避免影响左侧列表
      const token = localStorage.getItem('token'); if (!token) return;
      setAssessmentSelect({ mode: 'invite' });
    } catch {}
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const [forceScrollOnNextMessages, setForceScrollOnNextMessages] = useState(false);
  const router = useRouter();
  const { refreshUnreadCount } = useUnread();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  
  usePageVisit('messages');

  // 输入区高度自适应（用于为消息列表增加底部留白）
  useEffect(() => {
    const measure = () => setInputHeight(inputWrapperRef.current?.offsetHeight || 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // 使用 ResizeObserver 跟踪输入区高度，避免半屏首次加载时面板覆盖工具栏
  useEffect(() => {
    const el = inputWrapperRef.current as HTMLDivElement | null;
    if (!el || typeof window === 'undefined' || typeof (window as any).ResizeObserver === 'undefined') {
      setInputHeight(el?.offsetHeight || 0);
      return;
    }
    const ro = new (window as any).ResizeObserver(() => {
      setInputHeight(el.offsetHeight || 0);
    });
    ro.observe(el);
    const id = window.setTimeout(() => setInputHeight(el.offsetHeight || 0), 0);
    return () => { ro.disconnect(); window.clearTimeout(id); };
  }, [activePanel]);

  // 按钮高度与输入框高度保持一致，并自动随内容增长
  useEffect(() => {
    const measureControls = () => {
      const el = textAreaRef.current;
      if (!el) { setControlsHeight(44); return; }
      el.style.height = 'auto';
      const maxHeight = 112; // 与 Tailwind 的 max-h-28 一致（7rem = 112px）
      const nextHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${nextHeight}px`;
      setControlsHeight(el.offsetHeight || nextHeight || 44);
    };
    measureControls();
    window.addEventListener('resize', measureControls);
    return () => window.removeEventListener('resize', measureControls);
  }, [newMessage]);

  // 面板高度测量（用于"微信式"输入区上移）并在首次渲染、切换时保持稳定
  useEffect(() => {
    const el = (typeof document !== 'undefined' ? (document.getElementById('chat-bottom-panel') as HTMLElement | null) : null);
    if (!el) { setPanelHeight(0); return; }
    setPanelHeight(el.offsetHeight || 0);
    let ro: any = null;
    if (typeof (window as any).ResizeObserver !== 'undefined') {
      ro = new (window as any).ResizeObserver(() => setPanelHeight(el.offsetHeight || 0));
      ro.observe(el);
    }
    const id = window.setTimeout(() => setPanelHeight(el.offsetHeight || 0), 0);
    return () => { if (ro) ro.disconnect(); window.clearTimeout(id); };
  }, [activePanel, moreOpen, stickerOpen, emojiOpen]);

  // 兼容旧布尔状态，统一由 activePanel 驱动
  useEffect(() => {
    setStickerOpen(activePanel === 'sticker');
    setEmojiOpen(activePanel === 'emoji');
    setMoreOpen(activePanel === 'more');
  }, [activePanel]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // 读取本地置顶与收藏状态（静态偏好，不触发明显页面变化）
    try {
      const pinned = localStorage.getItem('pinnedRooms');
      if (pinned) setPinnedRooms(JSON.parse(pinned));
      const favs = localStorage.getItem('favoriteContacts');
      if (favs) setFavoriteContacts(JSON.parse(favs));
    } catch {}
    if (token) {
      // 解析token获取用户ID
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub);
      } catch (error) {
        console.error('解析token失败:', error);
      }
      // 获取当前用户类型
      fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d?.user) setViewer({ accountType: d.user.accountType, isSuperAdmin: !!d.user.isSuperAdmin });
        })
        .catch(() => {});
    }
    
    fetchChatRooms();
    fetchFriends();
    fetchPendingRequestsCount();
    if (activeTab === 'contacts') {
      fetchAllContacts();
    }
  }, []);

  // 周期性轻量刷新：聊天室列表、当前会话消息、在线状态和通知中心
  useEffect(() => {
    const roomsInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchChatRooms();
        refreshUnreadCount();
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }
    }, 20000);
    return () => clearInterval(roomsInterval);
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        // 仅拉取最新若干条信息，避免大列表反复抖动（服务端可按query处理）
        fetchMessages(selectedRoom.id);
        if (selectedRoom.chatTarget?.id) {
          fetchUserInfo(selectedRoom.chatTarget.id);
        }
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedRoom?.id]);

  // 监听更多面板的翻页（仿微信分页效果）
  useEffect(() => {
    const el = moreScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const page = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setMorePage(page);
    };
    el.addEventListener('scroll', onScroll, { passive: true } as any);
    return () => el.removeEventListener('scroll', onScroll as any);
  }, [moreOpen]);

  useEffect(() => {
    if (activeTab !== 'contacts') return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAllContacts();
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // SSE 订阅：实时刷新聊天与邀请状态
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token || typeof window === 'undefined') return;
      const es = new EventSource(`/api/sse/subscribe?token=${encodeURIComponent(token)}`);
      const onChat = (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data?.roomId) {
            // 如果是当前房间，则刷新消息；始终刷新房间列表以更新未读与最后消息
            if (selectedRoom?.id === data.roomId) {
              // 仅在用户接近底部时才会在 messages 更新后滚动
              fetchMessages(data.roomId);
            } else {
              fetchChatRooms();
            }
            refreshUnreadCount();
            window.dispatchEvent(new CustomEvent('refreshNotifications'));
          }
        } catch {}
      };
      es.addEventListener('chat_message', onChat);
      es.addEventListener('error', () => {
        // 由浏览器自动重连
      });
      return () => {
        try {
          es.removeEventListener('chat_message', onChat as any);
          es.close();
        } catch {}
      };
    } catch {}
  }, [selectedRoom?.id]);

  // 锁定滚动，提升移动端抽屉体验
  useEffect(() => {
    if (sidebarMounted) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [sidebarMounted]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
      // 切换会话时，下一次消息到达强制滚动到底部
      setForceScrollOnNextMessages(true);
      // 切换会话时清理强制进行中标记，避免影响其他会话
      forceInProgressMessageIdsRef.current.clear();
      // 获取选中用户的详细信息
      if (selectedRoom.chatTarget?.id) {
        fetchUserInfo(selectedRoom.chatTarget.id);
        // 预取对方最近测评
        preloadPeerAssessments(selectedRoom.chatTarget.id);
        // 预取我方最近测评
        preloadMyAssessments();
      }
    }
  }, [selectedRoom]);

  // 切换会话时，自动关闭所有与当前会话相关的浮层/弹窗
  useEffect(() => {
    setPreviewFile(null);
    setAssessmentModal({ open: false, loading: false, data: null });
    setAssessmentSelect(null);
    setActivePanel('none');
    // 关闭右侧范围内的删除/清空确认弹窗，避免切换会话后仍然悬浮
    setDeleteDialog(prev => ({ ...prev, isOpen: false }));
  }, [selectedRoom?.id]);

  // 仅在用户接近底部或明确要求时自动滚动到底
  useEffect(() => {
    if (forceScrollOnNextMessages) {
      scrollToBottom('instant');
      setForceScrollOnNextMessages(false);
      return;
    }
    if (isUserNearBottom) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth') => {
    const el = messagesEndRef.current;
    if (!el) return;
    if (behavior === 'instant') {
      el.scrollIntoView({ behavior: 'auto' });
    } else {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openSidebar = () => { setSidebarMounted(true); setSidebarOpen(true); };
  const closeSidebar = () => { setSidebarOpen(false); setTimeout(() => setSidebarMounted(false), 340); };

  // 触摸手势（从左向右滑关闭）
  const onTouchStart = (e: React.TouchEvent) => { touchStartXRef.current = e.touches[0].clientX; setTouchDeltaX(0); };
  const onTouchMove  = (e: React.TouchEvent) => { setTouchDeltaX(e.touches[0].clientX - touchStartXRef.current); };
  const onTouchEnd   = () => { if (touchDeltaX < -60) closeSidebar(); setTouchDeltaX(0); };
  const isSingleEmoji = (text: string) => {
    if (!text) return false;
    const trimmed = text.trim();
    const emojiRegex = /\p{Extended_Pictographic}/u;
    const onlyEmoji = trimmed.replace(/\p{Extended_Pictographic}/gu, '');
    return emojiRegex.test(trimmed) && onlyEmoji === '' && [...trimmed.matchAll(/\p{Extended_Pictographic}/gu)].length === 1;
  };
  const shouldShowTimeDivider = (prev?: Message, curr?: Message) => {
    if (!curr) return false;
    if (!prev) return true;
    try {
      const a = new Date(prev.createdAt).getTime();
      const b = new Date(curr.createdAt).getTime();
      if (isNaN(a) || isNaN(b)) return false;
      const prevDate = new Date(prev.createdAt);
      const currDate = new Date(curr.createdAt);
      if (prevDate.toDateString() !== currDate.toDateString()) return true;
      return b - a >= 5 * 60 * 1000;
    } catch { return false; }
  };
  const formatTimeDivider = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      if (sameDay) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    } catch { return ts; }
  };

  // 封装单条消息渲染，避免复杂 JSX 内部的大括号匹配问题
  const renderMessageItem = (message: Message, index: number) => {
    const previousMessage = index > 0 ? messages[index - 1] : undefined;
    const showTimeDivider = shouldShowTimeDivider(previousMessage, message);
    const isOwnMessage = message.sender.id === currentUserId;
    const isSelected = selectedMessages.includes(message.id);
    return (
      <div key={message.id}>
        {showTimeDivider && (
          <div className="flex justify-center my-3">
            <span className="px-3 py-1 rounded-full text-[11px] text-gray-500 bg-white/60 backdrop-blur border border-black/[0.06]">
              {formatTimeDivider(message.createdAt)}
            </span>
          </div>
        )}
        <div
          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
            isSelectionMode ? 'cursor-pointer' : ''
          }`}
          onClick={() => isSelectionMode && toggleMessageSelection(message.id)}
        >
          <div className={`max-w-xs lg:max-w-md relative ${isOwnMessage ? 'order-2' : 'order-1'}`}>
            {/* 选择框 */}
            {isSelectionMode && (
              <div className={`absolute -top-2 ${isOwnMessage ? '-left-8' : '-right-8'} z-10`}>
                <div
                  className={`w-5 h-5 rounded border-2 transition-colors ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300 hover:border-blue-400'
                  } flex items-center justify-center`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            )}

            {!isOwnMessage && (
              <div className="flex items-center mb-1">
                <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-xs font-medium mr-2">
                  {message.sender.nickname?.[0] || message.sender.name[0]}
                </div>
                <span
                  className="text-xs truncate"
                  title={
                    message.sender.nickname && message.sender.nickname !== message.sender.name
                      ? `${message.sender.nickname}（${message.sender.name}）`
                      : message.sender.name
                  }
                >
                  {message.sender.nickname && message.sender.nickname !== message.sender.name ? (
                    <>
                      <span className="text-gray-700">{message.sender.nickname}</span>
                      <span className="text-gray-400">（{message.sender.name}）</span>
                    </>
                  ) : (
                    <span className="text-gray-700">{message.sender.name}</span>
                  )}
                </span>
              </div>
            )}

            <div className="relative group">
              <div
                className={
                  ['sticker', 'emoji', 'assessment'].includes(message.messageType)
                    ? ''
                    : `${isSelected ? 'ring-2 ring-blue-400 ' : ''}${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      } rounded-2xl px-4 py-3`
                }
              >
                {message.messageType === 'sticker' && (
                  <img src={message.content} alt="sticker" className="max-w-[220px] max-h-[220px] object-contain rounded-lg" />
                )}
                {message.messageType === 'emoji' && (
                  <div className="text-5xl leading-none select-none">{message.content}</div>
                )}
                {message.messageType === 'image' && (() => {
                  let data: any = null;
                  try {
                    data = JSON.parse(message.content);
                  } catch {}
                  return (
                    <img
                      src={data?.url || message.content}
                      alt={data?.name || 'image'}
                      className="max-w-[280px] max-h-[260px] object-contain rounded-lg"
                      onClick={() => setPreviewFile({ url: data?.url || message.content, name: data?.name, mime: data?.mime })}
                    />
                  );
                })()}
                {message.messageType === 'video' && (() => {
                  let data: any = null;
                  try {
                    data = JSON.parse(message.content);
                  } catch {}
                  return (
                    <video src={data?.url || message.content} controls className="max-w-[320px] max-h-[260px] rounded-lg" />
                  );
                })()}
                {message.messageType === 'file' && (() => {
                  let data: any = null;
                  try {
                    data = JSON.parse(message.content);
                  } catch {}
                  const name = data?.name || '文件';
                  const url = data?.url || message.content;
                  const mime = data?.mime || '';
                  const size = data?.size || undefined;
                  const ext = String(name).split('.').pop()?.toLowerCase() || '';
                  const isOffice = /^(doc|docx|xls|xlsx|ppt|pptx)$/i.test(ext);
                  const isPdf = ext === 'pdf' || /^application\/pdf$/i.test(mime);
                  const isText = /^(txt|csv|md)$/i.test(ext) || /^text\//i.test(mime);
                  const canPreview = isPdf || isOffice || isText || /^image\//.test(mime) || /^video\//.test(mime);
                  const icon = (() => {
                    if (ext.startsWith('doc')) return { bg: 'bg-blue-100 text-blue-700', label: 'DOC' };
                    if (ext.startsWith('xls')) return { bg: 'bg-green-100 text-green-700', label: 'XLS' };
                    if (ext.startsWith('ppt')) return { bg: 'bg-orange-100 text-orange-700', label: 'PPT' };
                    if (ext === 'pdf') return { bg: 'bg-red-100 text-red-700', label: 'PDF' };
                    return { bg: 'bg-gray-100 text-gray-700', label: (ext || 'FILE').toUpperCase().slice(0,4) };
                  })();
                  return (
                    <button
                      onClick={() => {
                        if (canPreview) {
                          setPreviewFile({ url, name, mime, size });
                        } else {
                          const a = document.createElement('a');
                          a.href = url;
                          if (name) a.setAttribute('download', name);
                          a.target = '_blank';
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        }
                      }}
                      className={`w-[260px] text-left rounded-2xl ${isOwnMessage ? 'bg-white/15 backdrop-blur-sm text-white' : 'bg-white text-gray-900 border border-black/[0.06]'} p-3 shadow-sm hover:shadow transition-shadow`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-12 rounded-lg flex items-center justify-center text-xs font-semibold ${icon.bg}`}>{icon.label}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm truncate ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>{name}</div>
                          <div className={`mt-1 text-xs ${isOwnMessage ? 'opacity-80' : 'text-gray-500'}`}>{size ? formatBytes(size) : (ext ? ext.toUpperCase() : '文件')}</div>
                          <div className="mt-2 flex items-center gap-2">
                            {canPreview && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${isOwnMessage ? 'bg-white/20' : 'bg-gray-100 text-gray-700'}`}>点击预览</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })()}
                {!['sticker', 'emoji', 'image', 'video', 'file', 'assessment', 'invite_assessment'].includes(message.messageType) && (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                {message.messageType === 'assessment' && (() => {
                  let data: any = null;
                  try {
                    data = JSON.parse(message.content);
                  } catch {}
                  return (
                    <div
                      className={`rounded-2xl ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                          : 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-900 border border-blue-100'
                      } p-3 shadow-sm`}
                    >
                      <div className="flex items-center mb-1">
                        <span className="text-lg mr-2">🧠</span>
                        <span className="font-semibold">{getAssessmentDisplayName(data?.type)} 简要结果</span>
                      </div>
                      <div className="mt-1">
                        <div className={`rounded-xl ${isOwnMessage ? 'bg-white/15 text-white' : 'bg-white text-gray-800 border border-black/[0.05]'} p-2.5`}>
                          <div className="text-xs leading-5 flex items-center justify-between gap-3">
                            <div>{data?.summary || '查看详情以了解完整结果'}</div>
                            <button
                              onClick={() => openAssessmentDetail(data?.id, message.id)}
                              className={`text-xs px-2 py-1 rounded ${isOwnMessage ? 'bg-white/20' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}
                            >
                              查看详情
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {message.messageType === 'invite_assessment' && (() => {
                  let data: any = null;
                  try { data = JSON.parse(message.content); } catch {}
                  const isInviter = message.sender.id === currentUserId;
                  const status: string = data?.status || 'pending';
                  return (
                    <div className={`rounded-2xl ${isOwnMessage ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' : 'bg-white text-gray-900 border border-gray-200'} p-3 shadow-sm`}>
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">📨</span>
                        <span className="font-semibold">{isInviter ? '邀请对方进行心理测评' : '邀请你进行心理测评'}</span>
                      </div>
                      <div className={`${isOwnMessage ? 'bg-white/15 text-white' : 'bg-gray-50 text-gray-800'} rounded-xl p-3`}>
                        <div className="text-sm flex items-center justify-between gap-3">
                          <span>类型：{getAssessmentDisplayName(data?.type)}</span>
                          {status === 'pending' && !isInviter && selectedRoom && (
                            <div className="flex gap-2 ml-2">
                              <button onClick={() => handleInviteAction('accept', message.id)} className="px-2 py-1 rounded bg-blue-600 text-white text-xs">接受</button>
                              <button onClick={() => handleInviteAction('reject', message.id)} className="px-2 py-1 rounded bg-gray-200 text-gray-800 text-xs">拒绝</button>
                            </div>
                          )}
                        </div>
                        {status === 'pending' && isInviter && (
                          <div className={`mt-2 text-xs ${isOwnMessage ? 'opacity-80' : 'text-gray-500'}`}>等待对方处理…</div>
                        )}
                        {status === 'accepted' && (() => {
                          const percent = typeof data?.progress?.percent === 'number' ? Math.max(0, Math.min(100, Math.round(data.progress.percent))) : null;
                          const paused = !!data?.paused;
                          const inProgress = !!data?.inProgress && !paused;
                          return (
                            <div className="mt-2">
                              {inProgress ? (
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs ${isOwnMessage ? 'opacity-80' : 'text-gray-600'}`}>{isInviter ? '对方已同意，测试结果在完成后展示' : '正在测试中…'}</span>
                                </div>
                              ) : (
                                <>
                                  {typeof percent === 'number' && (
                                    <div className="mb-2">{renderProgressBar('进度', percent)}</div>
                                  )}
                                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                                    <span className={`text-xs ${isOwnMessage ? 'opacity-80' : 'text-gray-600'} mr-2`}>{isInviter ? '对方可继续测试' : '已暂停，可继续或取消'}</span>
                                    {!isInviter && (
                                      <div className="flex gap-2 ml-2 sm:ml-3">
                                        <button
                                          onClick={() => continueInviteAssessment(message.id, data?.type)}
                                          className={`px-2 py-1 rounded text-xs ${continuingInviteIds[message.id] ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                          disabled={!!continuingInviteIds[message.id]}
                                        >
                                          {continuingInviteIds[message.id] ? '处理中…' : '继续'}
                                        </button>
                                        <button onClick={() => confirmCancelInvite(message.id)} className="px-2 py-1 rounded bg-gray-200 text-gray-800 text-xs">取消</button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                        {status === 'canceled' && (
                          <div className={`mt-2 text-xs ${isOwnMessage ? 'opacity-80' : 'text-gray-600'}`}>{isInviter ? '对方已取消测试' : '您已取消测试'}</div>
                        )}
                        {status === 'rejected' && (
                          <div className={`mt-2 text-xs ${isOwnMessage ? 'opacity-80' : 'text-gray-600'}`}>{isInviter ? '对方已拒绝' : '已拒绝该邀请'}</div>
                        )}
                        {status === 'completed' && (
                          <div className="mt-2">
                            <div className={`${isOwnMessage ? 'bg-white/15' : 'bg-white border border-black/[0.06]'} rounded-xl p-2.5`}>
                              <div className="text-xs">简要结果：{data?.summary || '已完成'}</div>
                              {data?.assessmentId && (
                                <div className="mt-2 text-right">
                                  <button onClick={() => openAssessmentDetail(data.assessmentId, message.id)} className={`${isOwnMessage ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'} text-xs px-2 py-1 rounded`}>
                                    查看详情
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <div
                  className={`absolute top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                    isOwnMessage ? '-left-32 text-right' : '-right-32 text-left'
                  }`}
                >
                  <span className="text-[11px] text-gray-400">
                    {new Date(message.createdAt).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* 已移除：单条消息悬浮删除按钮，避免误触且视觉更干净 */}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 名称显示：SDS -> SDS/SAS
  const getAssessmentDisplayName = (type?: string) => {
    const t = String(type || '').toUpperCase();
    return t === 'SDS' ? 'SDS/SAS' : (t || '心理测评');
  };

  const findInviteIdByMessageId = (messageId: string): string | null => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return null;
    try {
      const data = JSON.parse(msg.content || '{}');
      return data?.inviteId || null;
    } catch { return null; }
  };

  const handleInviteAction = async (action: 'accept' | 'reject', messageId: string) => {
    try {
      const token = localStorage.getItem('token'); if (!token) return;
      let inviteId = findInviteIdByMessageId(messageId);
      if (!inviteId) {
        // 回退：服务端按 messageId 解析
        inviteId = messageId;
      }
      const r = await fetch(`/api/chat/messages/invite/${encodeURIComponent(inviteId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      if (r.ok && action === 'accept') {
        // 受邀方接受后，直接创建测评并打开弹窗
        const mr = messages.find(m => m.id === messageId);
        let type: string | undefined;
        try { type = JSON.parse(mr?.content || '{}')?.type; } catch {}
        if (type) {
          const cr = await fetch('/api/assessments', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ type, inviteId }) });
          if (cr.ok) {
            const d = await cr.json();
            // 本地立即将邀请卡片置为进行中，并设置强制覆盖
            setMessages(prev => prev.map(msg => {
              if (msg.id !== messageId) return msg;
              let content: any = {}; try { content = JSON.parse(msg.content || '{}'); } catch {}
              const nextPayload = { ...content, status: 'accepted', inProgress: true, paused: false, assessmentId: d.assessment?.id };
              return { ...msg, content: JSON.stringify(nextPayload) } as any;
            }));
            forceInProgressMessageIdsRef.current.add(messageId);
            setAssessmentModal({ open: true, loading: true, data: { assessment: d.assessment, fromInviteMessageId: messageId, __buffer__: 'load' } });
            setTimeout(() => {
              setAssessmentModal({ open: true, loading: false, data: { assessment: d.assessment, fromInviteMessageId: messageId } });
            }, 200);
          }
        }
      }
    } catch {}
  };

  const continueInviteAssessment = async (messageId: string, type?: string) => {
    try {
      const token = localStorage.getItem('token'); if (!token) return;
      // 防重复点击：若已在处理中则忽略
      if (continuingInviteIds[messageId]) return;
      setContinuingInviteIds(prev => ({ ...prev, [messageId]: true }));
      // 本地立即置为“正在测试中…”，避免等待网络
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        let content: any = {}; try { content = JSON.parse(msg.content || '{}'); } catch {}
        const nextPayload = { ...content, status: 'accepted', inProgress: true, paused: false };
        return { ...msg, content: JSON.stringify(nextPayload) } as any;
      }));
      // 记录本地覆盖：只要弹窗打开，邀请卡片保持“正在测试中…”
      forceInProgressMessageIdsRef.current.add(messageId);
      // 优先根据消息里可能携带的 assessmentId 查询；若无则按类型回退
      let assessment: any | null = null;
      try {
        const msg = messages.find(m => m.id === messageId);
        let cid: string | undefined;
        try { cid = msg ? JSON.parse(msg.content || '{}')?.assessmentId : undefined; } catch {}
        if (cid) {
          const rr = await fetch(`/api/assessments?id=${encodeURIComponent(cid)}`, { headers: { Authorization: `Bearer ${token}` } });
          if (rr.ok) { const dd = await rr.json(); assessment = dd.assessment || null; }
        }
      } catch {}
      if (!assessment) {
        const r = await fetch(`/api/assessments?type=${encodeURIComponent(type || '')}&limit=1`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const d = await r.json();
          assessment = (d.assessments || []).find((x: any) => x.status === 'in_progress') || d.assessments?.[0] || null;
        }
      }
      if (assessment) {
        setAssessmentModal({ open: true, loading: true, data: { assessment, fromInviteMessageId: messageId, __buffer__: 'load' } });
        setTimeout(() => {
          setAssessmentModal({ open: true, loading: false, data: { assessment, fromInviteMessageId: messageId } });
        }, 200);
        // 不在这里更新服务端页码，避免错误地重置为 0；由弹窗初始化后统一解除暂停
      }
    } catch {}
    finally {
      setTimeout(() => setContinuingInviteIds(prev => ({ ...prev, [messageId]: false })), 400);
    }
  };

  const confirmCancelInvite = async (messageId: string) => {
    // 使用右侧作用域对话框，避免遮挡左侧列表
    setCancelTestDialog({ open: true, messageId });
  };

  // 渲染辅助：进度条（更精美：圆角+内阴影+渐变）
  const renderProgressBar = (label: string, percent: number, colorClass = 'bg-blue-500') => {
    const width = Math.max(0, Math.min(100, Math.round(percent)));
    const gradient = colorClass.includes('rose')
      ? 'from-rose-500 to-rose-400'
      : colorClass.includes('amber')
      ? 'from-amber-500 to-amber-400'
      : colorClass.includes('emerald')
      ? 'from-emerald-500 to-emerald-400'
      : 'from-blue-500 to-indigo-500';
    return (
      <div className="space-y-1.5" key={label}>
        <div className="flex items-center justify-between text-[13px] text-gray-600">
          <span className="truncate pr-2">{label}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px]">{width}%</span>
        </div>
        <div className="h-3 rounded-full bg-gray-100/80 border border-black/[0.05] overflow-hidden shadow-inner">
          <div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-500 ease-out`} style={{ width: `${width}%` }} />
        </div>
      </div>
    );
  };

  const normalizeNumericEntries = (obj: any): Array<{ key: string; value: number }> => {
    if (!obj || typeof obj !== 'object') return [];
    const entries = Object.entries(obj)
      .filter(([k, v]) => typeof v === 'number' && isFinite(v) && !/overall|score_total|sum/i.test(k))
      .map(([key, value]) => ({ key: String(key), value: Number(value) }));
    if (entries.length === 0) return [];
    const maxVal = entries.reduce((m, e) => Math.max(m, e.value), 0);
    // 如果原值像 1~5 或 1~10 级别，按最大值归一化到百分比；否则若已>100 则按 100 封顶
    return entries.map(e => ({
      key: e.key,
      value: maxVal <= 10 ? (e.value / maxVal) * 100 : Math.min(100, e.value)
    }));
  };

  const renderMbtiSection = (data: any) => {
    const analysis = data?.analysisResult || {};
    const type = data?.personalityType || data?.typeDesc;
    const pairs: Array<[string, string, number | null]> = [];
    const pairDefs: Array<[string, string, string?]> = [
      ['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']
    ];
    for (const [a, b] of pairDefs) {
      let leftPercent: number | null = null;
      // 支持 {E: 60, I: 40} 或 {EI: 60}
      if (typeof analysis?.[a] === 'number' && typeof analysis?.[b] === 'number' && analysis[a] + analysis[b] > 0) {
        leftPercent = Math.round((analysis[a] / (analysis[a] + analysis[b])) * 100);
      } else if (typeof analysis?.[`${a}${b}`] === 'number') {
        leftPercent = Math.max(0, Math.min(100, Math.round(analysis[`${a}${b}`])));
      }
      pairs.push([a, b, leftPercent]);
    }
    return (
      <div className="space-y-3">
        {(data?.personalityType) && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
            <div className="w-12 h-12 rounded-xl bg-white border border-black/[0.06] flex items-center justify-center overflow-hidden">
              <img src={getMbtiIconPath(data.personalityType)} alt={data.personalityType} className="w-10 h-10 object-contain" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900 tracking-wide">{data.personalityType}</div>
              {data?.analysisResult?.summary && (
                <div className="text-xs text-gray-600">{String(data.analysisResult.summary)}</div>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pairs.map(([a, b, lp]) => (
            <div key={`${a}${b}`} className="p-3 rounded-xl bg-white border border-black/[0.06]">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>{a}</span>
                <span>{b}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100/80 border border-black/[0.05] overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${lp ?? 50}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderScl90Section = (data: any) => {
    const analysis = data?.analysisResult || {};
    const items = normalizeNumericEntries(analysis);
    if (items.length === 0) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(it => renderProgressBar(it.key, it.value, it.value > 66 ? 'bg-rose-500' : it.value > 33 ? 'bg-amber-500' : 'bg-emerald-500'))}
      </div>
    );
  };

  const renderGenericNumericSection = (data: any) => {
    const analysis = data?.analysisResult || {};
    const items = normalizeNumericEntries(analysis);
    if (items.length === 0) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(it => renderProgressBar(it.key, it.value))}
      </div>
    );
  };

  const renderAssessmentAnalysis = (data: any) => {
    if (!data?.analysisResult) return null;
    const t = String(data?.type || '').toUpperCase();
    // SDS/SAS 专用卡片
    if (t === 'SDS' || t === 'SDS/SAS') {
      try {
        const details = data?.analysisResult?.details || {};
        const sdsIndex = details?.sds?.index;
        const sasIndex = details?.sas?.index;
        const sdsLabel = details?.sds?.severity || '-';
        const sasLabel = details?.sas?.severity || '-';
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white border border-purple-200/60">
                <div className="text-xs text-purple-700 mb-1">SDS 抑郁指数</div>
                {typeof sdsIndex === 'number' ? renderProgressBar('SDS 标准分', sdsIndex, 'bg-rose-500') : <div className="text-xs text-gray-500">暂无数据</div>}
                <div className="mt-1 text-[11px] text-gray-500">严重程度：{String(sdsLabel)}</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-indigo-200/60">
                <div className="text-xs text-indigo-700 mb-1">SAS 焦虑指数</div>
                {typeof sasIndex === 'number' ? renderProgressBar('SAS 标准分', sasIndex, 'bg-amber-500') : <div className="text-xs text-gray-500">暂无数据</div>}
                <div className="mt-1 text-[11px] text-gray-500">严重程度：{String(sasLabel)}</div>
              </div>
            </div>
            {Array.isArray(data?.psychologicalTags) && data.psychologicalTags.length > 0 && (
              <div className="p-3 rounded-xl bg-white border border-black/[0.06]">
                <div className="text-sm font-medium mb-2">心理标签</div>
                <div className="flex flex-wrap gap-2">
                  {data.psychologicalTags.map((tag: string, idx: number) => (
                    <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {data?.recommendations && (
              <div className="p-3 rounded-xl bg-white border border-black/[0.06]">
                <div className="text-sm font-medium mb-2">建议</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{String(data.recommendations)}</div>
              </div>
            )}
          </div>
        );
      } catch {}
    }
    return (
      <div className="p-3 rounded-xl bg-white border border-black/[0.06]">
        <div className="text-sm font-medium mb-2">分析结果</div>
        {t === 'MBTI' ? (
          renderMbtiSection(data)
        ) : t === 'SCL90' ? (
          renderScl90Section(data)
        ) : (
          renderGenericNumericSection(data)
        )}
      </div>
    );
  };

  // 在弹窗内进行测评的内嵌组件（Apple风格，轻盈、圆角、柔和对比）
  function InlineAssessmentRunner({
    type,
    assessment,
    onDone,
    onCancel
  }: {
    type: 'MBTI' | 'SCL90' | 'SDS' | 'SDS/SAS';
    assessment: { id: string; type?: string };
    onDone: (detail: any) => void;
    onCancel: () => void;
  }) {
    // 缓存题目以避免反复出现"加载题目中"
    const cachedRaw = typeof window !== 'undefined' ? sessionStorage.getItem('assessment_q_' + assessment.id) : null;
    const cached = (() => { try { return cachedRaw ? JSON.parse(cachedRaw) : null; } catch { return null; } })();
    const [loading, setLoading] = useState(!cached);
    const hasShownQuestionsRef = useRef(!!cached);
    const [submitting, setSubmitting] = useState(false);
    const [questions, setQuestions] = useState<any[]>(cached?.questions || []);
    const [instruction, setInstruction] = useState<string>(cached?.instruction || '');
    const [scaleOptions, setScaleOptions] = useState<{ value: number; label: string }[]>(cached?.options || []);
    const [answers, setAnswers] = useState<Record<string, string | number>>({});
    const [currentPage, setCurrentPage] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [mbtiMode, setMbtiMode] = useState<'quick' | 'pro'>('pro');
    const saveDebounceRef = useRef<any>(null);
    const elapsedRef = useRef(0);
    const answersRef = useRef<Record<string, string | number>>({});
    const lastInitIdRef = useRef<string | null>(null);
    const desiredPageRef = useRef<number | null>(null);
    const desiredAnchorIndexRef = useRef<number | null>(null);
    const hasUnpausedRef = useRef(false);

    const normalizedType = (type === 'SDS/SAS' ? 'SDS' : type) as 'MBTI' | 'SCL90' | 'SDS';

    useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

    // 计时器
    useEffect(() => {
      let timer: any;
      if (!isPaused && !submitting) {
        timer = setInterval(() => setElapsed((e) => e + 1), 1000);
      }
      return () => { if (timer) clearInterval(timer); };
    }, [isPaused, submitting]);

    useEffect(() => {
      if (lastInitIdRef.current === assessment.id) return;
      lastInitIdRef.current = assessment.id;
      const init = async () => {
        try {
          if (!hasShownQuestionsRef.current) setLoading(true);
          const token = localStorage.getItem('token');
          if (!token) throw new Error('no token');

          // 恢复已有进度
          try {
            const r = await fetch(`/api/assessments?id=${encodeURIComponent(assessment.id)}`, { headers: { Authorization: `Bearer ${token}` } });
            if (r.ok) {
              const d = await r.json();
              const a = d.assessment;
              // 读取本地缓存的进度作为兜底，避免浏览器 keepalive 丢失导致的回退
              const localRaw = typeof window !== 'undefined' ? sessionStorage.getItem('assessment_p_' + assessment.id) : null;
              let localProgress: any = null;
              try { localProgress = localRaw ? JSON.parse(localRaw) : null; } catch { localProgress = null; }
              const serverAnswers = a?.rawAnswers || {};
              const serverAnswered = serverAnswers ? Object.keys(serverAnswers).length : 0;
              const serverPage = typeof a?.currentPage === 'number' ? a.currentPage : 0;
              const serverElapsed = typeof a?.elapsedTime === 'number' ? a.elapsedTime : 0;
              const localAnswers = localProgress?.answers || {};
              const localAnswered = localAnswers ? Object.keys(localAnswers).length : -1;
              const localPage = typeof localProgress?.currentPage === 'number' ? localProgress.currentPage : -1;
              const localElapsed = typeof localProgress?.elapsedTime === 'number' ? localProgress.elapsedTime : -1;
              const preferLocal = localProgress && localAnswered >= serverAnswered;
              const finalAnswers = preferLocal ? localAnswers : serverAnswers;
              const finalPage = Math.max(0, preferLocal ? localPage : serverPage);
              const finalElapsed = Math.max(0, preferLocal ? localElapsed : serverElapsed);
              // 若缺少页码信息，则依据已答题数推断页码
              const answersCount = finalAnswers ? Object.keys(finalAnswers).length : 0;
              const qpp = normalizedType === 'MBTI' ? 10 : (normalizedType === 'SCL90' ? 12 : 10);
              const inferredPage = Math.max(0, Math.ceil(answersCount / qpp) - 1);
              const initialPage = (preferLocal && localPage >= 0) || (!preferLocal && serverPage > 0)
                ? finalPage
                : inferredPage;
              if (finalAnswers) { setAnswers(finalAnswers); answersRef.current = finalAnswers; }
              setCurrentPage(initialPage);
              desiredPageRef.current = initialPage;
              // 记录希望锚定的题号（下一题），用于恢复时将其滚到顶部
              try {
                const answered = finalAnswers ? Object.keys(finalAnswers).length : 0;
                desiredAnchorIndexRef.current = Math.max(1, answered + 1);
              } catch { desiredAnchorIndexRef.current = null; }
              setElapsed(finalElapsed);
              // 一旦进入弹窗，视为继续测试，立刻清除暂停状态并启动计时
              setIsPaused(false);
            }
          } catch {}

          if (!cached) {
            await fetchQuestions();
          } else {
            hasShownQuestionsRef.current = true;
          }
        } finally {
          setLoading(false);
          // 进入弹窗后，向服务端声明解除暂停，但保留现有进度与页码
          try {
            if (!hasUnpausedRef.current) {
              hasUnpausedRef.current = true;
              await saveProgress({ isPaused: false });
            }
          } catch {}
        }
      };
      init();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assessment.id]);

    const fetchQuestions = async (overrideMode?: 'quick'|'pro') => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const modeToUse = overrideMode || mbtiMode;
      const url = normalizedType === 'MBTI'
        ? `/api/assessments/questions?type=MBTI&mode=${modeToUse}`
        : `/api/assessments/questions?type=${normalizedType}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const q = Array.isArray(data.questions) ? data.questions : [];
        setQuestions(q);
        setInstruction(data.instruction || '请根据您最近一周的实际感受作答。');
        if (Array.isArray(data.options)) setScaleOptions(data.options);
        if (q.length > 0) {
          hasShownQuestionsRef.current = true;
        }
        // 写入缓存，防止二次进入时闪 loading
        try { sessionStorage.setItem('assessment_q_' + assessment.id, JSON.stringify({ questions: q, instruction: data.instruction || '', options: data.options || [] })); } catch {}
        // 不在做题过程中回写进度到卡片；仅在暂停/关闭时更新
        if (desiredPageRef.current !== null) {
          const maxIndex = Math.max(0, Math.min(Math.ceil(q.length / questionsPerPage) - 1, desiredPageRef.current));
          setCurrentPage(maxIndex);
          // 等待一帧后若指定了锚点题号，则将其滚动到容器顶部，以便继续从下一题开始
          const anchor = desiredAnchorIndexRef.current;
          desiredPageRef.current = null;
          if (typeof anchor === 'number' && anchor > 0) {
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
              window.requestAnimationFrame(() => { try { scrollToQuestionIndex(anchor); } catch {} });
            } else {
              setTimeout(() => { try { scrollToQuestionIndex(anchor); } catch {} }, 0);
            }
            desiredAnchorIndexRef.current = null;
          } else {
            // 若没有锚点，至少滚到顶部
            setTimeout(scrollToTop, 0);
          }
        }
      }
    };

    const questionsPerPage = normalizedType === 'MBTI' ? 10 : (normalizedType === 'SCL90' ? 12 : 10);
    const totalPages = Math.max(1, Math.ceil((questions?.length || 0) / questionsPerPage));
    const getCurrentPageQuestions = () => {
      const start = currentPage * questionsPerPage;
      return questions.slice(start, start + questionsPerPage);
    };
    const canGoNext = () => {
      const list = getCurrentPageQuestions();
      return list.every(q => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '');
    };
    const answeredCount = Object.keys(answers || {}).length;
    const progress = questions.length > 0 ? Math.round(answeredCount / questions.length * 100) : 0;

    // 当需要将某个题号锚定到顶部时，在页码或题目渲染完成后平滑滚动
    useEffect(() => {
      const anchor = desiredAnchorIndexRef.current;
      if (typeof anchor === 'number' && anchor > 0) {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(() => { try { scrollToQuestionIndex(anchor); } catch {} });
        } else {
          setTimeout(() => { try { scrollToQuestionIndex(anchor); } catch {} }, 0);
        }
        desiredAnchorIndexRef.current = null;
      }
    }, [currentPage, questions]);

    const saveProgress = async (opts?: { keepalive?: boolean; isPaused?: boolean; currentPage?: number }) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        // 先本地缓存一次，增强稳定性
        try {
          sessionStorage.setItem('assessment_p_' + assessment.id, JSON.stringify({
            answers: answersRef.current,
            currentPage: typeof opts?.currentPage === 'number' ? opts.currentPage : currentPage,
            elapsedTime: elapsedRef.current,
            ts: Date.now()
          }));
        } catch {}
        await fetch(`/api/assessments/${assessment.id}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            currentPage: typeof opts?.currentPage === 'number' ? opts.currentPage : currentPage,
            answers: answersRef.current,
            elapsedTime: elapsedRef.current,
            isPaused: opts?.isPaused === true
          }),
          keepalive: opts?.keepalive === true
        } as RequestInit);
        // 网络返回后无需再次本地合并
      } catch {}
    };

    // 在组件被关闭/卸载时，默认标记为暂停，便于邀请卡片显示"已暂停"状态
    useEffect(() => {
      const onBeforeUnload = () => { try { saveProgress({ isPaused: true, keepalive: true }); } catch {} };
      window.addEventListener('beforeunload', onBeforeUnload);
      return () => { try { saveProgress({ isPaused: true, keepalive: true }); } catch {} finally { window.removeEventListener('beforeunload', onBeforeUnload); } };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAnswer = (qid: string, value: string | number) => {
      setAnswers(prev => {
        const next = { ...prev, [qid]: value };
        answersRef.current = next;
        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = setTimeout(() => { saveProgress(); }, 800);
        // 不在做题过程中更新邀请卡片，避免闪烁
        return next;
      });
    };

    const scrollToTop = () => {
      try {
        const el = document.querySelector('[data-assessment-scroll="true"]') as HTMLElement | null;
        if (!el) return;
        // 使用原生平滑滚动，避免"瞬移"生硬
        el.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    };

    const scrollToQuestionIndex = (globalIndex: number) => {
      try {
        const container = document.querySelector('[data-assessment-scroll="true"]') as HTMLElement | null;
        if (!container) return;
        const target = container.querySelector(`[data-q-index="${globalIndex}"]`) as HTMLElement | null;
        if (!target) return;
        const containerTop = container.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        const nextTop = container.scrollTop + (targetTop - containerTop);
        container.scrollTo({ top: Math.max(0, nextTop - 2), behavior: 'smooth' });
      } catch {}
    };
    const handleNext = async () => {
      if (currentPage < totalPages - 1) {
        await saveProgress({ currentPage: currentPage + 1 });
        setCurrentPage(p => p + 1);
        // 平滑滚动到新页顶部
        setTimeout(scrollToTop, 0);
      }
    };
    const handlePrev = async () => {
      if (currentPage > 0) {
        await saveProgress({ currentPage: currentPage - 1 });
        setCurrentPage(p => p - 1);
        setTimeout(scrollToTop, 0);
      }
    };

    const handleSubmit = async () => {
      const unanswered = questions.filter(q => answers[q.id] === undefined);
      if (unanswered.length > 0) {
        window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: `还有 ${unanswered.length} 题未作答` } }));
        return;
      }
      try {
        setSubmitting(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('no token');
        const payloadAnswers = normalizedType === 'MBTI'
          ? Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, String(v)]))
          : Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, Number(v)]));
        const res = await fetch(`/api/assessments/${assessment.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ answers: payloadAnswers, completionTime: elapsedRef.current })
        });
        const d = await res.json();
        if (res.ok) {
          const detail = {
            ...(d.assessment || {}),
            type: (d.assessment?.type === 'SDS' ? 'SDS/SAS' : d.assessment?.type) || type,
            analysisResult: d.analysis,
            psychologicalTags: d.analysis?.psychologicalTags || [],
            recommendations: d.analysis?.recommendations,
            overallScore: d.analysis?.overallScore,
            riskLevel: d.analysis?.riskLevel,
            completionTime: d.assessment?.completionTime ?? elapsedRef.current
          };
          onDone(detail);
        } else {
          window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: d.error || '提交失败' } }));
        }
      } catch (e) {
        window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: '提交失败' } }));
      } finally {
        setSubmitting(false);
      }
    };

    const formatTime = (s: number) => {
      const m = Math.floor(s / 60);
      const ss = s % 60;
      return `${m}:${String(ss).padStart(2, '0')}`;
    };

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-gray-50 border border-black/[0.06]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-sm font-medium text-gray-900">{type === 'MBTI' ? 'MBTI 人格倾向测评' : type === 'SCL90' ? 'SCL-90 症状自评' : 'SDS/SAS 抑郁/焦虑'}（进行中）</div>
            {normalizedType === 'MBTI' && (
              <div className="inline-flex rounded-full bg-white border border-black/[0.08] p-0.5">
                <button
                  onClick={async () => {
                    setMbtiMode('quick');
                    setLoading(true);
                    await fetchQuestions('quick');
                    setLoading(false);
                    setAnswers({});
                    answersRef.current = {};
                    setCurrentPage(0);
                  }}
                  className={`px-2 py-1 text-xs rounded-full ${mbtiMode==='quick'?'bg-blue-600 text-white':'text-gray-700 hover:bg-gray-100'}`}
                >快速</button>
                <button
                  onClick={async () => {
                    setMbtiMode('pro');
                    setLoading(true);
                    await fetchQuestions('pro');
                    setLoading(false);
                    setAnswers({});
                    answersRef.current = {};
                    setCurrentPage(0);
                  }}
                  className={`px-2 py-1 text-xs rounded-full ${mbtiMode==='pro'?'bg-blue-600 text-white':'text-gray-700 hover:bg-gray-100'}`}
                >专业</button>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-600">{instruction || '请根据您最近一周的实际感受，诚实作答。'}</div>
        </div>

        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${progress}%` }} />
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">加载题目中…</div>
        ) : (
          <div className="space-y-3">
            {getCurrentPageQuestions().map((q, idx) => (
              <div key={q.id} className="p-3 rounded-xl bg-white border border-black/[0.06]" data-q-index={currentPage * questionsPerPage + idx + 1}>
                <div className="text-sm text-gray-900 mb-2"><span className="text-gray-500 mr-1">{currentPage * questionsPerPage + idx + 1}.</span>{q.text}</div>
                {normalizedType === 'MBTI' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button onClick={() => handleAnswer(q.id, 'A')} className={`w-full text-left p-3 rounded-xl border ${answers[q.id]==='A'?'border-blue-400 bg-blue-50':'border-gray-200 hover:bg-gray-50'} transition-colors`}>
                      <div className="text-[11px] text-gray-500 mb-0.5">选项 A</div>
                      <div className="text-sm text-gray-900">{q.options?.A || 'A'}</div>
                    </button>
                    <button onClick={() => handleAnswer(q.id, 'B')} className={`w-full text-left p-3 rounded-xl border ${answers[q.id]==='B'?'border-blue-400 bg-blue-50':'border-gray-200 hover:bg-gray-50'} transition-colors`}>
                      <div className="text-[11px] text-gray-500 mb-0.5">选项 B</div>
                      <div className="text-sm text-gray-900">{q.options?.B || 'B'}</div>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(scaleOptions || []).map(opt => (
                      <button key={opt.value} onClick={() => handleAnswer(q.id, opt.value)} className={`px-3 py-1.5 rounded-full text-sm border ${answers[q.id]===opt.value?'bg-blue-600 text-white border-blue-600':'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'}`}>{opt.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-3 pb-0">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white rounded-t-xl shadow-[0_-6px_12px_-6px_rgba(0,0,0,0.06)]">
            <div className="text-xs text-gray-500">已答 {answeredCount}/{questions.length} · 用时 {formatTime(elapsed)}</div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} disabled={currentPage===0} className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-800 disabled:opacity-50">上一页</button>
              {currentPage < totalPages - 1 ? (
                <button onClick={handleNext} disabled={!canGoNext()} className="px-3 py-1.5 rounded-full text-sm bg-blue-600 text-white disabled:opacity-50">下一页</button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting || !canGoNext()} className="px-4 py-1.5 rounded-full text-sm bg-gradient-to-r from-blue-500 to-indigo-500 text-white disabled:opacity-50">{submitting? '提交中…' : '提交测评'}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  const fetchAssessmentDetail = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const r = await fetch(`/api/assessments?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      const d = await r.json();
      return d.assessment || null;
    } catch { return null; }
  };
  const openAssessmentDetail = async (id?: string, relatedMessageId?: string) => {
    if (!id) return;
    setAssessmentModal({ open: true, loading: true, data: { __buffer__: 'load' } });
    let detail: any = null;
    try {
      const token = localStorage.getItem('token');
      if (token && relatedMessageId) {
        const r = await fetch(`/api/assessments/view?assessmentId=${encodeURIComponent(id)}&messageId=${encodeURIComponent(relatedMessageId)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const d = await r.json();
          detail = d.assessment || null;
        }
      }
    } catch {}
    if (!detail) detail = await fetchAssessmentDetail(id);
    setAssessmentModal({ open: true, loading: false, data: detail });
  };

  const handleCloseAssessmentModal = async () => {
    try {
      const data = assessmentModal?.data as any;
      const assessId: string | undefined = data?.assessment?.id;
      if (assessId) {
        let answers: Record<string, string | number> = {};
        let currentPage = 0;
        let elapsedTime = 0;
        try {
          const raw = typeof window !== 'undefined' ? sessionStorage.getItem('assessment_p_' + assessId) : null;
          if (raw) {
            const p = JSON.parse(raw);
            answers = p?.answers || {};
            currentPage = typeof p?.currentPage === 'number' ? p.currentPage : 0;
            elapsedTime = typeof p?.elapsedTime === 'number' ? p.elapsedTime : 0;
          }
        } catch {}
        let total = 0;
        try {
          const qraw = typeof window !== 'undefined' ? sessionStorage.getItem('assessment_q_' + assessId) : null;
          if (qraw) {
            const q = JSON.parse(qraw);
            total = Array.isArray(q?.questions) ? q.questions.length : 0;
          }
        } catch {}
        const answered = Object.keys(answers || {}).length;
        let percent = 0;
        if (total > 0) percent = Math.max(0, Math.min(100, Math.round((answered / total) * 100)));
        // 优先本地更新邀请卡片为“已暂停”，并带上进度
        try {
          let relatedId: string | null | undefined = data?.fromInviteMessageId;
          if (!relatedId) {
            const found = messages.find(m => {
              try { const c = JSON.parse(m.content || '{}'); return m.messageType === 'invite_assessment' && String(c?.assessmentId || '') === String(assessId); } catch { return false; }
            });
            if (found) relatedId = found.id;
          }
          if (relatedId) {
            setMessages(prev => prev.map(msg => {
              if (msg.id !== relatedId) return msg;
              let content: any = {}; try { content = JSON.parse(msg.content || '{}'); } catch {}
              const newPayload = { ...content, status: 'accepted', inProgress: false, paused: true, assessmentId: assessId, progress: { ...(content.progress || {}), answeredCount: answered, total, percent } };
              return { ...msg, content: JSON.stringify(newPayload) } as any;
            }));
          }
        } catch {}
        // 保存缓冲态并锁定“正在测试中…”覆盖取消
        if (data?.fromInviteMessageId) {
          forceInProgressMessageIdsRef.current.delete(data.fromInviteMessageId);
        }
        setAssessmentModal(prev => ({ open: true, loading: true, data: { ...(prev?.data||{}), __buffer__: 'save' } }));
        // 异步保存到服务端（不等待），并通过进度接口触发邀请卡片回写 paused + progress
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          if (token) {
            fetch(`/api/assessments/${assessId}/progress`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ currentPage, answers, elapsedTime, isPaused: true })
            } as RequestInit).catch(() => {}).finally(() => {
              // 轻微缓冲后关闭，以保证保存动画有感知
              setTimeout(() => setAssessmentModal({ open: false, loading: false, data: null }), 250);
            });
          }
        } catch {}
      }
    } finally {
      // 交由保存请求的 finally 统一关闭；若没有 assessId 则此处直接关闭
      if (!((assessmentModal?.data as any)?.assessment?.id)) setAssessmentModal({ open: false, loading: false, data: null });
    }
  };

  const sendLatestAssessmentCard = async (type: 'MBTI'|'SCL90'|'SDS'|'SDS/SAS') => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !selectedRoom) return;
      let a = myLatestAssessments?.[type];
      if (!a) {
        const r = await fetch(`/api/assessments?type=${type}&limit=1`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); a = d.assessments?.[0]; }
      }
      // 仅允许发送“已完成/已分析”的测评
      if (!a || (a.status !== 'completed' && a.status !== 'analyzed')) {
        const name = getAssessmentDisplayName(type);
        setScopedError({ open: true, title: '操作失败', message: `暂无${name}已完成记录，请完成测试后再发送` });
        return;
      }
      const summary = getAssessmentSummary({ ...a, type });
      await sendAttachment({ type: 'assessment', data: { id: a.id, type, summary } });
      setActivePanel('none');
    } catch {}
  };
  const routeForAssessmentType = (type?: string) => {
    const t = String(type || '').toUpperCase();
    if (t === 'MBTI') return '/assessments/mbti';
    if (t === 'SCL90') return '/assessments/scl90';
    return '/assessments/sds'; // SDS 或 SDS/SAS
  };

  const formatBytes = (size?: number) => {
    if (!size || size <= 0) return '';
    const units = ['B','KB','MB','GB','TB'];
    let v = size; let i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
  };

  const startAssessmentInModal = async (type?: string) => {
    if (!type) return;
    setAssessmentModal({ open: true, loading: true, data: { __start__: String(type).toUpperCase() } });
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('no token');
      const r = await fetch('/api/assessments', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ type }) });
      const d = await r.json();
      if (r.ok && d.assessment) {
        setAssessmentModal({ open: true, loading: false, data: { __start__: type, assessment: d.assessment } });
        // 在弹窗内直接进行答题，不再跳转页面
      } else {
        setAssessmentModal({ open: true, loading: false, data: { error: d.error || '创建测评失败' } });
      }
    } catch {
      setAssessmentModal({ open: true, loading: false, data: { error: '创建测评失败' } });
    }
  };

  // 邀请测评已移除：继续测试入口废弃

  // 邀请测评已移除：拒绝入口废弃

  const fetchChatRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/chat/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('获取聊天室列表失败');
      }

      const data = await response.json();
      setChatRooms(sortChatRooms(data.chatRooms));
    } catch (error) {
      console.error('获取聊天室失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 置顶相关
  const isRoomPinned = (roomId: string) => !!pinnedRooms[roomId];
  const loadPinnedRoomsFromServer = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const resp = await fetch('/api/chat/rooms/pin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const map: Record<string, number> = {};
      (data.pinned || []).forEach((p: any) => {
        if (p.roomId) map[p.roomId] = new Date(p.createdAt).getTime() || Date.now();
      });
      setPinnedRooms(map);
      try { localStorage.setItem('pinnedRooms', JSON.stringify(map)); } catch {}
    } catch (e) {
      // 忽略失败，保留本地缓存
    }
  };
  useEffect(() => { loadPinnedRoomsFromServer(); }, []);

  const togglePinRoom = async (roomId: string) => {
    // 乐观更新本地与UI排序
    setPinnedRooms(prev => {
      const next = { ...prev } as Record<string, number>;
      if (next[roomId]) {
        delete next[roomId];
      } else {
        next[roomId] = Date.now();
      }
      try { localStorage.setItem('pinnedRooms', JSON.stringify(next)); } catch {}
      return next;
    });

    // 同步到服务端
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      if (isRoomPinned(roomId)) {
        // 当前状态为已置顶，执行取消
        await fetch(`/api/chat/rooms/pin?roomId=${roomId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await fetch('/api/chat/rooms/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ roomId })
        });
      }
    } catch (e) {
      // 失败不打断用户操作，下次刷新会纠正
    }
  };
  const sortChatRooms = (rooms: ChatRoom[]) => {
    const ids = Object.keys(pinnedRooms);
    if (ids.length === 0) return rooms;
    const pinnedSet = new Set(ids);
    const pinned = rooms.filter(r => pinnedSet.has(r.id)).sort((a, b) => (pinnedRooms[b.id] || 0) - (pinnedRooms[a.id] || 0));
    const others = rooms.filter(r => !pinnedSet.has(r.id));
    return [...pinned, ...others];
  };
  useEffect(() => {
    setChatRooms(prev => sortChatRooms(prev));
  }, [pinnedRooms]);

  // 收藏联系人相关
  const isFavoriteContact = (userId: string) => !!favoriteContacts[userId];
  const syncFavoriteToServer = async (userId: string, add: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      if (add) {
        await fetch('/api/chat/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId })
        });
      } else {
        await fetch(`/api/chat/favorites?userId=${userId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {}
  };

  const loadFavoriteContactsFromServer = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const resp = await fetch('/api/chat/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const map: Record<string, number> = {};
      (data.favorites || []).forEach((f: any) => {
        if (f.userId) map[f.userId] = new Date(f.createdAt).getTime() || Date.now();
      });
      setFavoriteContacts(map);
      try { localStorage.setItem('favoriteContacts', JSON.stringify(map)); } catch {}
    } catch {}
  };
  useEffect(() => { loadFavoriteContactsFromServer(); }, []);

  const toggleFavoriteContact = (userId: string) => {
    setFavoriteContacts(prev => {
      const next = { ...prev } as Record<string, number>;
      const adding = !next[userId];
      if (adding) {
        next[userId] = Date.now();
      } else {
        delete next[userId];
      }
      try { localStorage.setItem('favoriteContacts', JSON.stringify(next)); } catch {}
      // 同步到服务端（乐观）
      syncFavoriteToServer(userId, adding);
      return next;
    });
  };

  // 扁平化联系人用于"特别关注"收集
  const allUsersMap = useMemo(() => {
    const map: Record<string, any> = {};
    const addUser = (u: any) => { if (u && u.id) map[u.id] = u; };
    const traverse = (g: any) => {
      if (!g) return;
      if (Array.isArray(g.users)) g.users.forEach(addUser);
      if (Array.isArray(g.subGroups)) g.subGroups.forEach(traverse);
    };
    allContacts.forEach((group: any) => {
      if (group.groupType === 'hierarchical_students' && Array.isArray(group.hierarchicalData)) {
        group.hierarchicalData.forEach(traverse);
      } else if (Array.isArray(group.users)) {
        group.users.forEach(addUser);
      }
    });
    return map;
  }, [allContacts]);
  const favoriteUsers = useMemo(() => {
    const ids = Object.keys(favoriteContacts);
    const list = ids
      .map(id => allUsersMap[id])
      .filter(Boolean)
      .sort((a: any, b: any) => (favoriteContacts[b.id] || 0) - (favoriteContacts[a.id] || 0));
    return list;
  }, [favoriteContacts, allUsersMap]);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
      }
    } catch (error) {
      console.error('获取好友列表失败:', error);
    }
  };

  const fetchAllContacts = async () => {
    try {
      setContactsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/all-contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAllContacts(data.contacts || []);
        if (!viewer && data.currentUserType) {
          setViewer((prev) => prev || { accountType: data.currentUserType, isSuperAdmin: false });
        }
      }
    } catch (error) {
      console.error('获取联系人列表失败:', error);
    } finally {
      setContactsLoading(false);
    }
  };

  const getTeacherLabel = () => (viewer?.isSuperAdmin || viewer?.accountType === 'student') ? '老师' : '心理咨询师';
  const getGenderIcon = (g?: string | null) => g === '男' ? '👨' : g === '女' ? '👩' : g ? '🤐' : '';
  const getDisplayLabelForUser = (u: any): string => {
    if (u?.isSuperAdmin) return '超级管理员';
    if (u?.accountType === 'teacher' || u?.isAdmin) return getTeacherLabel();
    if (u?.accountType === 'student') return '学生';
    if (u?.accountType === 'weapp') return '微信用户';
    return '注册用户';
  };

  const fetchPendingRequestsCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/friends/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRequestsCount(data.receivedRequests?.length || 0);
      }
    } catch (error) {
      console.error('获取好友申请数量失败:', error);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/messages/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => {
          try {
            const next = (data.messages || []).map((m: any) => {
              if (m?.messageType === 'invite_assessment' && forceInProgressMessageIdsRef.current.has(m.id)) {
                try {
                  const content = JSON.parse(m.content || '{}');
                  // 若服务端已标记完成/取消/拒绝，则尊重服务端
                  if (content?.status && ['completed','canceled','rejected'].includes(String(content.status))) return m;
                  // 强制进行中，但保留服务端已有的 assessmentId 与 progress
                  const enforced = {
                    ...content,
                    status: 'accepted',
                    inProgress: true,
                    paused: false,
                    assessmentId: content.assessmentId,
                    progress: content.progress
                  };
                  return { ...m, content: JSON.stringify(enforced) };
                } catch { return m; }
              }
              return m;
            });
            return next;
          } catch {
            return data.messages;
          }
        });
        
        // 重新获取聊天室列表以更新未读计数
        await fetchChatRooms();
        
        // 刷新未读消息数量
        refreshUnreadCount();
        
        // 触发聊天室已读事件 - 立即清除通知中的未读消息
        window.dispatchEvent(new CustomEvent('chatRoomRead', {
          detail: { roomId }
        }));
        
        // 触发统一通知系统更新
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }
    } catch (error) {
      console.error('获取消息失败:', error);
    }
  };

  const fetchUserInfo = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/user-info?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUserInfo(data.userInfo);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  const preloadPeerAssessments = async (peerId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const [mbti, scl90, sds] = await Promise.all([
        fetch(`/api/assessments/user?userId=${peerId}&type=MBTI&limit=1`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.ok?r.json():{assessments:[]}),
        fetch(`/api/assessments/user?userId=${peerId}&type=SCL90&limit=1`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.ok?r.json():{assessments:[]}),
        fetch(`/api/assessments/user?userId=${peerId}&type=SDS/SAS&limit=1`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.ok?r.json():{assessments:[]})
      ]);
      const list = [mbti.assessments?.[0], scl90.assessments?.[0], sds.assessments?.[0]].filter(Boolean);
      setLatestAssessments(list);
    } catch {}
  };

  const preloadMyAssessments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const fetchOne = async (type: string) => {
        const r = await fetch(`/api/assessments?type=${type}&limit=1`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return null; const d = await r.json(); return d.assessments?.[0] || null;
      };
      const [mbti, scl90, sds] = await Promise.all([fetchOne('MBTI'), fetchOne('SCL90'), fetchOne('SDS/SAS')]);
      const map: Record<string, any> = {};
      if (mbti) map['MBTI'] = mbti;
      if (scl90) map['SCL90'] = scl90;
      if (sds) map['SDS/SAS'] = sds;
      setMyLatestAssessments(map);
    } catch {}
  };

  const getAssessmentSummary = (a: any) => {
    if (!a) return '';
    if (a.type === 'MBTI') return `人格类型 ${a.personalityType || '-'}`;
    if (a.type === 'SCL90') return `总体分 ${a.overallScore ?? '-'} · 风险 ${a.riskLevel ?? '-'}`;
    return `${getAssessmentDisplayName(a.type)} 总体分 ${a.overallScore ?? '-'}`;
  };

  // 轻量动画 keyframes（用于预览弹窗）
  // 注意：只声明一次，不影响 SSR
  if (typeof window !== 'undefined' && !document.getElementById('inline-keyframes')) {
    const style = document.createElement('style');
    style.id = 'inline-keyframes';
    style.innerHTML = `@keyframes fadeIn{to{opacity:1}}@keyframes popIn{0%{opacity:0;transform:translateY(8px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}`;
    document.head.appendChild(style);
  }

  const sendMessage = async () => {
    if (!selectedRoom || !newMessage.trim() || sendingMessage) return;

    // 发送自己的消息后，应滚动到底部
    setForceScrollOnNextMessages(true);

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      // 单个emoji作为独立emoji消息发送
      if (isSingleEmoji(newMessage)) {
        const response = await fetch(`/api/chat/messages/${selectedRoom.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content: newMessage.trim(), messageType: 'emoji' })
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, data.message]);
          setNewMessage('');
          await fetchChatRooms();
          refreshUnreadCount();
          window.dispatchEvent(new CustomEvent('chatRoomRead', { detail: { roomId: selectedRoom.id } }));
          window.dispatchEvent(new CustomEvent('refreshNotifications'));
        } else {
          const error = await response.json();
          window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: error.error || '发送消息失败' } }));
        }
        return;
      }

      const response = await fetch(`/api/chat/messages/${selectedRoom.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          messageType: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        
        // 重新获取聊天室列表以更新最后消息和计数
        await fetchChatRooms();
        
        // 刷新未读消息数量
        refreshUnreadCount();
        
        // 触发聊天室已读事件（发送消息后也算已读）
        window.dispatchEvent(new CustomEvent('chatRoomRead', {
          detail: { roomId: selectedRoom.id }
        }));
        
        // 触发统一通知系统更新
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      } else {
        const error = await response.json();
        if (error.code === 'FRIENDSHIP_REQUIRED') {
          // 显示好友关系错误提示并询问是否发送好友申请
          showConfirm({
            title: '需要添加好友',
            message: '需要先添加该用户为好友才能聊天，是否发送好友申请？',
            confirmText: '发送申请',
            cancelText: '取消',
            type: 'info',
            onConfirm: async () => {
              await sendFriendRequest(error.targetUserId);
            }
          });
        } else {
          window.dispatchEvent(new CustomEvent('showErrorToast', {
            detail: { message: error.error || '发送消息失败' }
          }));
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const sendSticker = async (url: string) => {
    if (!selectedRoom || sendingMessage) return;
    setSendingMessage(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`/api/chat/messages/${selectedRoom.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: url, messageType: 'sticker' })
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        await fetchChatRooms();
        refreshUnreadCount();
        window.dispatchEvent(new CustomEvent('chatRoomRead', { detail: { roomId: selectedRoom.id } }));
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: error.error || '发送表情失败' } }));
      }
    } catch (e) {
      console.error('发送表情失败:', e);
    } finally {
      setSendingMessage(false);
    }
  };

  // 统一的附件发送
  const sendAttachment = async (payload: { type: 'image' | 'video' | 'file' | 'assessment'; url?: string; name?: string; mime?: string; size?: number; data?: any }) => {
    if (!selectedRoom || sendingAttachment) return;
    setSendingAttachment(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const content = (payload.type === 'assessment')
        ? JSON.stringify(payload.data || {})
        : JSON.stringify({ url: payload.url, name: payload.name, mime: payload.mime, size: payload.size });
      const response = await fetch(`/api/chat/messages/${selectedRoom.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, messageType: payload.type })
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        await fetchChatRooms();
        refreshUnreadCount();
        window.dispatchEvent(new CustomEvent('chatRoomRead', { detail: { roomId: selectedRoom.id } }));
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: error.error || '发送失败' } }));
      }
    } catch (e) {
      console.error('发送附件失败:', e);
    } finally {
      setSendingAttachment(false);
    }
  };

  // 上传封装
  const uploadVia = async (endpoint: string, file: File): Promise<{ url: string } | null> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const fd = new FormData();
      fd.append('file', file);
      const resp = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await resp.json();
      if (resp.ok && data.url) return { url: data.url };
      window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: data.error || '上传失败' } }));
      return null;
    } catch {
      window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: '上传失败' } }));
      return null;
    }
  };

  const compressImageIfNeeded = (file: File, maxSize = 1600): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height && width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; }
        else if (height > width && height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; }
        else if (width > maxSize) { width = maxSize; height = Math.round(height * (maxSize / width)); }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          else resolve(file);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  const pickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const sendOriginal = typeof window !== 'undefined' ? window.confirm('是否发送原图？选择取消将进行压缩以加快发送。') : true;
    for (let f of files) {
      if (!sendOriginal) f = await compressImageIfNeeded(f);
      const uploaded = await uploadVia('/api/upload', f);
      if (uploaded) await sendAttachment({ type: 'image', url: uploaded.url, name: f.name, mime: f.type, size: f.size });
    }
    e.currentTarget.value = '';
    setMoreOpen(false);
  };

  const pickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const sendOriginal = typeof window !== 'undefined' ? window.confirm('是否发送原视频？') : true;
    if (!sendOriginal) { e.currentTarget.value = ''; setMoreOpen(false); return; }
    for (const f of files) {
      const uploaded = await uploadVia('/api/upload/video', f);
      if (uploaded) await sendAttachment({ type: 'video', url: uploaded.url, name: f.name, mime: f.type, size: f.size });
    }
    e.currentTarget.value = '';
    setMoreOpen(false);
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const f of files) {
      const uploaded = await uploadVia('/api/upload/file', f);
      if (uploaded) await sendAttachment({ type: 'file', url: uploaded.url, name: f.name, mime: f.type, size: f.size });
    }
    e.currentTarget.value = '';
    setMoreOpen(false);
  };

  const startChatWithFriend = async (friendId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: friendId,
          type: 'private'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // 格式化聊天室数据
        const chatTarget = data.chatRoom.participants.find((p: any) => p.user.id === friendId)?.user;
        const formattedRoom: ChatRoom = {
          id: data.chatRoom.id,
          name: chatTarget?.nickname || chatTarget?.name || '未知用户',
          type: data.chatRoom.type,
          lastMessage: null,
          lastMessageAt: data.chatRoom.createdAt,
          unreadCount: 0,
          participants: data.chatRoom.participants.map((p: any) => p.user),
          chatTarget,
          totalMessages: 0
        };

        // 添加到聊天室列表或更新现有聊天室
        setChatRooms(prev => {
          const existingIndex = prev.findIndex(room => room.id === formattedRoom.id);
          if (existingIndex >= 0) {
            return prev;
          } else {
            return [formattedRoom, ...prev];
          }
        });

        setSelectedRoom(formattedRoom);
        setShowFriendsList(false);
      } else if (response.status === 403) {
        const error = await response.json();
        if (error.needFriendship) {
          // 需要添加好友
          showConfirm({
            title: '需要添加好友',
            message: '需要先添加该用户为好友才能聊天，是否发送好友申请？',
            confirmText: '发送申请',
            cancelText: '取消',
            type: 'info',
            onConfirm: async () => {
              await sendFriendRequest(friendId);
            }
          });
        } else {
          window.dispatchEvent(new CustomEvent('showErrorToast', {
            detail: { message: error.error || '无法开始聊天' }
          }));
        }
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '创建聊天室失败' }
        }));
      }
    } catch (error) {
      console.error('创建聊天室失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '创建聊天室失败' }
      }));
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ friendId })
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: '好友申请已发送，等待对方同意后即可聊天' }
        }));
        // 触发统一通知刷新
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '发送好友申请失败' }
        }));
      }
    } catch (error) {
      console.error('发送好友申请失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '发送好友申请失败' }
      }));
    }
  };

  // 删除好友
  const handleDeleteFriend = (friend: Friend) => {
    // 检查是否可以删除（非默认联系人）
    if (friend.friendshipId === 'admin-default' || friend.friendshipId === 'admin-all') {
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '不能删除系统默认联系人' }
      }));
      return;
    }

    setFriendToDelete(friend);
    setShowDeleteFriendDialog(true);
  };

  const confirmDeleteFriend = async (friendId: string, friendshipId: string) => {
    try {
      setDeletingFriend(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/friends?friendId=${friendId}&friendshipId=${friendshipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        // 刷新好友列表和联系人列表
        await fetchFriends();
        if (activeTab === 'contacts') {
          await fetchAllContacts();
        }
        
        // 关闭对话框
        setShowDeleteFriendDialog(false);
        setFriendToDelete(null);
        
        // 显示成功提示
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: data.message }
        }));
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '删除好友失败' }
        }));
      }
    } catch (error) {
      console.error('删除好友失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '删除好友失败' }
      }));
    } finally {
      setDeletingFriend(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 删除单条消息
  const deleteMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/messages/delete?messageId=${messageId}&type=soft`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        // 更新消息列表
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: '[消息已删除]', isDeleted: true }
            : msg
        ));
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '删除消息失败' }
        }));
      }
    } catch (error) {
      console.error('删除消息失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '删除消息失败' }
      }));
    }
  };

  // 批量删除选中的消息
  const deleteSelectedMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/messages/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messageIds: selectedMessages,
          deleteType: 'soft'
        })
      });

      if (response.ok) {
        // 更新消息列表
        setMessages(prev => prev.map(msg => 
          selectedMessages.includes(msg.id)
            ? { ...msg, content: '[消息已删除]', isDeleted: true }
            : msg
        ));
        setSelectedMessages([]);
        setIsSelectionMode(false);
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '删除消息失败' }
        }));
      }
    } catch (error) {
      console.error('批量删除消息失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '批量删除消息失败' }
      }));
    }
  };

  // 清空聊天记录
  const clearChatHistory = async () => {
    if (!selectedRoom) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/rooms/delete?roomId=${selectedRoom.id}&type=clear`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        // 重新获取消息与房间列表，确保左侧同步隐藏空会话
        fetchMessages(selectedRoom.id);
        fetchChatRooms();
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '清空聊天记录失败' }
        }));
      }
    } catch (error) {
      console.error('清空聊天记录失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '清空聊天记录失败' }
      }));
    }
  };

  // 删除聊天室（退出聊天）
  const deleteChatRoom = async (roomId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/rooms/delete?roomId=${roomId}&type=leave`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        // 从聊天室列表中移除
        setChatRooms(prev => prev.filter(room => room.id !== roomId));
        // 如果删除的是当前选中的聊天室，清除选中状态
        if (selectedRoom?.id === roomId) {
          setSelectedRoom(null);
          setMessages([]);
        }
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '删除聊天室失败' }
        }));
      }
    } catch (error) {
      console.error('删除聊天室失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '删除聊天室失败' }
      }));
    }
  };

  // 切换消息选择模式
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedMessages([]);
  };

  // 切换消息选中状态
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  // 显示删除确认对话框
  const showDeleteDialog = (type: 'message' | 'room' | 'clear', messageId?: string, roomId?: string) => {
    let title = '';
    let message = '';
    let onConfirm = () => {};

    switch (type) {
      case 'message':
        title = '删除消息';
        message = '确定要删除这条消息吗？删除后无法恢复。';
        onConfirm = () => messageId && deleteMessage(messageId);
        break;
      case 'room':
        title = '删除聊天';
        message = '确定要删除这个聊天吗？您将退出此聊天室，聊天记录将被清空。';
        onConfirm = () => roomId && deleteChatRoom(roomId);
        break;
      case 'clear':
        title = '清空聊天记录';
        message = '确定要清空所有聊天记录吗？此操作将删除您在此聊天中发送的所有消息，且无法恢复。';
        onConfirm = clearChatHistory;
        break;
    }

    setDeleteDialog({
      isOpen: true,
      type,
      title,
      message,
      onConfirm
    });
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="flex h-[calc(100dvh-var(--nav-offset))]">

        {/* 左侧边栏 - 聊天列表 */}
        <div className="hidden lg:flex w-96 min-w-[360px] max-w-[480px] bg-white/80 backdrop-blur-xl border-r border-black/[0.08] flex-col">

          {/* 头部 - 固定 */}
          <div className="p-6 border-b border-black/[0.08] flex-shrink-0 bg-white/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">💬 心语聊天</h1>
            </div>

            {/* 选项卡 */}
            <div className="flex space-x-1 mb-4 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => {
                  setActiveTab('chats');
                  setSearchQuery('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === 'chats' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                聊天记录
              </button>
              <button
                onClick={() => {
                  setActiveTab('contacts');
                  setSearchQuery('');
                  if (allContacts.length === 0) {
                    fetchAllContacts();
                  }
                }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === 'contacts' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                联系人
              </button>
            </div>

            {/* 好友功能按钮 */}
            {activeTab === 'contacts' && (
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setShowFriendRequests(true)}
                  className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2 relative"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm">好友申请</span>
                  {pendingRequestsCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setShowGroupManager(true)}
                  className="flex-1 py-2 px-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-sm">分组管理</span>
                </button>
              </div>
            )}

            {/* 搜索框 */}
            <div className="relative">
              <input
                type="text"
                placeholder="搜索聊天或添加好友..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {/* 搜索结果 */}
            {searchQuery && searchResults.length > 0 && (
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">搜索结果</h3>
                {searchResults.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-300"
                    onClick={() => startChatWithFriend(user.id)}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium mr-3">
                      {user.nickname?.[0] || user.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium truncate" title={user.nickname && user.nickname !== user.name ? `${user.nickname}（${user.name}）` : user.name}>
                        {user.nickname && user.nickname !== user.name ? (
                          <>
                            <span className="text-gray-900">{user.nickname}</span>
                            <span className="text-gray-500">（{user.name}）</span>
                          </>
                        ) : (
                          <span className="text-gray-900">{user.name}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{getDisplayLabelForUser(user)}</p>
                    </div>
                    {user.friendshipStatus === 'none' && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        添加
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 聊天室列表或联系人列表 */}
            {!searchQuery && activeTab === 'chats' && (
              <div className="p-4 space-y-2">
                {chatRooms.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 mb-2">暂无聊天记录</p>
                    <p className="text-sm text-gray-400">搜索用户开始聊天吧</p>
                  </div>
                ) : (
                  chatRooms.map((room) => (
                    <div
                      key={room.id}
                      className={`flex items-center p-4 rounded-2xl transition-all duration-300 group ${
                        selectedRoom?.id === room.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div 
                        onClick={() => setSelectedRoom(room)}
                        className="flex items-center flex-1 cursor-pointer"
                      >
                        <div className="relative mr-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-medium shadow-lg transition-all duration-300 hover:scale-105">
                            {room.chatTarget?.nickname?.[0] || room.chatTarget?.name[0] || room.name[0]}
                          </div>
                          {room.unreadCount > 0 && (
                            <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center px-1 shadow-lg shadow-red-500/50 border-[1.5px] border-white ring-1 ring-red-500/30 animate-pulse">
                              <span className="font-semibold text-[9px] leading-none">
                                {room.unreadCount > 99 ? '99+' : room.unreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <p className="font-medium truncate" title={room.chatTarget?.nickname && room.chatTarget?.name ? `${room.chatTarget.nickname}（${room.chatTarget.name}）` : room.name}>
                                {room.chatTarget?.nickname && room.chatTarget?.name ? (
                                  <>
                                    <span className="text-gray-900">{room.chatTarget.nickname}</span>
                                    <span className="text-gray-500">（{room.chatTarget.name}）</span>
                                  </>
                                ) : (
                                  <span className="text-gray-900">{room.name}</span>
                                )}
                              </p>
                               {/* 用户类型标注：仅"超级管理员/心理咨询师/学生/微信用户/注册用户" */}
                               <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                 room.chatTarget?.isSuperAdmin
                                   ? 'bg-purple-100 text-purple-700'
                                   : ((room.chatTarget?.accountType === 'teacher' || room.chatTarget?.isAdmin) && !room.chatTarget?.isSuperAdmin)
                                   ? 'bg-green-100 text-green-700'
                                   : room.chatTarget?.accountType === 'student'
                                   ? 'bg-blue-100 text-blue-700'
                                   : room.chatTarget?.accountType === 'weapp'
                                   ? 'bg-emerald-100 text-emerald-700'
                                   : 'bg-gray-100 text-gray-700'}`}>
                                 {getDisplayLabelForUser(room.chatTarget)}
                               </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {room.lastMessage 
                              ? `${room.lastMessage.sender.nickname || room.lastMessage.sender.name}: ${room.lastMessage.messageType === 'sticker' ? '[表情]' : room.lastMessage.messageType === 'image' ? '[图片]' : room.lastMessage.messageType === 'video' ? '[视频]' : room.lastMessage.messageType === 'file' ? '[文件]' : room.lastMessage.messageType === 'assessment' ? '[测评结果]' : room.lastMessage.messageType === 'invite_assessment' ? '[测评邀请]' : room.lastMessage.content}`
                              : '开始聊天吧...'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* 时间、置顶、删除按钮区域（右侧统一对齐） */}
                      <div className="flex flex-col items-center justify-center space-y-1 ml-2 min-w-[44px]">
                        {/* 时间显示 */}
                        {room.lastMessageAt && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {new Date(room.lastMessageAt).toLocaleTimeString('zh-CN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                        {/* 置顶与删除按钮（悬浮显示） */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity space-y-1">
                          {/* 置顶/取消置顶 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinRoom(room.id);
                            }}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isRoomPinned(room.id) ? 'bg-amber-100 hover:bg-amber-200' : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                            title={isRoomPinned(room.id) ? '取消置顶' : '置顶'}
                          >
                            <svg className={`w-3.5 h-3.5 ${isRoomPinned(room.id) ? 'text-amber-600' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 2h12a1 1 0 011 1v18l-7-3-7 3V3a1 1 0 011-1z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 联系人列表 */}
            {!searchQuery && activeTab === 'contacts' && (
              <div className="p-4">
                {contactsLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">加载联系人...</p>
                  </div>
                ) : allContacts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 mb-2">暂无联系人</p>
                    <p className="text-sm text-gray-400">尝试搜索用户添加联系</p>
                  </div>
                ) : (
                  <div className="space-y-4 px-2 pb-4">
                    {/* 特别关注分组（自动置顶） */}
                    {favoriteUsers.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-3 px-4 py-3 bg-yellow-50/80 rounded-xl mb-2 border border-yellow-200/60 backdrop-blur-sm">
                          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-amber-900">特别关注</h3>
                            <p className="text-xs text-amber-700/80 mt-0.5">{favoriteUsers.length} 位联系人</p>
                          </div>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg bg-amber-500">{favoriteUsers.length}</div>
                        </div>
                        <div className="space-y-1">
                          {favoriteUsers.map((user: any) => (
                            <div
                              key={user.id}
                              onClick={() => startChatWithFriend(user.id)}
                              className="group flex items-center px-4 py-3 rounded-xl hover:bg-white/90 hover:shadow-md transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-gray-200/50 cursor-pointer"
                            >
                              <div className="relative mr-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md">
                                  {user.nickname?.[0] || user.name[0]}
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="text-base font-semibold truncate" title={user.nickname && user.nickname !== user.name ? `${user.nickname}（${user.name}）` : user.name}>
                                  {user.nickname && user.nickname !== user.name ? (
                                    <>
                                      <span className="text-gray-900">{user.nickname}</span>
                                      <span className="text-gray-500">（{user.name}）</span>
                                    </>
                                  ) : (
                                    <span className="text-gray-900">{user.name}</span>
                                  )}
                                </p>
                                {!user.isOnline && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-md text-gray-500 bg-gray-50">离线</span>
                                )}
                              </div>
                              <div className="flex flex-col items-center justify-center space-y-1 ml-2 min-w-[28px] opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e)=>{e.stopPropagation(); toggleFavoriteContact(user.id);}} className={`w-6 h-6 rounded-lg flex items-center justify-center ${isFavoriteContact(user.id) ? 'bg-yellow-100 hover:bg-yellow-200' : 'bg-gray-50 hover:bg-gray-100'}`} title={isFavoriteContact(user.id) ? '取消收藏' : '收藏联系人'}>
                                  <svg className={`w-3.5 h-3.5 ${isFavoriteContact(user.id) ? 'text-yellow-600' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.034a1 1 0 00-1.175 0l-2.802 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.293z"/></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {allContacts.map((group, groupIndex) => (
                      <div key={groupIndex}>
                        {/* 分层结构联系人 */}
                        {group.groupType === 'hierarchical_students' && group.hierarchicalData ? (
                          <div className="space-y-2">
                            {group.hierarchicalData.map((topLevelGroup: any, index: number) => (
                              <CollapsibleContactGroup
                                key={`${topLevelGroup.groupName}-${index}`}
                                group={topLevelGroup}
                                level={0}
                                onUserClick={startChatWithFriend}
                                isFavorite={isFavoriteContact}
                                onToggleFavorite={toggleFavoriteContact}
                              />
                            ))}
                          </div>
                        ) : (
                          /* 普通分组（教师、注册用户、好友自定义分组） */
                          <>
                          {((Array.isArray(group.users) && group.users.length > 0) || (group.groupType === 'friend_group' && group.isCustomGroup)) && (
                          <div className="space-y-2">
                            {/* 分组标题 - 苹果风格 */}
                            <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50/80 rounded-xl mb-2 border border-gray-100/50 backdrop-blur-sm">
                              <div className={`w-2 h-8 rounded-full ${
                                group.groupType === 'teachers' ? 'bg-gradient-to-b from-green-400 to-green-600' : 
                                group.groupType === 'self' ? 'bg-gradient-to-b from-purple-400 to-purple-600' : 'bg-gradient-to-b from-blue-400 to-blue-600'
                              }`} />
                              <div className="flex-1">
                                <h3 className="text-sm font-semibold text-gray-800">{group.groupName}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{group.users?.length || 0} 位联系人</p>
                              </div>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ${
                                group.groupType === 'teachers' ? 'bg-green-500' : 
                                group.groupType === 'self' ? 'bg-purple-500' : 'bg-blue-500'
                              }`}>
                                {group.users?.length || 0}
                              </div>
                            </div>
                            
                            {/* 联系人列表 */}
                            <div className="space-y-1">
                              {group.users?.map((user: any) => (
                                <div
                                  key={user.id}
                                  onClick={() => startChatWithFriend(user.id)}
                                  className="group flex items-center px-4 py-3 rounded-xl hover:bg-white/90 hover:shadow-md transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-gray-200/50 cursor-pointer"
                                >
                                  {/* 用户头像 - 带在线状态指示器 */}
                                  <div className="relative mr-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md">
                                      {user.nickname?.[0] || user.name[0]}
                                    </div>
                                    {/* 在线状态指示器 */}
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                                      user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                  </div>
                                  
                                  {/* 用户信息 */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <p className="text-base font-semibold truncate" title={user.nickname && user.nickname !== user.name ? `${user.nickname}（${user.name}）` : user.name}>
                                        {user.nickname && user.nickname !== user.name ? (
                                          <>
                                            <span className="text-gray-900">{user.nickname}</span>
                                            <span className="text-gray-500">（{user.name}）</span>
                                          </>
                                        ) : (
                                          <span className="text-gray-900">{user.name}</span>
                                        )}
                                      </p>
                                      {/* 仅保留在线状态标签 */}
                                    </div>
                                    {/* 仅显示在线状态标签 */}
                                    <div className="flex items-center space-x-1.5">
                                      {user.isOnline ? (
                                        <span className="text-xs px-1.5 py-0.5 rounded-md text-green-700 bg-green-50">在线</span>
                                      ) : (
                                        <span className="text-xs px-1.5 py-0.5 rounded-md text-gray-500 bg-gray-50">离线</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* 操作按钮：仅悬浮显示收藏和删除，行点击即进入聊天 */}
                                  <div className="flex items-center ml-auto space-x-2 opacity-0 group-hover:opacity-100 transition-opacity min-w-[60px] justify-end">
                                      <button
                                      onClick={(e) => { e.stopPropagation(); toggleFavoriteContact(user.id); }}
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${isFavoriteContact(user.id) ? 'bg-yellow-100 hover:bg-yellow-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                                      title={isFavoriteContact(user.id) ? '取消收藏' : '收藏联系人'}
                                    >
                                      <svg className={`w-3.5 h-3.5 ${isFavoriteContact(user.id) ? 'text-yellow-600' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.034a1 1 0 00-1.175 0l-2.802 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.293z"/></svg>
                                      </button>
                                    {user.friendshipId && user.friendshipId !== 'admin-default' && user.friendshipId !== 'admin-all' && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteFriend(user); }}
                                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all duration-200"
                                        title="删除好友"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                             </div>
                           </div>
                          )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧 - 聊天区域 */}
        <div className="flex-1 flex flex-col relative">
          {selectedRoom ? (
            <>
              {/* 聊天头部 - 固定 */}
              <div
                className="px-4 sm:px-6 py-5 sm:py-6 border-b border-black/[0.08] bg-white/80 backdrop-blur-xl flex-shrink-0 z-10"
                style={{
                  marginTop: 'clamp(16px, 4vw, 20px)',
                  paddingTop: 'clamp(16px, 4vw, 24px)',
                  paddingBottom: 'clamp(16px, 4vw, 24px)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-h-[60px]">
                    {/* 小屏显示打开列表按钮 */}
                    <button
                      onClick={openSidebar}
                      className="mr-3 lg:hidden h-10 w-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      aria-label="打开聊天列表"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16"/></svg>
                    </button>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium mr-4">
                      {selectedRoom.chatTarget?.nickname?.[0] || selectedRoom.chatTarget?.name[0] || selectedRoom.name[0]}
                    </div>
                    <div className="flex-1">
                      {/* 第一行：名称 + 标签 + 在线 */}
                        <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-semibold">
                          {selectedRoom.chatTarget?.nickname && selectedRoom.chatTarget?.name ? (
                            <>
                              <span className="text-gray-900">{selectedRoom.chatTarget.nickname}</span>
                              <span className="text-gray-500">（{selectedRoom.chatTarget.name}）</span>
                            </>
                          ) : (
                            <span className="text-gray-900">{selectedRoom.name}</span>
                          )}
                        </h2>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            selectedRoom.chatTarget?.isSuperAdmin 
                              ? 'bg-purple-100 text-purple-700'
                              : (selectedRoom.chatTarget?.accountType === 'teacher' || selectedRoom.chatTarget?.accountType === 'admin')
                              ? 'bg-green-100 text-green-700'
                              : selectedRoom.chatTarget?.accountType === 'student'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {selectedRoom.chatTarget?.isSuperAdmin 
                              ? '超级管理员'
                              : (selectedRoom.chatTarget?.accountType === 'teacher' || selectedRoom.chatTarget?.accountType === 'admin')
                              ? '老师'
                              : selectedRoom.chatTarget?.accountType === 'student'
                              ? '学生'
                            : '注册用户'}
                          </span>
                        {selectedUserInfo?.isOnline ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">在线</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">离线</span>
                          )}
                        </div>

                      {/* 第二行：其他个人信息（按类型简化为一行） */}
                        {selectedUserInfo && (
                        <div className="text-xs text-gray-600 mt-1">
                            {selectedUserInfo.accountType === 'student' && (
                            <span>
                                    📚 {selectedUserInfo.college && selectedUserInfo.className 
                                      ? `${selectedUserInfo.college}-${selectedUserInfo.className}`
                                : selectedUserInfo.college || selectedUserInfo.className || '未设置'}
                                          </span>
                                        )}
                          {(selectedUserInfo.accountType === 'teacher' || selectedUserInfo.accountType === 'admin' || selectedUserInfo.isSuperAdmin) && (
                            <span>
                              {selectedUserInfo.office ? `🏢 ${selectedUserInfo.office}` : ''}
                              {selectedUserInfo.office && selectedUserInfo.phone ? ' · ' : ''}
                              {selectedUserInfo.phone ? `📞 ${selectedUserInfo.phone}` : ''}
                                          </span>
                                        )}
                            {selectedUserInfo.accountType === 'self' && selectedUserInfo.recentAssessments && selectedUserInfo.recentAssessments.length > 0 && (
                            <span>
                              {selectedUserInfo.recentAssessments[0]?.type === 'MBTI' && selectedUserInfo.recentAssessments[0]?.personalityType ? `MBTI：${selectedUserInfo.recentAssessments[0].personalityType}` : ''}
                                      </span>
                                    )}
                              </div>
                            )}
                    </div>
                  </div>
                  
                  {/* 聊天管理按钮 */}
                  <div className="flex items-center space-x-2">
                    {isSelectionMode ? (
                      <>
                        <button
                          onClick={() => {
                            if (selectedMessages.length > 0) {
                              setDeleteDialog({
                                isOpen: true,
                                type: 'message',
                                title: '删除选中消息',
                                message: `确定要删除选中的 ${selectedMessages.length} 条消息吗？删除后无法恢复。`,
                                onConfirm: deleteSelectedMessages
                              });
                            }
                          }}
                          disabled={selectedMessages.length === 0}
                          className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          删除({selectedMessages.length})
                        </button>
                        <button
                          onClick={toggleSelectionMode}
                          className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={toggleSelectionMode}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                          title="选择消息"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => showDeleteDialog('clear')}
                          className="p-2 rounded-full bg-yellow-100 hover:bg-yellow-200 transition-colors"
                          title="清空聊天记录"
                        >
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 消息区域 - 独立滚动 */}
            <div
              ref={messagesContainerRef}
              className={`flex-1 overflow-y-auto apple-scrollbar touch-scroll p-5 sm:p-6 space-y-4 bg-white/70 border border-black/[0.06] rounded-2xl shadow-sm mx-3 sm:mx-5 my-3 ${dragActive ? 'ring-2 ring-blue-400 ring-offset-4 ring-offset-white/60' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onScroll={(e) => {
                const target = e.currentTarget as HTMLDivElement;
                const threshold = 120; // px
                const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                setIsUserNearBottom(distanceToBottom <= threshold);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragActive(false);
                const files = Array.from(e.dataTransfer.files || []);
                if (files.length === 0) return;
                const summarize = (fs: File[]) => {
                  const types = fs.map((f) => {
                    const n = f.name.toLowerCase();
                    if (/^image\//.test(f.type) || /(png|jpe?g|gif|webp|bmp|svg)$/i.test(n)) return '图片';
                    if (/^video\//.test(f.type) || /(mp4|mov|avi|webm|mkv)$/i.test(n)) return '视频';
                    if (/(docx?|xlsx?|pptx?)$/i.test(n)) return n.endsWith('doc')||n.endsWith('docx') ? 'Word' : n.endsWith('xls')||n.endsWith('xlsx') ? 'Excel' : 'PPT';
                    if (/pdf$/i.test(n)) return 'PDF';
                    if (/txt$/i.test(n)) return '文本';
                    return '文件';
                  });
                  const countBy: Record<string, number> = {};
                  types.forEach(t => { countBy[t] = (countBy[t]||0) + 1; });
                  const parts = Object.entries(countBy).map(([k,v]) => `${k}${v>1?`×${v}`:''}`);
                  return parts.join('、');
                };
                await showConfirm({
                  title: '发送文件',
                  message: `确定发送：${summarize(files)}？`,
                  confirmText: '发送',
                  type: 'info',
                  onConfirm: async () => {
                    for (const f of files) {
                      const isImage = /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name);
                      const isVideo = /^video\//.test(f.type) || /\.(mp4|mov|avi|webm|mkv)$/i.test(f.name);
                      const endpoint = isImage ? '/api/upload' : (isVideo ? '/api/upload/video' : '/api/upload/file');
                      const uploaded = await uploadVia(endpoint, f);
                      if (uploaded) await sendAttachment({ type: isImage ? 'image' : isVideo ? 'video' : 'file', url: uploaded.url, name: f.name, mime: f.type, size: f.size });
                    }
                  }
                });
              }}
            >
                {messages.map((message, index) => renderMessageItem(message, index))}
                <div ref={messagesEndRef} />
                <div style={{ height: (activePanel !== 'none' ? panelHeight : 0) + inputHeight }} />
              </div>

              {/* 输入区域 - 固定底部 */}
              <div
                ref={inputWrapperRef}
                className={`px-4 sm:px-6 py-3 sm:py-4 border-t border-black/[0.08] bg-white/80 backdrop-blur-xl safe-area-bottom flex-shrink-0 z-[10002]`}
              >
                <div className="flex items-stretch space-x-3" style={{ height: controlsHeight }}>
                  <div className="flex-1 h-full">
                    <textarea
                      ref={textAreaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="输入消息..."
                      className="w-full h-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-28 min-h-[44px]"
                      rows={1}
                    />
                  </div>
                  <button onClick={() => setActivePanel(p => p === 'picker' ? 'none' : 'picker')} className="rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center" style={{ height: controlsHeight, width: controlsHeight }} title="表情与贴纸">
                    <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button onClick={() => setActivePanel(p => p === 'more' ? 'none' : 'more')} className="rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center" style={{ height: controlsHeight, width: controlsHeight }} title="更多">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 20.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
                  </button>
                  <button
                     onClick={() => { setActivePanel('none'); sendMessage(); }}
                     disabled={!newMessage.trim() || sendingMessage}
                     className="px-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2"
                     style={{ height: controlsHeight }}
                   >
                    {sendingMessage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                              )}
                    <span>发送</span>
                  </button>
                            </div>
                          </div>
              {/* 点击空白关闭（位于消息层之上、工具栏之下）*/}
              {activePanel !== 'none' && (
                <div className="absolute inset-0 z-[10000]" onClick={() => setActivePanel('none')} />
              )}
              {/* 隐藏的文件选择器 */}
              <input ref={imageInputRef} type="file" accept="image/*" hidden multiple onChange={pickImages} />
              <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={pickVideo} />
              <input ref={fileInputRef} type="file" hidden onChange={pickFile} />
              {/* 贴纸抽屉嵌在右侧区域内，始终从工具栏上边缘弹出 */}
              <div className="absolute inset-x-0 pointer-events-none z-[10003]" style={{ bottom: inputHeight }}>
                <div className="pointer-events-auto">
                  <StickerPicker isOpen={stickerOpen} onClose={() => setActivePanel('none')} onSelect={(u)=>{ sendSticker(u); setActivePanel('none'); }} title="选择表情" variant="sheet" />
                            </div>
              </div>
              {previewFile && (
                <div className="absolute inset-0 z-[100001] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40 opacity-0 animate-[fadeIn_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]" onClick={() => setPreviewFile(null)} />
                  <div className="relative bg-white rounded-2xl shadow-2xl w-[92vw] max-w-4xl max-h-[85vh] overflow-hidden animate-[popIn_220ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] min-h-[44px]">
                      <div className="text-sm text-gray-900 truncate pr-6 min-w-0 flex-1">{previewFile?.name || ''}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href={previewFile?.url || ''} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 sm:px-3 h-9 rounded-xl bg-blue-600 text-white text-sm">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12"/></svg>
                          <span className="hidden sm:inline">下载</span>
                        </a>
                        <button onClick={() => setPreviewFile(null)} className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                      </div>
                    </div>
                    <div className="p-0" style={{ maxHeight: 'calc(85vh - 52px)' }}>
                      <div className="w-full h-[calc(85vh-52px)] bg-gray-50">
                        <FilePreviewContent file={previewFile as any} />
                      </div>
                    </div>
                  </div>
                          </div>
                        )}
                        
              {/* 测评详情弹窗（限定在右侧聊天区域内） */}
              {assessmentModal.open && (
                <div className="absolute inset-0 z-[100002] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40 opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" onClick={handleCloseAssessmentModal} />
                  <div className="relative bg-white rounded-2xl shadow-2xl w-[92vw] max-w-3xl max-h-[85vh] overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform scale-100">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                      <h3 className="text-base font-semibold text-gray-900">测评详情</h3>
                      <button onClick={handleCloseAssessmentModal} className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                          </div>
                    <div className="px-4 pt-4 pb-0 overflow-y-auto" data-assessment-scroll="true" style={{ maxHeight: 'calc(85vh - 52px)', scrollBehavior: 'smooth' as any }}>
                      {assessmentModal.loading && (
                        <div className="py-16">
                          <div className="mx-auto w-64 p-4 rounded-2xl bg-gray-50 border border-black/[0.06] text-center">
                            <div className="w-6 h-6 mx-auto mb-2 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                            <div className="text-sm font-medium text-gray-900 mb-1">{assessmentModal.data?.__buffer__ === 'save' ? '保存进度中…' : '读取进度中…'}</div>
                            <div className="text-xs text-gray-500">请勿关闭此窗口</div>
                          </div>
                        </div>
                      )}
                      {!assessmentModal.loading && !assessmentModal.data && (
                        <div className="py-12 text-center text-gray-500">未找到该测评</div>
                      )}
                      {!assessmentModal.loading && assessmentModal.data && (
                        assessmentModal.data.assessment ? (
                          <AssessmentRunner
                            type={(assessmentModal.data.__start__ || assessmentModal.data.assessment?.type || '').toUpperCase() as any}
                            assessment={assessmentModal.data.assessment}
                            onDone={(detail: any) => {
                              setAssessmentModal({ open: true, loading: false, data: detail });
                              if (selectedRoom?.id) fetchMessages(selectedRoom.id);
                            }}
                            onCancel={handleCloseAssessmentModal}
                          />
                        ) : (
                          <div className="space-y-4 text-sm text-gray-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{getAssessmentDisplayName(assessmentModal.data.type)}</span>
                              {assessmentModal.data.personalityType && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">{assessmentModal.data.personalityType}</span>
                              )}
                              {assessmentModal.data.riskLevel && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">风险 {assessmentModal.data.riskLevel}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="p-3 rounded-xl bg-gray-50">
                                <div className="text-xs text-gray-500 mb-1">开始时间</div>
                                <div className="text-gray-900">{assessmentModal.data.startedAt ? new Date(assessmentModal.data.startedAt).toLocaleString('zh-CN') : '-'}</div>
                              </div>
                              <div className="p-3 rounded-xl bg-gray-50">
                                <div className="text-xs text-gray-500 mb-1">完成时间</div>
                                <div className="text-gray-900">{assessmentModal.data.completedAt ? new Date(assessmentModal.data.completedAt).toLocaleString('zh-CN') : '-'}</div>
                              </div>
                              {typeof assessmentModal.data.overallScore !== 'undefined' && (
                                <div className="p-3 rounded-xl bg-gray-50">
                                  <div className="text-xs text-gray-500 mb-1">总体分</div>
                                  <div className="text-gray-900">{assessmentModal.data.overallScore}</div>
                                </div>
                              )}
                              {assessmentModal.data.completionTime && (
                                <div className="p-3 rounded-xl bg-gray-50">
                                  <div className="text-xs text-gray-500 mb-1">用时</div>
                                  <div className="text-gray-900">{assessmentModal.data.completionTime} 秒</div>
                                </div>
                              )}
                            </div>
                            {renderAssessmentAnalysis(assessmentModal.data)}
                            {Array.isArray(assessmentModal.data.psychologicalTags) && assessmentModal.data.psychologicalTags.length > 0 && (
                              <div className="p-3 rounded-xl bg-white border border-black/[0.06]">
                                <div className="text-sm font-medium mb-2">心理标签</div>
                                <div className="flex flex-wrap gap-2">
                                  {assessmentModal.data.psychologicalTags.map((tag: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {assessmentModal.data.recommendations && (
                              <div className="p-3 rounded-xl bg-white border border-black/[0.06]">
                                <div className="text-sm font-medium mb-2">建议</div>
                                {Array.isArray(assessmentModal.data.recommendations) ? (
                                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
                                    {assessmentModal.data.recommendations.map((r: any, i: number) => (
                                      <li key={i}>{typeof r === 'string' ? r : JSON.stringify(r)}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{String(assessmentModal.data.recommendations)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 合并后的测评选择弹窗（限定在右侧聊天区域内） */}
              {assessmentSelect && assessmentSelect.mode && (
                <div className="absolute inset-0 z-[100003] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40 opacity-0 animate-[fadeIn_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]" onClick={() => setAssessmentSelect(null)} />
                  <div className="relative bg-white rounded-2xl shadow-2xl w-[92vw] max-w-sm overflow-hidden animate-[popIn_220ms_cubic-bezier(0.16,1,0.3,1)_forwards] border border-black/[0.06]">
                    <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
                      <div className="font-semibold text-gray-900">{assessmentSelect.mode === 'send' ? '发送测评结果' : '选择邀请的测评类型'}</div>
                      <button onClick={() => setAssessmentSelect(null)} className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      {['MBTI','SCL90','SDS/SAS'].map(t => (
                        <button key={t}
                          onClick={async () => {
                            if (assessmentSelect.mode === 'send') {
                              await sendLatestAssessmentCard(t as any);
                            } else if (assessmentSelect.mode === 'invite' && selectedRoom) {
                              try {
                                const token = localStorage.getItem('token');
                                if (!token) return;
                                const resp = await fetch(`/api/chat/messages/${selectedRoom.id}`, {
                                  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ messageType: 'invite_assessment', content: JSON.stringify({ type: t }) })
                                });
                                if (resp.ok) {
                                  const d = await resp.json();
                                  setMessages(prev => [...prev, d.message]);
                                  await fetchChatRooms();
                                  refreshUnreadCount();
                                }
                              } catch {}
                            }
                            setAssessmentSelect(null);
                          }}
                          className="p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-center">
                          <div className="text-2xl">{t==='MBTI'?'🧭':t==='SCL90'?'🧪':'🧠'}</div>
                          <div className="text-xs text-gray-800 mt-1">{getAssessmentDisplayName(t)}</div>
                              </button>
                      ))}
                    </div>
                  </div>
                            </div>
                          )}

              {activePanel === 'picker' && (
                <div id="chat-bottom-panel" className={`absolute left-0 right-0 z-[10003] animate-[panelIn_300ms_cubic-bezier(0.16,1,0.3,1)_forwards]`} style={{ bottom: inputHeight }}>
                  <div className="mx-auto max-w-4xl">
                    <div className="bg-white rounded-t-2xl border border-black/[0.06] shadow-[0_-12px_40px_rgba(0,0,0,0.08)] p-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-0 will-change-transform">
                      <div className="flex items-center justify-center py-1"><div className="w-10 h-1.5 bg-gray-300 rounded-full"/></div>
                      <div className="flex items-center justify-center gap-2 pb-2">
                        <button onClick={()=>setPickerTab('emoji')} className={`px-3 py-1.5 rounded-full text-sm ${pickerTab==='emoji'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>表情</button>
                        <button onClick={()=>setPickerTab('sticker')} className={`px-3 py-1.5 rounded-full text-sm ${pickerTab==='sticker'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>贴纸</button>
                        </div>
                      {pickerTab === 'emoji' ? (
                        <div className="grid grid-cols-8 gap-2 px-1 pb-2 max-h-[38vh] overflow-y-auto">
                          {['😀','😄','😁','😆','🥹','😊','🙂','🙃','😉','😍','😘','😚','😜','🤗','🤔','😴','🤤','😮','😎','🤩','🤯','😡','😭','😅','😇','🥳','🤝','👍','👎','🙏','👏','💪','🌟','🔥','🎉','❤️','💖','💯','✅','❌'].map(em => (
                            <button key={em} className="text-2xl hover:scale-110 transition-transform" onClick={async () => {
                              setNewMessage(prev => (prev ? prev + em : em));
                              if (!newMessage.trim() && selectedRoom) {
                                try {
                                  const token = localStorage.getItem('token');
                                  if (!token) return;
                                  const resp = await fetch(`/api/chat/messages/${selectedRoom.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: em, messageType: 'emoji' }) });
                                  if (resp.ok) {
                                    const d = await resp.json();
                                    setMessages(prev => [...prev, d.message]);
                                    await fetchChatRooms();
                                    refreshUnreadCount();
                                    window.dispatchEvent(new CustomEvent('chatRoomRead', { detail: { roomId: selectedRoom.id } }));
                                    window.dispatchEvent(new CustomEvent('refreshNotifications'));
                                  }
                                } catch {}
                              }
                              setActivePanel('none');
                            }}>{em}</button>
                          ))}
                      </div>
                      ) : (
                        <div className="px-1 pb-2 max-h-[38vh] overflow-y-auto">
                          <StickerPicker isOpen={true} onClose={()=>setActivePanel('none')} onSelect={(u)=>{ sendSticker(u); setActivePanel('none'); }} title="选择贴纸" variant="inline" />
                    </div>
                      )}
              </div>
                  </div>
                </div>
              )}

              {/* 右侧作用域：暂无测评记录的错误提示 */}
              {scopedError?.open && (
                <div className="absolute inset-0 z-[100005] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/30" onClick={() => setScopedError(null)} />
                  <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-black/[0.06] overflow-hidden" style={{animation:'dialogBounceIn 0.35s cubic-bezier(0.16,1,0.3,1)'}}>
                    <div className="px-6 py-6 text-center">
                      <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mb-1">{scopedError.title || '操作失败'}</div>
                      <div className="text-sm text-gray-600">{scopedError.message}</div>
                    </div>
                    <div className="px-6 pb-4">
                      <button onClick={() => setScopedError(null)} className="w-full py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700">好的</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 右侧作用域：确认取消测试对话框 */}
              {cancelTestDialog.open && (
                <div className="absolute inset-0 z-[100006] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/30" onClick={() => setCancelTestDialog({ open: false })} />
                  <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-black/[0.06] overflow-hidden" style={{animation:'dialogBounceIn 0.35s cubic-bezier(0.16,1,0.3,1)'}}>
                    <div className="p-6 border-b border-black/[0.06] flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5C2.962 18.333 3.924 20 5.464 20z"/></svg>
                      </div>
                  <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">确认取消测试？</h3>
                        <p className="mt-1 text-gray-600 leading-relaxed">取消后将清除进行中的答题进度并删除历史记录，邀请方会收到“对方已取消测试”的状态</p>
                  </div>
                    </div>
                    <div className="p-6 flex gap-3">
                      <button onClick={() => setCancelTestDialog({ open: false })} className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">继续测试</button>
                      <button onClick={async () => {
                        try {
                          const messageId = cancelTestDialog.messageId!;
                          const token = localStorage.getItem('token'); if (!token) return;
                          const inviteId = findInviteIdByMessageId(messageId) || messageId;
                          try {
                            const msg = messages.find(m => m.id === messageId);
                            let assessmentId: string | undefined;
                            try { assessmentId = msg ? JSON.parse(msg.content || '{}')?.assessmentId : undefined; } catch {}
                            if (assessmentId && typeof window !== 'undefined') sessionStorage.removeItem('assessment_p_' + assessmentId);
                          } catch {}
                          const r = await fetch(`/api/chat/messages/invite/${encodeURIComponent(inviteId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'cancel' }) });
                          if (r.ok) {
                            setMessages(prev => prev.map(msg => {
                              if (msg.id !== messageId) return msg;
                              let content: any = {}; try { content = JSON.parse(msg.content || '{}'); } catch {}
                              const total = content?.progress?.total || 0;
                              const next = { ...content, status: 'canceled', inProgress: false, paused: false, progress: { answeredCount: 0, total, percent: 0 } };
                              delete next.assessmentId;
                              return { ...msg, content: JSON.stringify(next) } as any;
                            }));
                            try { forceInProgressMessageIdsRef.current.delete(messageId); } catch {}
                            try { preloadMyAssessments(); } catch {}
                          }
                        } finally {
                          setCancelTestDialog({ open: false });
                        }
                      }} className="flex-1 py-2.5 rounded-lg text-white bg-amber-500 hover:bg-amber-600">确认取消</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 右侧范围内的删除/清空确认弹窗（不影响左侧列表） */}
              {deleteDialog.isOpen && (
                <div className="absolute inset-0 z-[100004] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteDialog(prev => ({ ...prev, isOpen: false }))} />
                  <div className="relative w-[92vw] max-w-md bg-white rounded-2xl shadow-2xl border border-black/[0.06] overflow-hidden" style={{ animation: 'dialogBounceIn 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
                    <div className="p-6 border-b border-black/[0.06] flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${deleteDialog.type === 'clear' ? 'bg-amber-100' : 'bg-red-100'}`}>
                        {deleteDialog.type === 'clear' ? (
                          <svg className="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5C2.962 18.333 3.924 20 5.464 20z"/></svg>
                        ) : (
                          <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        )}
                      </div>
                  <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{deleteDialog.title}</h3>
                        <p className="mt-1 text-gray-600 leading-relaxed">{deleteDialog.message}</p>
                  </div>
                    </div>
                    <div className="p-6 flex gap-3">
                  <button
                        onClick={() => setDeleteDialog(prev => ({ ...prev, isOpen: false }))}
                        className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => { try { deleteDialog.onConfirm(); } finally { setDeleteDialog(prev => ({ ...prev, isOpen: false })); } }}
                        className={`flex-1 py-2.5 rounded-lg text-white transition-colors ${deleteDialog.type === 'clear' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}`}
                      >
                        {deleteDialog.type === 'clear' ? '确认清空' : '确认删除'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {moreOpen && (
                <div id="chat-bottom-panel" className={`absolute left-0 right-0 z-[10003] ${moreOpen ? 'animate-[panelIn_300ms_cubic-bezier(0.16,1,0.3,1)_forwards]' : 'animate-[panelOut_240ms_ease-in_forwards]'}`} style={{ bottom: inputHeight }}>
                  <div className="mx-auto max-w-4xl">
                    <div className="bg-white rounded-t-2xl border border-black/[0.06] shadow-[0_-12px_40px_rgba(0,0,0,0.08)] p-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-0 will-change-transform">
                      <div className="flex items-center justify-center py-1"><div className="w-10 h-1.5 bg-gray-300 rounded-full"/></div>
                      <div ref={moreScrollRef} className="overflow-x-auto snap-x snap-mandatory no-scrollbar">
                        <div className="flex">
                          {/* 第1页：常用功能 */}
                          <div className="min-w-full snap-start grid grid-cols-4 gap-3 px-2 pb-2">
                            <button onClick={() => { imageInputRef.current?.click(); setActivePanel('none'); }} className="h-24 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 flex flex-col items-center justify-center">
                              <span className="text-2xl">🖼️</span>
                              <span className="text-xs text-gray-800 mt-1">相册</span>
                            </button>
                            <button onClick={() => { videoInputRef.current?.click(); setActivePanel('none'); }} className="h-24 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 flex flex-col items-center justify-center">
                              <span className="text-2xl">🎬</span>
                              <span className="text-xs text-gray-800 mt-1">拍摄</span>
                            </button>
                            <button onClick={() => { fileInputRef.current?.click(); setActivePanel('none'); }} className="h-24 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 flex flex-col items-center justify-center">
                              <span className="text-2xl">📎</span>
                              <span className="text-xs text-gray-800 mt-1">文件</span>
                            </button>
                            <button onClick={() => { setActivePanel('picker'); }} className="h-24 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 flex flex-col items-center justify-center">
                              <span className="text-2xl">😄</span>
                              <span className="text-xs text-gray-800 mt-1">表情与贴纸</span>
                            </button>
                            <button disabled className="h-24 rounded-xl bg-gray-50 border border-gray-200 opacity-60 cursor-not-allowed flex flex-col items-center justify-center">
                              <span className="text-2xl">📍</span>
                              <span className="text-xs text-gray-800 mt-1">位置</span>
                            </button>
                            <button disabled className="h-24 rounded-xl bg-gray-50 border border-gray-200 opacity-60 cursor-not-allowed flex flex-col items-center justify-center">
                              <span className="text-2xl">⭐</span>
                              <span className="text-xs text-gray-800 mt-1">收藏</span>
                            </button>
                            <button disabled className="h-24 rounded-xl bg-gray-50 border border-gray-200 opacity-60 cursor-not-allowed flex flex-col items-center justify-center">
                              <span className="text-2xl">👤</span>
                              <span className="text-xs text-gray-800 mt-1">名片</span>
                            </button>
                            <button disabled className="h-24 rounded-xl bg-gray-50 border border-gray-200 opacity-60 cursor-not-allowed flex flex-col items-center justify-center">
                              <span className="text-2xl">🎵</span>
                              <span className="text-xs text-gray-800 mt-1">音乐</span>
                  </button>
                </div>
                          {/* 第2页：测评相关（发送结果/邀请测评） */}
                          <div className="min-w-full snap-start grid grid-cols-4 gap-3 px-2 pb-2">
                            <button onClick={() => { setAssessmentSelect({ mode: 'send' }); }} className="h-24 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 flex flex-col items-center justify-center col-span-2">
                              <span className="text-2xl">📤</span>
                              <span className="text-xs text-blue-800 mt-1">发送测评结果</span>
                            </button>
                            <button onClick={() => { sendInviteAssessment(); }} className="h-24 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 flex flex-col items-center justify-center col-span-2">
                              <span className="text-2xl">🤝</span>
                              <span className="text-xs text-indigo-800 mt-1">邀请测评</span>
                            </button>
              </div>
              </div>
                      </div>
                      <div className="flex items-center justify-center gap-1 py-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${morePage === 0 ? 'bg-gray-800' : 'bg-gray-300'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full ${morePage === 1 ? 'bg-gray-800' : 'bg-gray-300'}`}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* 空状态 */
            <div className="flex-1 flex items-center justify-center bg-white/50">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">欢迎来到心语聊天</h3>
                <p className="text-gray-600 mb-4">选择一个聊天开始对话，或搜索用户开始新的聊天</p>
                <p className="text-sm text-gray-500">💡 您可以与老师进行专业咨询</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => { setActiveTab('chats'); openSidebar(); }}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    打开聊天列表
                  </button>
                  <button
                    onClick={() => { setActiveTab('contacts'); openSidebar(); }}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    选择联系人
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 小屏抽屉：聊天列表 */}
      {sidebarMounted && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100000] lg:hidden">
          <div className={`absolute inset-0 bg-black/35 backdrop-blur-[2px] ${sidebarOpen ? 'backdrop-enter' : 'backdrop-exit'}`} onClick={closeSidebar} />
          <div
            className={`absolute left-0 top-0 h-[100dvh] w-[88%] max-w-[420px] bg-white/95 backdrop-blur-xl border-r border-black/[0.06] shadow-2xl flex flex-col ${sidebarOpen ? 'drawer-left-enter' : 'drawer-left-exit'}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* 头部：增加"聊天/联系人"切换 */}
            <div className="p-4 border-b border-black/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{activeTab === 'contacts' ? '联系人' : '聊天列表'}</h2>
                <div className="ml-1 inline-flex rounded-xl bg-gray-100 p-1">
                  <button
                    className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'chats' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
                    onClick={() => setActiveTab('chats')}
                  >
                    聊天
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'contacts' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
                    onClick={() => { setActiveTab('contacts'); if (allContacts.length === 0) { fetchAllContacts(); } }}
                  >
                    联系人
                  </button>
                </div>
              </div>
              <button aria-label="关闭" onClick={closeSidebar} className="h-10 w-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29l6.29 6.29 6.3-6.29z"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'chats' ? (
              <div className="p-4 space-y-2">
                {chatRooms.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">暂无聊天记录</div>
                ) : (
                  chatRooms.map((room) => (
                    <div key={room.id} className={`flex items-center p-4 rounded-2xl transition-all duration-300 ${selectedRoom?.id === room.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`} onClick={() => { setSelectedRoom(room); closeSidebar(); }}>
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-medium mr-3">
                        {room.chatTarget?.nickname?.[0] || room.chatTarget?.name?.[0] || room.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{room.chatTarget?.nickname ? `${room.chatTarget.nickname}（${room.chatTarget.name}）` : room.name}</p>
                          <p className="text-xs text-gray-500 truncate">{room.lastMessage ? `${room.lastMessage.sender.nickname || room.lastMessage.sender.name}: ${room.lastMessage.messageType === 'sticker' ? '[表情]' : room.lastMessage.messageType === 'image' ? '[图片]' : room.lastMessage.messageType === 'video' ? '[视频]' : room.lastMessage.messageType === 'file' ? '[文件]' : room.lastMessage.messageType === 'assessment' ? '[测评结果]' : room.lastMessage.messageType === 'invite_assessment' ? '[测评邀请]' : room.lastMessage.content}` : '开始聊天吧…'}</p>
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="ml-2 min-w-[18px] px-1 h-[18px] rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
              ) : (
                <div className="p-4 space-y-3">
                  {contactsLoading ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-500">加载联系人...</p>
                    </div>
                  ) : allContacts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">暂无联系人</div>
                  ) : (
                    <>
                      {/* 特别关注分组（置顶） */}
                      {favoriteUsers.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50/80 rounded-xl mb-2 border border-yellow-200/60">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">特别关注</span>
                            <span className="text-xs text-yellow-700/80">{favoriteUsers.length} 位联系人</span>
                          </div>
                          <div className="space-y-1">
                            {favoriteUsers.map((user: any) => (
                              <div
                                key={user.id}
                                className="flex items-center p-3 rounded-xl hover:bg-white/90 border border-transparent hover:border-gray-200/50"
                                onClick={() => { startChatWithFriend(user.id); closeSidebar(); }}
                              >
                                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-xl flex items-center justify-center text-white font-bold mr-3">
                                  {user.nickname?.[0] || user.name?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{user.nickname ? `${user.nickname}（${user.name}）` : user.name}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 其余分组（含层级分组） */}
                      {allContacts.map((group: any, groupIndex: number) => (
                        <div key={groupIndex}>
                          {group.groupType === 'hierarchical_students' && group.hierarchicalData ? (
                            <div className="space-y-2">
                              {group.hierarchicalData.map((topLevelGroup: any, index: number) => (
                                <CollapsibleContactGroup
                                  key={`${topLevelGroup.groupName}-${index}`}
                                  group={topLevelGroup}
                                  level={0}
                                  onUserClick={(id: string) => { startChatWithFriend(id); closeSidebar(); }}
                                  isFavorite={isFavoriteContact}
                                  onToggleFavorite={toggleFavoriteContact}
                                />
                              ))}
                            </div>
                          ) : (
                            ((Array.isArray(group.users) && group.users.length > 0) || (group.groupType === 'friend_group' && group.isCustomGroup)) && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 rounded-xl border border-gray-100/60">
                                  <span className="text-sm font-medium text-gray-800">{group.groupName}</span>
                                  <span className="text-xs text-gray-500">{group.users?.length || 0} 位</span>
                                </div>
                                <div className="space-y-1">
                                  {group.users?.map((user: any) => (
                                    <div
                                      key={user.id}
                                      className="flex items-center p-3 rounded-xl hover:bg-white/90 border border-transparent hover:border-gray-200/50"
                                      onClick={() => { startChatWithFriend(user.id); closeSidebar(); }}
                                    >
                                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-medium mr-3">
                                        {user.nickname?.[0] || user.name?.[0]}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{user.nickname ? `${user.nickname}（${user.name}）` : user.name}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 好友申请对话框 */}
      <FriendRequestDialog
        isOpen={showFriendRequests}
        onClose={() => setShowFriendRequests(false)}
        onRequestProcessed={() => {
          fetchPendingRequestsCount();
          fetchAllContacts();
        }}
      />

      {/* 分组管理对话框 */}
      <FriendGroupManager
        isOpen={showGroupManager}
        onClose={() => setShowGroupManager(false)}
        onGroupsUpdated={() => {
          fetchAllContacts();
        }}
      />

      {/* 删除好友对话框 */}
      <DeleteFriendDialog
        isOpen={showDeleteFriendDialog}
        friend={friendToDelete}
        onClose={() => {
          setShowDeleteFriendDialog(false);
          setFriendToDelete(null);
        }}
        onConfirm={confirmDeleteFriend}
        isLoading={deletingFriend}
      />

      {/* 删除确认对话框已移到右侧聊天区内渲染，避免遮盖左侧列表 */}

      {/* 通用确认对话框 */}
      <ConfirmDialog />

      
    </div>
  );
}

// 新增：文件预览内容组件（带阻止时的降级为下载）
function FilePreviewContent({ file }: { file: { url: string; name?: string; mime?: string } }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setLoaded(false); setFailed(false); }, [file?.url]);

  const url = file?.url || '';
  const name = file?.name || '';
  const mime = file?.mime || '';
  const ext = (name.split('.').pop() || '').toLowerCase();

  const isImage = /^image\//.test(mime);
  const isVideo = /^video\//.test(mime);
  const isPdf = ext === 'pdf' || /^application\/pdf$/i.test(mime);
  const isOffice = /^(doc|docx|xls|xlsx|ppt|pptx)$/.test(ext);

  // Ensure URLs are absolute when passing to third-party viewers
  const absoluteUrl = (() => {
    if (/^https?:\/\//i.test(url)) return url;
    if (/^(data:|blob:)/i.test(url)) return url; // cannot be fetched by Office viewer
    try {
      if (typeof window !== 'undefined') return new URL(url, window.location.origin).href;
    } catch {}
    return url;
  })();

  // Fallback timer for Office embed possibly blocked or failing silently
  useEffect(() => {
    if (!isOffice) return;
    const t = setTimeout(() => { if (!loaded) setFailed(true); }, 2000);
    return () => clearTimeout(t);
  }, [absoluteUrl, loaded, isOffice]);

  // Decide content
  let content: React.ReactNode = null;

  if (isImage) {
    content = <img src={url} alt={name} className="w-full h-full object-contain" />;
  } else if (isVideo) {
    content = <video src={url} controls className="w-full h-full object-contain" />;
  } else if (isPdf) {
    // Some browsers block PDF in iframes due to XFO; if that happens onError won't always fire. Provide download CTA as well.
    content = (
      <iframe
        src={absoluteUrl}
        className="w-full h-full"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    );
  } else if (isOffice) {
    if (!/^https?:\/\//i.test(absoluteUrl)) {
      // Office viewer requires a publicly reachable https URL; fallback to download
      content = (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-600">
            <div className="mb-3">该文件链接不可用于在线预览</div>
            <a href={url} download target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">下载文件</a>
          </div>
        </div>
      );
    } else {
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
      content = (
        <iframe
          src={viewerUrl}
          className="w-full h-full"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      );
    }
  } else if (failed) {
    content = (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="mb-3">无法在线预览该文件</div>
          <a href={url} download target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">下载文件</a>
        </div>
      </div>
    );
  } else {
    // Generic iframe fallback (e.g., plain text)
    content = (
      <iframe
        src={absoluteUrl}
        className="w-full h-full"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    );
  }

  return <>{content}</>;
}
