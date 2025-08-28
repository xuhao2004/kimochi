import { useEffect, useRef, useState } from 'react';
import { usePageVisibility } from './usePageVisibility';

interface WebSocketMessage {
  type: 'notification' | 'chat' | 'friend_request' | 'heartbeat';
  data?: any;
  timestamp?: number;
}

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableInBackground?: boolean;
}

/**
 * WebSocket Hook - 苹果风格实时通信优化
 * 提供智能重连、心跳检测、后台优化等功能
 */
export function useWebSocket(
  url: string,
  token: string | null,
  options: WebSocketOptions = {}
) {
  const {
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    enableInBackground = false
  } = options;

  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isVisible = usePageVisibility();
  
  // 消息处理回调
  const onMessageRef = useRef<((message: WebSocketMessage) => void) | null>(null);
  const onConnectionChangeRef = useRef<((state: typeof connectionState) => void) | null>(null);

  // 清理定时器
  const clearTimers = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  // 发送心跳
  const sendHeartbeat = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'heartbeat', 
        timestamp: Date.now() 
      }));
    }
  };

  // 启动心跳
  const startHeartbeat = () => {
    clearTimers();
    heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval);
  };

  // 连接WebSocket
  const connect = () => {
    if (!token || (!isVisible && !enableInBackground)) {
      return;
    }

    try {
      setConnectionState('connecting');
      
      const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 WebSocket 连接已建立');
        setConnectionState('connected');
        setReconnectAttempts(0);
        startHeartbeat();
        onConnectionChangeRef.current?.('connected');
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // 忽略心跳响应
          if (message.type === 'heartbeat') {
            return;
          }
          
          setLastMessage(message);
          onMessageRef.current?.(message);
        } catch (error) {
          console.error('❌ WebSocket 消息解析失败:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket 连接已关闭:', event.code, event.reason);
        setConnectionState('disconnected');
        clearTimers();
        onConnectionChangeRef.current?.('disconnected');
        
        // 尝试重连
        if (reconnectAttempts < maxReconnectAttempts && token) {
          const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttempts), 60000);
          console.log(`🔄 ${delay/1000}秒后尝试重连 (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimerRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket 错误:', error);
        setConnectionState('error');
        onConnectionChangeRef.current?.('error');
      };

    } catch (error) {
      console.error('❌ WebSocket 连接失败:', error);
      setConnectionState('error');
    }
  };

  // 断开连接
  const disconnect = () => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
  };

  // 发送消息
  const sendMessage = (message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
      return true;
    }
    return false;
  };

  // 页面可见性变化时的处理
  useEffect(() => {
    if (isVisible && connectionState === 'disconnected' && token) {
      connect();
    } else if (!isVisible && !enableInBackground && connectionState === 'connected') {
      disconnect();
    }
  }, [isVisible, token, enableInBackground]);

  // 初始连接
  useEffect(() => {
    if (token && (isVisible || enableInBackground)) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token]);

  // 清理
  useEffect(() => {
    return () => {
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connectionState,
    lastMessage,
    reconnectAttempts,
    isConnected: connectionState === 'connected',
    
    // 方法
    connect,
    disconnect,
    sendMessage,
    
    // 事件处理器设置
    setOnMessage: (callback: (message: WebSocketMessage) => void) => {
      onMessageRef.current = callback;
    },
    setOnConnectionChange: (callback: (state: typeof connectionState) => void) => {
      onConnectionChangeRef.current = callback;
    }
  };
}

/**
 * 简化的WebSocket Hook - 专门用于通知
 */
export function useNotificationWebSocket(token: string | null) {
  // 构建WebSocket URL（根据当前协议选择ws或wss）
  const wsUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/notifications`
    : '';

  const ws = useWebSocket(wsUrl, token, {
    reconnectInterval: 3000,
    maxReconnectAttempts: 15,
    heartbeatInterval: 25000,
    enableInBackground: false // 后台不保持连接以节省资源
  });

  return {
    ...ws,
    // 专门的通知消息处理
    onNotification: (callback: (notification: any) => void) => {
      ws.setOnMessage((message) => {
        if (message.type === 'notification') {
          callback(message.data);
        }
      });
    },
    
    // 专门的聊天消息处理
    onChatMessage: (callback: (chatMessage: any) => void) => {
      ws.setOnMessage((message) => {
        if (message.type === 'chat') {
          callback(message.data);
        }
      });
    },
    
    // 专门的好友请求处理
    onFriendRequest: (callback: (request: any) => void) => {
      ws.setOnMessage((message) => {
        if (message.type === 'friend_request') {
          callback(message.data);
        }
      });
    }
  };
}
