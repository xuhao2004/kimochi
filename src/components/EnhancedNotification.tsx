"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';

interface SystemMessage {
  id: string;
  type: 'password_reminder' | 'profile_reminder' | 'comment_pinned' | 'comment_deleted' | 'post_pinned' | 'post_deleted' | 'report_submitted' | 'report_resolved' | 'report_dismissed' | 'post_deleted_violation' | 'system';
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
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
}

interface AdminMessage {
  id: string;
  type: 'deepseek_quota_limit' | 'weather_api_limit' | 'general';
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  isProcessed: boolean;
  createdAt: string;
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

interface EnhancedNotificationProps {
  token?: string;
  userType?: 'superAdmin' | 'admin' | 'teacher' | 'student' | 'self';
}

export default function EnhancedNotification({ token, userType }: EnhancedNotificationProps) {
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [otherUnreadCount, setOtherUnreadCount] = useState(0);
  const [showMessages, setShowMessages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistoryMode, setShowHistoryMode] = useState(false); // 是否显示历史消息模式
  const [historyClearTime, setHistoryClearTime] = useState<Date | null>(null); // 历史清空时间

  useEffect(() => {
    setMounted(true);
    
    // 加载历史清空时间
    const clearTimeStr = localStorage.getItem('notificationHistoryClearTime');
    if (clearTimeStr) {
      setHistoryClearTime(new Date(clearTimeStr));
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchAllMessages();
      
      // 设置定期刷新机制，确保状态同步
      const interval = setInterval(() => {
        fetchAllMessages(showHistoryMode);
      }, 30000); // 每30秒刷新一次
      
      return () => clearInterval(interval);
    }
  }, [token]);

  // 监听消息状态更新事件
  useEffect(() => {
    const handleRefreshNotifications = () => {
      if (token) {
        fetchAllMessages(showHistoryMode);
      }
    };

    const handleChatRoomRead = (event: CustomEvent) => {
      // 处理聊天室已读事件
      const { roomId } = event.detail || {};
      if (roomId && token) {
        // 立即移除该聊天室的未读消息
        setChatMessages(prev => prev.filter(msg => msg.roomId !== roomId));
        // 刷新数据以获取最新状态
        setTimeout(() => fetchAllMessages(), 500);
      }
    };

    window.addEventListener('refreshNotifications', handleRefreshNotifications);
    window.addEventListener('chatRoomRead', handleChatRoomRead as EventListener);
    
    return () => {
      window.removeEventListener('refreshNotifications', handleRefreshNotifications);
      window.removeEventListener('chatRoomRead', handleChatRoomRead as EventListener);
    };
  }, [token]);

  // 实时更新总未读数量
  useEffect(() => {
    const totalCount = otherUnreadCount + chatMessages.length;
    setTotalUnreadCount(totalCount);
  }, [chatMessages.length, otherUnreadCount]);

  // 悬停延迟显示预览
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isHovering && totalUnreadCount > 0) {
      timer = setTimeout(() => {
        setShowPreview(true);
      }, 800); // 800ms延迟显示
    } else {
      setShowPreview(false);
    }
    return () => clearTimeout(timer);
  }, [isHovering, totalUnreadCount]);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const fetchAllMessages = async (includeHistory = false) => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // 构建请求数组 - 根据用户类型和历史模式决定获取哪些消息
      const userMessagesParam = includeHistory ? '' : '?isRead=false';
      const requests = [
        fetch(`/api/user-messages${userMessagesParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/chat/unread', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/chat/friends/requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ];

      // 仅超级管理员和老师可以看到管理员消息
      if (userType === 'superAdmin' || userType === 'admin' || userType === 'teacher') {
        const adminMessagesParam = includeHistory ? '' : '?isRead=false';
        requests.push(
          fetch(`/api/admin/messages${adminMessagesParam}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        );
      }

      const responses = await Promise.all(requests);
      const [systemResponse, chatResponse, friendRequestResponse, adminResponse] = responses;

      const systemData = systemResponse.ok ? await systemResponse.json() : { messages: [], unreadCount: 0 };
      const chatData = chatResponse.ok ? await chatResponse.json() : { latestUnreadMessages: [], totalUnreadCount: 0 };
      const friendRequestData = friendRequestResponse.ok ? await friendRequestResponse.json() : { receivedRequests: [] };
      
      let adminData = { messages: [], statistics: { unread: 0 } };
      if (adminResponse) {
        adminData = adminResponse.ok ? await adminResponse.json() : { messages: [], statistics: { unread: 0 } };
      }
      
      // 根据显示模式过滤消息
      let filteredSystemMessages: any[] = [];
      let filteredAdminMessages: any[] = [];
      
      if (includeHistory) {
        // 历史模式：显示清空时间之后的所有消息
        const clearTime = historyClearTime;
        filteredSystemMessages = (systemData.messages || []).filter((msg: any) => {
          if (!clearTime) return true; // 没有清空时间，显示所有
          return new Date(msg.createdAt) > clearTime;
        });
        
        filteredAdminMessages = (adminData.messages || []).filter((msg: any) => {
          if (!clearTime) return true; // 没有清空时间，显示所有
          return new Date(msg.createdAt) > clearTime;
        });
      } else {
        // 未读模式：只显示未读消息
        filteredSystemMessages = (systemData.messages || []).filter((msg: any) => !msg.isRead);
        filteredAdminMessages = (adminData.messages || []).filter((msg: any) => !msg.isRead);
      }
      
      setSystemMessages(filteredSystemMessages);
      setAdminMessages(filteredAdminMessages);
      setFriendRequests(friendRequestData.receivedRequests || []);
      
      // 将聊天消息转换为统一格式
      // 注意：聊天消息总是显示未读的，历史模式下不显示聊天消息（因为聊天有自己的历史界面）
      // 严格检查：只有在非历史模式且确实有未读消息时才显示
      let formattedChatMessages: any[] = [];
      
      if (!includeHistory && chatData.totalUnreadCount > 0 && chatData.latestUnreadMessages) {
        formattedChatMessages = chatData.latestUnreadMessages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          roomId: msg.chatRoom.id,
          roomName: msg.chatRoom.name,
          senderName: msg.sender.nickname || msg.sender.name,
          isRead: false,
          createdAt: msg.createdAt
        }));
        
        // 额外验证：如果API返回的未读数量为0，强制清空消息列表
        if (chatData.totalUnreadCount === 0) {
          formattedChatMessages = [];
        }
      }
      
      setChatMessages(formattedChatMessages);
      
      // 分别存储聊天消息和其他消息的未读数量
      const otherCount = (systemData.unreadCount || 0) + 
                        ((adminData.statistics?.unread || 0)) +
                        (friendRequestData.receivedRequests?.length || 0);
      setOtherUnreadCount(otherCount);
      
      const totalCount = otherCount + (chatData.totalUnreadCount || 0);
      setTotalUnreadCount(totalCount);

    } catch (error) {
      console.error('获取消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const markSystemMessageAsRead = async (messageId: string, messageSource?: 'user_message' | 'admin_message') => {
    if (!token) return;

    try {
      await fetch('/api/user-messages', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          messageIds: [messageId],
          messageType: messageSource
        })
      });
      fetchAllMessages();
    } catch (error) {
      console.error('标记消息已读失败:', error);
    }
  };

  const clearAllHistory = async () => {
    if (!token) return;
    
    try {
      console.log('开始清空历史消息...');
      
      // 设置清空时间戳为当前时间
      const clearTime = new Date();
      setHistoryClearTime(clearTime);
      localStorage.setItem('notificationHistoryClearTime', clearTime.toISOString());
      
      console.log('历史清空时间已设置为:', clearTime.toLocaleString());
      
      // 同时标记所有当前消息为已读（保持原有逻辑）
      const userMessageResponse = await fetch('/api/user-messages', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          markAllAsRead: true
        })
      });
      
      if (!userMessageResponse.ok) {
        console.error('标记用户消息已读失败:', await userMessageResponse.text());
      } else {
        console.log('用户消息已标记为已读');
      }
      
      // 标记所有管理员消息为已读
      if (userType === 'superAdmin' || userType === 'admin' || userType === 'teacher') {
        const adminMessageResponse = await fetch('/api/admin/messages', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            markAllAsRead: true
          })
        });
        
        if (!adminMessageResponse.ok) {
          console.error('标记管理员消息已读失败:', await adminMessageResponse.text());
        } else {
          console.log('管理员消息已标记为已读');
        }
      }
      
      // 立即刷新消息列表以应用过滤
      console.log('立即刷新消息列表...');
      fetchAllMessages(showHistoryMode);
      
      // 触发全局刷新
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
      
    } catch (error) {
      console.error('清空历史消息失败:', error);
    }
  };

  const markChatMessageAsRead = async (messageId: string, roomId: string) => {
    // 聊天消息的已读状态通过访问聊天室自动更新
    try {
      // 立即从状态中移除这条消息和同房间的所有消息（防止残留）
      setChatMessages(prev => prev.filter(msg => msg.roomId !== roomId));
      console.log(`已从前端状态移除房间 ${roomId} 的所有消息`);
      
      // 手动更新该聊天室的最后阅读时间
      const response = await fetch(`/api/chat/messages/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        // 触发聊天室已读事件，确保所有相关组件都更新
        window.dispatchEvent(new CustomEvent('chatRoomRead', {
          detail: { roomId }
        }));
        
        // 延迟重新获取数据以确保数据库已更新
        setTimeout(() => {
          fetchAllMessages(showHistoryMode);
          // 也触发UnreadContext的刷新
          window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
        }, 200);
      } else {
        console.error('标记聊天消息已读失败，响应状态:', response.status);
        // 如果失败，恢复消息到状态中
        fetchAllMessages(showHistoryMode);
      }
    } catch (error) {
      console.error('标记聊天消息已读失败:', error);
      // 如果失败，重新获取数据以恢复正确状态
      fetchAllMessages(showHistoryMode);
    }
  };

  const getActionButton = (message: SystemMessage) => {
    if (message.type === 'password_reminder') {
      return (
        <Link
          href="/profile?openPasswordDialog=true"
          className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-full hover:bg-blue-600 transition-colors font-medium"
          onClick={() => {
            markSystemMessageAsRead(message.id, message.source);
            setShowMessages(false);
          }}
        >
          修改
        </Link>
      );
    } else if (message.type === 'profile_reminder') {
      return (
        <Link
          href="/profile?openEditDialog=true"
          className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-full hover:bg-blue-600 transition-colors font-medium"
          onClick={() => {
            markSystemMessageAsRead(message.id, message.source);
            setShowMessages(false);
          }}
        >
          完善
        </Link>
      );
    } else if (message.type === 'comment_pinned' || message.type === 'comment_deleted' || 
               message.type === 'post_pinned' || message.type === 'post_deleted') {
      // 留言墙相关通知
      return (
        <Link
          href={message.relatedPostId ? `/message-wall?post=${message.relatedPostId}` : '/message-wall'}
          className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-full hover:bg-purple-600 transition-colors font-medium"
          onClick={() => {
            markSystemMessageAsRead(message.id, message.source);
            setShowMessages(false);
          }}
        >
          查看
        </Link>
      );
    } else if (message.type === 'report_submitted') {
      // 举报提交通知 - 仅管理员和老师可见
      if (userType === 'superAdmin' || userType === 'admin' || userType === 'teacher') {
        return (
          <Link
            href={`/admin/reports?status=pending${message.relatedPostId ? `&postId=${message.relatedPostId}` : ''}`}
            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-full hover:bg-red-600 transition-colors font-medium"
            onClick={() => {
              markSystemMessageAsRead(message.id, message.source);
              setShowMessages(false);
            }}
          >
            处理
          </Link>
        );
      }
    } else if (message.type === 'report_resolved' || message.type === 'report_dismissed' || message.type === 'post_deleted_violation') {
      // 举报处理结果通知
      return (
        <Link
          href={message.relatedPostId ? `/message-wall?post=${message.relatedPostId}` : '/message-wall'}
          className="text-xs bg-gray-500 text-white px-3 py-1.5 rounded-full hover:bg-gray-600 transition-colors font-medium"
          onClick={() => {
            markSystemMessageAsRead(message.id, message.source);
            setShowMessages(false);
          }}
        >
          查看
        </Link>
      );
    }
    return null;
  };

  if (!token) return null;

  return (
    <>
      {/* 消息通知按钮 */}
      <div className="relative">
        <button
          onClick={() => setShowMessages(!showMessages)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`notification-button relative p-2.5 rounded-xl group ${
            totalUnreadCount > 0 
              ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          title="消息通知"
        >
          {/* 精美铃铛图标 */}
          <div className="relative">
            <svg className="w-6 h-6 transition-transform duration-300 ease-out group-hover:rotate-12" fill="currentColor" viewBox="0 0 24 24">
              {/* 铃铛主体 */}
              <path d="M12 2C10.34 2 9 3.34 9 5V5.32C6.78 6.44 5.25 8.61 5.25 11.25V16L3 18.25V19H21V18.25L18.75 16V11.25C18.75 8.61 17.22 6.44 15 5.32V5C15 3.34 13.66 2 12 2Z"/>
              {/* 铃铛底部铃舌 */}
              <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"/>
            </svg>
            
            {/* 声波动画效果 - 仅在有未读消息时显示 */}
            {totalUnreadCount > 0 && (
              <>
                <div className="absolute -top-1 -left-1 w-8 h-8 border-2 border-current opacity-30 rounded-full animate-ping" style={{animationDelay: '0s'}} />
                <div className="absolute -top-1 -left-1 w-8 h-8 border-2 border-current opacity-20 rounded-full animate-ping" style={{animationDelay: '0.5s'}} />
              </>
            )}
          </div>
          
          {/* 动态徽章 */}
          {totalUnreadCount > 0 && (
            <span className="notification-badge absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-lg">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
          
          {/* 悬停时的光晕效果 */}
          {isHovering && (
            <div className="absolute inset-0 rounded-xl bg-blue-100 opacity-20 animate-ping" />
          )}
        </button>

        {/* 悬停预览 */}
        {mounted && showPreview && !showMessages && createPortal(
          <div 
            className="fixed top-16 right-4 w-72 bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50"
            style={{ 
              zIndex: 99999997,
              animation: 'slideInFromTop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">未读消息</h3>
                <span className="text-xs text-gray-500">{totalUnreadCount} 条</span>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {/* 显示最新的3条系统消息 */}
                {systemMessages.slice(0, 2).map((message) => (
                  <div key={`preview-system-${message.id}`} className="p-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{message.title}</p>
                        <p className="text-xs text-gray-600 truncate">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 显示最新的2条聊天消息 */}
                {chatMessages.slice(0, 2).map((message) => (
                  <div key={`preview-chat-${message.id}`} className="p-2 rounded-lg bg-green-50/50 border border-green-100/50">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{message.senderName}</p>
                        <p className="text-xs text-gray-600 truncate">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(systemMessages.length + chatMessages.length) > 4 && (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500">还有 {totalUnreadCount - 4} 条消息...</p>
                  </div>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">点击铃铛查看全部消息</p>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* 消息弹窗 - 使用Portal渲染到body */}
      {mounted && showMessages && createPortal(
        <div>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0"
            style={{ 
              zIndex: 99999998,
              backgroundColor: 'transparent'
            }}
            onClick={() => setShowMessages(false)}
          />
          
          {/* 消息弹窗 */}
          <div 
            className="fixed top-16 right-4 w-80 bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4 zoom-in-95"
            style={{ 
              zIndex: 99999999,
              maxHeight: '28rem',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'fixed',
              animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="p-4 border-b border-gray-100/80">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base">通知</h3>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {showHistoryMode ? 
                      (historyClearTime ? 
                        `历史消息 (${historyClearTime.toLocaleDateString()} 后)` : 
                        '历史消息'
                      ) : 
                      (totalUnreadCount > 0 ? `${totalUnreadCount} 条未读` : '暂无未读消息')
                    }
                  </div>
                </div>
                <button
                  onClick={() => setShowMessages(false)}
                  className="w-7 h-7 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 控制按钮区域 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {/* 模式切换按钮 */}
                  <button
                    onClick={() => {
                      const newMode = !showHistoryMode;
                      setShowHistoryMode(newMode);
                      fetchAllMessages(newMode);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                      showHistoryMode 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {showHistoryMode ? '仅未读' : '历史'}
                  </button>
                  
                  {/* 未读模式下的全部已读按钮 */}
                  {!showHistoryMode && totalUnreadCount > 0 && (
                    <button
                      onClick={clearAllHistory}
                      className="px-3 py-1.5 text-xs rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                    >
                      全部已读
                    </button>
                  )}
                </div>
                
                {/* 清空按钮 - 仅在历史模式下显示 */}
                {showHistoryMode && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={clearAllHistory}
                      className="px-3 py-1.5 text-xs rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    >
                      清空历史
                    </button>
                    
                    {/* 重置历史按钮 - 有清空记录时显示 */}
                    {historyClearTime && (
                      <button
                        onClick={() => {
                          setHistoryClearTime(null);
                          localStorage.removeItem('notificationHistoryClearTime');
                          fetchAllMessages(showHistoryMode);
                        }}
                        className="px-3 py-1.5 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        title={`上次清空时间: ${historyClearTime.toLocaleString()}`}
                      >
                        恢复全部
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 消息列表 */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  加载中...
                </div>
              ) : (systemMessages.length === 0 && chatMessages.length === 0 && adminMessages.length === 0 && friendRequests.length === 0) ? (
                <div className="p-4 text-center text-gray-500">
                  暂无未读消息
                </div>
              ) : (
                <>
                  {/* 好友申请 */}
                  {friendRequests.map((request) => (
                    <div
                      key={`friend-${request.id}`}
                      className="p-4 border-b border-gray-100/50 hover:bg-orange-50/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setShowMessages(false);
                        window.location.href = '/messages#friend-requests';
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 leading-tight">
                                好友申请
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                {request.user.nickname || request.user.name} 向你发送了好友申请
                              </p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 ml-2 flex-shrink-0">
                              好友申请
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-xs text-gray-400">
                              {new Date(request.createdAt).toLocaleString('zh-CN')}
                            </p>
                            <span className="text-xs text-blue-600 hover:text-blue-800">
                              点击处理
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 管理员消息 */}
                  {adminMessages.map((message) => (
                    <div
                      key={`admin-${message.id}`}
                      className="p-4 border-b border-gray-100/50 hover:bg-red-50/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setShowMessages(false);
                        window.location.href = '/admin#messages';
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            message.type === 'deepseek_quota_limit' 
                              ? 'bg-purple-100' 
                              : message.type === 'weather_api_limit'
                              ? 'bg-sky-100'
                              : 'bg-orange-100'
                          }`}>
                            <svg className={`w-3.5 h-3.5 ${
                              message.type === 'deepseek_quota_limit' 
                                ? 'text-purple-600' 
                                : message.type === 'weather_api_limit'
                                ? 'text-sky-600'
                                : 'text-orange-600'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 leading-tight">
                                {message.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">
                                {message.content}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-md ml-2 flex-shrink-0 ${
                              message.type === 'deepseek_quota_limit' 
                                ? 'bg-purple-100 text-purple-700'
                                : message.type === 'weather_api_limit'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {message.type === 'deepseek_quota_limit' ? 'AI配额' : 
                               message.type === 'weather_api_limit' ? '天气配额' : '系统'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-xs text-gray-400">
                              {new Date(message.createdAt).toLocaleString('zh-CN')}
                            </p>
                            <div className="flex items-center space-x-2">
                              {!message.isProcessed && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                                  待处理
                                </span>
                              )}
                              <span className="text-xs text-blue-600 hover:text-blue-800">
                                点击查看
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 系统消息 */}
                  {systemMessages.map((message) => (
                    <div
                      key={`system-${message.id}`}
                      className="p-4 border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            message.type === 'comment_pinned' || message.type === 'post_pinned'
                              ? 'bg-yellow-100'
                              : message.type === 'comment_deleted' || message.type === 'post_deleted'
                              ? 'bg-red-100'
                              : message.type === 'report_submitted'
                              ? 'bg-orange-100'
                              : message.type === 'report_resolved' || message.type === 'report_dismissed' || message.type === 'post_deleted_violation'
                              ? 'bg-gray-100'
                              : 'bg-blue-100'
                          }`}>
                            {message.type === 'comment_pinned' || message.type === 'post_pinned' ? (
                              <svg className="w-3.5 h-3.5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ) : message.type === 'comment_deleted' || message.type === 'post_deleted' ? (
                              <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            ) : message.type === 'report_submitted' ? (
                              <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            ) : message.type === 'report_resolved' || message.type === 'report_dismissed' || message.type === 'post_deleted_violation' ? (
                              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 leading-tight">
                                {message.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                {message.content}
                              </p>
                              {message.sender && (
                                <p className="text-xs text-gray-500 mt-1">
                                  来自: {message.sender.nickname || message.sender.name}
                                  {message.sender.accountType === 'teacher' && ' (老师)'}
                                  {message.sender.accountType === 'admin' && ' (管理员)'}
                                </p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-md ml-2 flex-shrink-0 ${
                              message.type === 'comment_pinned' || message.type === 'post_pinned'
                                ? 'bg-yellow-100 text-yellow-700'
                                : message.type === 'comment_deleted' || message.type === 'post_deleted'
                                ? 'bg-red-100 text-red-700'
                                : message.type === 'report_submitted'
                                ? 'bg-orange-100 text-orange-700'
                                : message.type === 'report_resolved' || message.type === 'report_dismissed' || message.type === 'post_deleted_violation'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {message.type === 'comment_pinned' || message.type === 'post_pinned'
                                ? '精选'
                                : message.type === 'comment_deleted' || message.type === 'post_deleted'
                                ? '删除'
                                : message.type === 'report_submitted'
                                ? '举报'
                                : message.type === 'report_resolved'
                                ? '已处理'
                                : message.type === 'report_dismissed'
                                ? '已驳回'
                                : message.type === 'post_deleted_violation'
                                ? '违规删除'
                                : '系统'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-xs text-gray-400">
                              {new Date(message.createdAt).toLocaleString('zh-CN')}
                            </p>
                            <div className="flex space-x-2">
                              {getActionButton(message)}
                              <button
                                onClick={() => markSystemMessageAsRead(message.id, message.source)}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                              >
                                忽略
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 聊天消息 */}
                  {chatMessages.map((message) => (
                    <div
                      key={`chat-${message.id}`}
                      className="p-4 border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 leading-tight">
                                {message.senderName}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">
                                {message.content}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 ml-2 flex-shrink-0">
                              消息
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-xs text-gray-400">
                              {new Date(message.createdAt).toLocaleString('zh-CN')}
                            </p>
                            <Link
                              href={`/messages?room=${message.roomId}`}
                              className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-full hover:bg-blue-600 transition-colors font-medium"
                              onClick={() => {
                                markChatMessageAsRead(message.id, message.roomId);
                                setShowMessages(false);
                              }}
                            >
                              查看
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
