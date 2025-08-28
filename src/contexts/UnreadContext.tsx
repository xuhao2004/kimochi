'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useUnifiedNotification } from './UnifiedNotificationContext';

interface UnreadContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: (force?: boolean) => void;
}

const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

export const UnreadProvider = ({ children }: { children: ReactNode }) => {
  // 使用统一通知数据管理，避免重复请求
  const {
    totalUnreadCount,
    refreshNotifications
  } = useUnifiedNotification();

  // 兼容旧的接口
  const refreshUnreadCount = (force: boolean = false) => {
    return refreshNotifications(force);
  };

  const setUnreadCount = () => {
    // 空实现，因为数据现在由统一管理控制
    console.warn('setUnreadCount 已废弃，请使用统一通知数据管理');
  };

  return (
    <UnreadContext.Provider value={{ 
      unreadCount: totalUnreadCount, 
      setUnreadCount, 
      refreshUnreadCount 
    }}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnread = () => {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error('useUnread must be used within an UnreadProvider');
  }
  return context;
};
