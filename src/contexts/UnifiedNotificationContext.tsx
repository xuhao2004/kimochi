'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { usePageVisibility } from '@/hooks/usePageVisibility';

// 通知数据类型定义
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

interface NotificationData {
  systemMessages: SystemMessage[];
  chatMessages: ChatMessage[];
  friendRequests: FriendRequest[];
  lastUpdated: number;
  loading: boolean;
}

interface UnifiedNotificationContextType {
  // 数据
  notificationData: NotificationData;
  
  // 计算属性
  totalUnreadCount: number;
  systemUnreadCount: number;
  chatUnreadCount: number;
  friendRequestCount: number;
  
  // 方法
  refreshNotifications: (force?: boolean, dataTypes?: {
    userMessages?: boolean;
    chatUnread?: boolean;
    friendRequests?: boolean;
    adminMessages?: boolean;
  }) => Promise<void>;
  refreshLightweight: () => Promise<void>; // 轻量级刷新，仅获取计数
  markMessageAsRead: (messageId: string, source?: 'user_message' | 'admin_message') => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteMessage: (messageId: string, source?: 'user_message' | 'admin_message') => Promise<void>;
  markAsProcessed: (messageId: string) => Promise<void>;
  
  // 状态
  isRefreshing: boolean;
  lastError: string | null;
}

const UnifiedNotificationContext = createContext<UnifiedNotificationContextType | undefined>(undefined);

export const UnifiedNotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notificationData, setNotificationData] = useState<NotificationData>({
    systemMessages: [],
    chatMessages: [],
    friendRequests: [],
    lastUpdated: 0,
    loading: false
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const isVisible = usePageVisibility();
  
  // 防抖配置
  const MIN_REFRESH_INTERVAL = 3000; // 最小3秒间隔
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 计算属性
  // 排除好友相关类型，避免与 friendRequests 计数重复
  const systemUnreadCount = notificationData.systemMessages.filter(m => 
    !m.isRead && m.type !== 'friend_request' && m.type !== 'friend_request_receipt'
  ).length;
  const chatUnreadCount = notificationData.chatMessages.length;
  const friendRequestCount = notificationData.friendRequests.length;
  const totalUnreadCount = systemUnreadCount + chatUnreadCount + friendRequestCount;

  // 按需数据获取函数 - 可以指定获取哪些类型的数据
  const refreshNotifications = useCallback(async (force: boolean = false, dataTypes?: {
    userMessages?: boolean;
    chatUnread?: boolean;
    friendRequests?: boolean;
    adminMessages?: boolean;
  }) => {
    try {
      const now = Date.now();
      
      // 防抖检查
      if (!force && (now - lastRefreshTime) < MIN_REFRESH_INTERVAL) {
        console.log('🚦 通知刷新防抖跳过，距离上次刷新仅', Math.round((now - lastRefreshTime) / 1000), '秒');
        return;
      }

      // 页面不可见时跳过（除非强制刷新）
      if (!isVisible && !force) {
        console.log('🔍 页面不可见，跳过通知刷新');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ 无token，跳过通知刷新');
        return;
      }

      // 检查用户类型
      const userProfile = localStorage.getItem('userProfile');
      let userType = 'student';
      if (userProfile) {
        try {
          const profile = JSON.parse(userProfile);
          // 优先检查isSuperAdmin，然后是accountType
          if (profile.isSuperAdmin) {
            userType = 'superAdmin';
          } else if (profile.isAdmin || profile.accountType === 'admin') {
            userType = 'admin';
          } else if (profile.accountType === 'teacher') {
            userType = 'teacher';
          } else if (profile.accountType === 'student') {
            userType = 'student';
          } else {
            userType = 'self'; // 普通注册用户
          }
          console.log('🔍 用户类型确定:', { 
            userType, 
            isSuperAdmin: profile.isSuperAdmin, 
            isAdmin: profile.isAdmin, 
            accountType: profile.accountType 
          });
        } catch (e) {
          console.warn('解析用户资料失败:', e);
        }
      }

      // 默认获取所有数据，或按需获取指定数据
      const defaultDataTypes = {
        userMessages: true,
        chatUnread: true,
        friendRequests: true,
        adminMessages: true
      };
      const actualDataTypes = { ...defaultDataTypes, ...dataTypes };

      console.log('🔄 开始统一刷新通知数据', { 
        force, 
        isVisible, 
        userType,
        上次刷新: Math.round((now - lastRefreshTime) / 1000) + '秒前',
        请求数据类型: actualDataTypes
      });

      setIsRefreshing(true);
      setLastRefreshTime(now);
      setLastError(null);

      // 按需并行请求数据
      const requests: Promise<Response>[] = [];
      const requestNames: string[] = [];

      if (actualDataTypes.userMessages) {
        // 为避免与管理员消息重复，这里明确排除管理员消息（admin_message）
        requests.push(fetch('/api/user-messages?includeAdmin=false', {
          headers: { 'Authorization': `Bearer ${token}` }
        }));
        requestNames.push('userMessages');
      }

      if (actualDataTypes.chatUnread) {
        requests.push(fetch('/api/chat/unread', {
          headers: { 'Authorization': `Bearer ${token}` }
        }));
        requestNames.push('chatUnread');
      }

      if (actualDataTypes.friendRequests) {
        requests.push(fetch('/api/chat/friends/requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        }));
        requestNames.push('friendRequests');
      }

      // 管理员用户额外请求管理员消息
      const isAdminUser = userType === 'superAdmin' || userType === 'admin' || userType === 'teacher';
      console.log('🔍 管理员权限检查:', { 
        userType, 
        isAdminUser, 
        needAdminMessages: actualDataTypes.adminMessages,
        原始profile: userProfile ? JSON.parse(userProfile) : null
      });
      if (isAdminUser && actualDataTypes.adminMessages) {
        console.log('✅ 添加管理员消息API请求，用户类型:', userType);
        requests.push(fetch('/api/admin/messages', {
          headers: { 'Authorization': `Bearer ${token}` }
        }));
        requestNames.push('adminMessages');
      } else {
        console.log('❌ 未请求管理员消息:', { isAdminUser, needAdminMessages: actualDataTypes.adminMessages });
      }

      const responses = await Promise.all(requests);

      // 根据请求顺序解析响应
      const responseMap: { [key: string]: Response } = {};
      responses.forEach((response, index) => {
        responseMap[requestNames[index]] = response;
      });

      // 日志记录API响应状态
      const responseStatus: { [key: string]: string } = {};
      requestNames.forEach(name => {
        const response = responseMap[name];
        responseStatus[name] = response ? `${response.status} ${response.statusText}` : '未请求';
      });
      console.log('📊 统一API响应状态:', responseStatus);

      // 安全解析JSON响应
      const parseJsonSafely = async (response: Response, defaultValue: any) => {
        if (!response.ok) {
          console.warn(`⚠️ API响应失败: ${response.status} ${response.statusText}`);
          return defaultValue;
        }
        try {
          const text = await response.text();
          return text ? JSON.parse(text) : defaultValue;
        } catch {
          return defaultValue;
        }
      };

      // 按需解析响应数据
      const systemData = responseMap.userMessages 
        ? await parseJsonSafely(responseMap.userMessages, { messages: [], unreadCount: 0 })
        : { messages: notificationData.systemMessages.filter(m => m.source === 'user_message'), unreadCount: 0 };
      
      const chatData = responseMap.chatUnread 
        ? await parseJsonSafely(responseMap.chatUnread, { latestUnreadMessages: [], totalUnreadCount: 0 })
        : { latestUnreadMessages: notificationData.chatMessages, totalUnreadCount: 0 };
      
      const friendRequestData = responseMap.friendRequests 
        ? await parseJsonSafely(responseMap.friendRequests, { receivedRequests: [] })
        : { receivedRequests: notificationData.friendRequests };
      
      let adminData: { messages: any[], statistics: { unread: number } } = { messages: [], statistics: { unread: 0 } };
      if (responseMap.adminMessages) {
        adminData = await parseJsonSafely(responseMap.adminMessages, { messages: [], statistics: { unread: 0 } });
        console.log('🔍 管理员消息API响应:', { 
          管理员消息数量: adminData.messages.length,
          未读统计: adminData.statistics.unread,
          消息详情: adminData.messages.map(m => ({ id: m.id, title: m.title, type: m.type, isRead: m.isRead }))
        });
      } else {
        // 保留现有的管理员消息
        adminData = { 
          messages: notificationData.systemMessages.filter(m => m.source === 'admin_message'), 
          statistics: { unread: 0 } 
        };
        console.log('⚠️ 无管理员消息API响应，使用现有数据:', { 
          现有管理员消息数量: adminData.messages.length 
        });
      }

      // 合并和去重系统消息（避免不同表ID冲突：使用复合键）
      const messageMap = new Map<string, any>();
      
      // 首先添加用户消息（/api/user-messages 返回的 userMessage）
      (systemData.messages || []).forEach((msg: any) => {
        const key = `user_${msg.id}`;
        if (msg.id && !messageMap.has(key)) {
          messageMap.set(key, {
            ...msg,
            source: 'user_message' as const
          });
        }
      });
      
      // 添加管理员消息（/api/admin/messages 返回的 adminMessage）
      (adminData.messages || []).forEach((msg: any) => {
        const key = `admin_${msg.id}`;
        if (msg.id && !messageMap.has(key)) {
          messageMap.set(key, {
            ...msg,
            source: 'admin_message' as const
          });
        }
      });
      
      const allSystemMessages = Array.from(messageMap.values());
      
      console.log('🔍 最终系统消息合并结果:', {
        总消息数: allSystemMessages.length,
        用户消息数: systemData.messages?.length || 0,
        管理员消息数: adminData.messages?.length || 0,
        未读系统消息数: allSystemMessages.filter(m => !m.isRead).length,
        系统检查相关: allSystemMessages.filter(m => 
          m.title?.includes('系统健康检查') || 
          m.title?.includes('系统检查') || 
          m.type === 'system_error'
        ).map(m => ({ id: m.id, title: m.title, type: m.type, source: m.source, isRead: m.isRead }))
      });

      // 处理聊天消息
      const formattedChatMessages = (chatData.latestUnreadMessages || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        roomId: msg.chatRoom.id,
        roomName: msg.chatRoom.name,
        senderName: msg.sender.nickname || msg.sender.name,
        isRead: false,
        createdAt: msg.createdAt
      }));

      // 更新数据状态（仅在有变化时）
      setNotificationData(prev => {
        const newData = {
          systemMessages: allSystemMessages,
          chatMessages: formattedChatMessages,
          friendRequests: friendRequestData.receivedRequests || [],
          lastUpdated: now,
          loading: false
        };

        // 检查是否有实际变化
        const hasChanges = 
          JSON.stringify(prev.systemMessages) !== JSON.stringify(newData.systemMessages) ||
          JSON.stringify(prev.chatMessages) !== JSON.stringify(newData.chatMessages) ||
          JSON.stringify(prev.friendRequests) !== JSON.stringify(newData.friendRequests);

        if (hasChanges) {
          console.log('✅ 检测到通知数据变化，更新状态');
          return newData;
        } else {
          console.log('ℹ️ 通知数据无变化，保持原状态');
          return { ...prev, lastUpdated: now, loading: false };
        }
      });

      console.log('✅ 统一通知数据刷新完成:', {
        系统消息: allSystemMessages.length,
        系统未读: allSystemMessages.filter(m => !m.isRead).length,
        聊天消息: formattedChatMessages.length,
        好友请求: (friendRequestData.receivedRequests || []).length,
        总未读: allSystemMessages.filter(m => !m.isRead).length + formattedChatMessages.length + (friendRequestData.receivedRequests || []).length
      });

    } catch (error) {
      console.error('❌ 统一通知数据刷新失败:', error);
      setLastError(error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsRefreshing(false);
    }
  }, []); // 移除依赖，避免频繁重新创建函数

  // 轻量级刷新 - 仅获取计数信息，用于小铃铛显示
  const refreshLightweight = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('🔄 轻量级刷新：仅获取计数信息');

      // 并行请求所有计数API（如果有专门的计数接口）
      // 目前复用现有接口，但优先使用cached数据
      const now = Date.now();
      if ((now - lastRefreshTime) < 10000) { // 10秒内有数据，直接使用缓存
        console.log('📈 使用缓存数据，跳过轻量级请求');
        return;
      }

      // 仅请求必要的计数数据
      await refreshNotifications(false, {
        userMessages: true,
        chatUnread: true,  
        friendRequests: true,
        adminMessages: false // 轻量级刷新时跳过管理员消息
      });
    } catch (error) {
      console.error('❌ 轻量级刷新失败:', error);
    }
  }, [lastRefreshTime, refreshNotifications]);

  // 标记消息已读
  const markMessageAsRead = useCallback(async (messageId: string, source?: 'user_message' | 'admin_message') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('🔄 标记消息已读:', { messageId, source });

      const promises = [
        fetch('/api/user-messages', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            messageIds: [messageId],
            messageType: source
          })
        })
      ];

      // 如果是管理员消息，同时调用管理员API
      if (source === 'admin_message') {
        promises.push(
          fetch('/api/admin/messages', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              messageIds: [messageId],
              messageType: source
            })
          })
        );
      }

      await Promise.all(promises);

      // 立即更新本地状态
      setNotificationData(prev => ({
        ...prev,
        systemMessages: prev.systemMessages.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      }));

      console.log('✅ 消息已读状态更新完成');

    } catch (error) {
      console.error('❌ 标记消息已读失败:', error);
      throw error;
    }
  }, []);

  // 全部标记已读
  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('🔄 标记全部消息已读');

      const promises = [
        fetch('/api/user-messages', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ markAllAsRead: true })
        })
      ];

      // 检查是否有管理员权限
      const userProfile = localStorage.getItem('userProfile');
      if (userProfile) {
        try {
          const profile = JSON.parse(userProfile);
          const userType = profile.accountType || 'student';
          if (userType === 'superAdmin' || userType === 'admin' || userType === 'teacher') {
            promises.push(
              fetch('/api/admin/messages', {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ markAllAsRead: true })
              })
            );
          }
        } catch (e) {
          console.warn('解析用户资料失败:', e);
        }
      }

      await Promise.all(promises);

      // 立即更新本地状态
      setNotificationData(prev => ({
        ...prev,
        systemMessages: prev.systemMessages.map(msg => ({ ...msg, isRead: true }))
      }));

      console.log('✅ 全部消息已读状态更新完成');

    } catch (error) {
      console.error('❌ 标记全部消息已读失败:', error);
      throw error;
    }
  }, []);

  // 删除消息
  const deleteMessage = useCallback(async (messageId: string, source?: 'user_message' | 'admin_message') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('🔄 删除消息:', { messageId, source });

      const endpoint = source === 'admin_message' ? '/api/admin/messages' : '/api/user-messages';
      
      await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageIds: [messageId] })
      });

      // 立即更新本地状态
      setNotificationData(prev => ({
        ...prev,
        systemMessages: prev.systemMessages.filter(msg => msg.id !== messageId)
      }));

      console.log('✅ 消息删除完成');

    } catch (error) {
      console.error('❌ 删除消息失败:', error);
      throw error;
    }
  }, []);

  // 标记已处理
  const markAsProcessed = useCallback(async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('🔄 标记消息已处理:', messageId);

      await Promise.all([
        fetch('/api/admin/messages', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messageIds: [messageId] })
        }),
        fetch('/api/admin/messages', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messageIds: [messageId] })
        })
      ]);

      // 立即更新本地状态
      setNotificationData(prev => ({
        ...prev,
        systemMessages: prev.systemMessages.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true, isProcessed: true } : msg
        )
      }));

      console.log('✅ 消息已处理状态更新完成');

    } catch (error) {
      console.error('❌ 标记消息已处理失败:', error);
      throw error;
    }
  }, []);

  // 页面重新可见时刷新数据
  useEffect(() => {
    if (isVisible) {
      console.log('📱 页面变为可见，刷新通知数据');
      refreshNotificationsRef.current(true); // 强制刷新
    }
  }, [isVisible]); // 只依赖isVisible

  // 使用useRef存储函数引用，避免依赖变化
  const refreshNotificationsRef = useRef(refreshNotifications);
  refreshNotificationsRef.current = refreshNotifications;

  // 初始化时获取数据
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 延迟执行，确保ref已经设置
      setTimeout(() => {
        refreshNotificationsRef.current(true); // 初始化时强制刷新
      }, 100);
    }
  }, []); // 只在组件挂载时执行一次

  // 定期刷新（但频率很低，主要依赖事件驱动）
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 降低轮询频率，减少服务器负载
    const interval = setInterval(() => {
      // 使用ref获取最新的函数，避免闭包问题
      refreshNotificationsRef.current(false); // 非强制刷新，会受防抖控制
    }, 300000); // 5分钟轮询一次作为备份，进一步降低频率

    return () => clearInterval(interval);
  }, []); // 移除所有依赖，避免重复设置定时器

  // 清除防抖定时器
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const value: UnifiedNotificationContextType = {
    notificationData,
    totalUnreadCount,
    systemUnreadCount,
    chatUnreadCount,
    friendRequestCount,
    refreshNotifications,
    refreshLightweight,
    markMessageAsRead,
    markAllAsRead,
    deleteMessage,
    markAsProcessed,
    isRefreshing,
    lastError
  };

  return (
    <UnifiedNotificationContext.Provider value={value}>
      {children}
    </UnifiedNotificationContext.Provider>
  );
};

export const useUnifiedNotification = () => {
  const context = useContext(UnifiedNotificationContext);
  if (!context) {
    throw new Error('useUnifiedNotification must be used within an UnifiedNotificationProvider');
  }
  return context;
};
