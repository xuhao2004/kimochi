import { useEffect, useState } from 'react';
import { useSmartPolling } from './usePageVisibility';
import { useNotificationWebSocket } from './useWebSocket';

interface HybridPollingOptions {
  pollingInterval?: number;
  minPollingInterval?: number;
  maxPollingInterval?: number;
  enableWebSocket?: boolean;
  fallbackToPolling?: boolean;
}

/**
 * 混合轮询Hook - WebSocket + 智能轮询
 * 优先使用WebSocket，失败时回退到智能轮询
 */
export function useHybridPolling(
  pollingCallback: () => void,
  token: string | null,
  options: HybridPollingOptions = {}
) {
  const {
    pollingInterval = 30000,
    minPollingInterval = 10000,
    maxPollingInterval = 300000,
    enableWebSocket = true,
    fallbackToPolling = true
  } = options;

  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  
  // WebSocket连接
  const webSocket = useNotificationWebSocket(enableWebSocket ? token : null);
  
  // 智能轮询 - 仅在WebSocket不可用时启用
  const shouldUsePolling = !enableWebSocket || 
    (fallbackToPolling && !webSocket.isConnected);

  const { isVisible, isActive, currentInterval } = useSmartPolling(
    pollingCallback,
    pollingInterval,
    {
      minInterval: minPollingInterval,
      maxInterval: maxPollingInterval,
      exponentialBackoff: true,
      pauseWhenHidden: true
    }
  );

  // 禁用轮询如果WebSocket可用
  useEffect(() => {
    if (webSocket.isConnected && enableWebSocket) {
      // WebSocket已连接，停止轮询
      console.log('🔗 WebSocket已连接，停用轮询');
    }
  }, [webSocket.isConnected, enableWebSocket]);

  // WebSocket消息处理
  useEffect(() => {
    if (!enableWebSocket) return;

    // 处理各种类型的实时消息
    webSocket.onNotification((notification) => {
      console.log('📨 收到WebSocket通知:', notification);
      setLastUpdateTime(Date.now());
      pollingCallback(); // 触发数据更新
    });

    webSocket.onChatMessage((chatMessage) => {
      console.log('💬 收到WebSocket聊天消息:', chatMessage);
      setLastUpdateTime(Date.now());
      pollingCallback(); // 触发数据更新
    });

    webSocket.onFriendRequest((request) => {
      console.log('👤 收到WebSocket好友请求:', request);
      setLastUpdateTime(Date.now());
      pollingCallback(); // 触发数据更新
    });

  }, [enableWebSocket, pollingCallback]);

  // WebSocket连接状态变化处理
  useEffect(() => {
    webSocket.setOnConnectionChange((state) => {
      console.log('🔌 WebSocket状态变化:', state);
      
      if (state === 'connected') {
        // 连接成功时立即获取最新数据
        pollingCallback();
      } else if (state === 'disconnected' && fallbackToPolling) {
        // 断开连接时，如果启用了回退，则立即开始轮询
        console.log('⚠️ WebSocket断开，回退到轮询模式');
        pollingCallback();
      }
    });
  }, [pollingCallback, fallbackToPolling]);

  return {
    // WebSocket状态
    webSocketConnected: webSocket.isConnected,
    webSocketState: webSocket.connectionState,
    webSocketReconnectAttempts: webSocket.reconnectAttempts,
    
    // 轮询状态
    isPollingActive: shouldUsePolling,
    isVisible,
    isActive,
    currentPollingInterval: shouldUsePolling ? currentInterval : null,
    
    // 最后更新时间
    lastUpdateTime,
    
    // 手动触发更新
    forceUpdate: pollingCallback,
    
    // WebSocket控制方法
    connectWebSocket: webSocket.connect,
    disconnectWebSocket: webSocket.disconnect,
    
    // 状态总结
    connectionStatus: webSocket.isConnected ? 'websocket' : 
                    shouldUsePolling ? 'polling' : 'disconnected'
  };
}

/**
 * 专门用于通知中心的混合轮询
 */
export function useNotificationHybridPolling(
  updateCallback: () => void,
  token: string | null
) {
  return useHybridPolling(updateCallback, token, {
    pollingInterval: 30000,
    minPollingInterval: 10000,
    maxPollingInterval: 300000,
    enableWebSocket: true,
    fallbackToPolling: true
  });
}

/**
 * 专门用于聊天的混合轮询 - 更频繁的更新
 */
export function useChatHybridPolling(
  updateCallback: () => void,
  token: string | null
) {
  return useHybridPolling(updateCallback, token, {
    pollingInterval: 15000, // 聊天更频繁
    minPollingInterval: 5000,
    maxPollingInterval: 180000, // 最大3分钟
    enableWebSocket: true,
    fallbackToPolling: true
  });
}
