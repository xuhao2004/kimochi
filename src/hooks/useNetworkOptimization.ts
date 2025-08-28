import { useEffect, useState } from 'react';

interface NetworkInfo {
  isOnline: boolean;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface OptimizationConfig {
  baseInterval: number;
  slowNetworkMultiplier: number;
  fastNetworkMultiplier: number;
  offlineRetryInterval: number;
  maxRetries: number;
}

/**
 * 网络状态优化Hook - 苹果风格智能网络适配
 * 根据网络条件自动调整请求频率和重试策略
 */
export function useNetworkOptimization(config: OptimizationConfig) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: navigator.onLine
  });
  
  const [optimizedInterval, setOptimizedInterval] = useState(config.baseInterval);
  const [retryCount, setRetryCount] = useState(0);
  const [backoffDelay, setBackoffDelay] = useState(config.baseInterval);

  // 检测网络状态
  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      const info: NetworkInfo = {
        isOnline: navigator.onLine
      };

      if (connection) {
        info.effectiveType = connection.effectiveType;
        info.downlink = connection.downlink;
        info.rtt = connection.rtt;
        info.saveData = connection.saveData;
      }

      setNetworkInfo(info);
      
      // 根据网络状况调整间隔
      calculateOptimizedInterval(info);
    };

    // 初始检测
    updateNetworkInfo();

    // 监听网络状态变化
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);
    
    // 监听连接信息变化
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  // 计算优化后的间隔
  const calculateOptimizedInterval = (network: NetworkInfo) => {
    if (!network.isOnline) {
      setOptimizedInterval(config.offlineRetryInterval);
      return;
    }

    let multiplier = 1;

    // 根据网络类型调整
    if (network.effectiveType) {
      switch (network.effectiveType) {
        case 'slow-2g':
        case '2g':
          multiplier = config.slowNetworkMultiplier;
          break;
        case '3g':
          multiplier = 1.5;
          break;
        case '4g':
          multiplier = config.fastNetworkMultiplier;
          break;
      }
    }

    // 根据RTT调整（如果可用）
    if (network.rtt) {
      if (network.rtt > 2000) { // 高延迟
        multiplier *= 2;
      } else if (network.rtt < 100) { // 低延迟
        multiplier *= 0.8;
      }
    }

    // 考虑省流量模式
    if (network.saveData) {
      multiplier *= 2;
    }

    setOptimizedInterval(Math.round(config.baseInterval * multiplier));
  };

  // 指数退避算法
  const exponentialBackoff = (attempt: number): number => {
    const delay = Math.min(
      config.baseInterval * Math.pow(2, attempt),
      5 * 60 * 1000 // 最大5分钟
    );
    
    // 添加随机抖动，避免惊群效应
    const jitter = delay * 0.1 * Math.random();
    return delay + jitter;
  };

  // 请求失败处理
  const handleRequestFailure = () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    if (newRetryCount <= config.maxRetries) {
      const delay = exponentialBackoff(newRetryCount);
      setBackoffDelay(delay);
      
      console.log(`📶 网络请求失败，${delay/1000}秒后重试 (${newRetryCount}/${config.maxRetries})`);
      return delay;
    } else {
      console.log('❌ 达到最大重试次数，停止重试');
      return null;
    }
  };

  // 请求成功处理
  const handleRequestSuccess = () => {
    setRetryCount(0);
    setBackoffDelay(config.baseInterval);
  };

  // 获取当前应该使用的间隔
  const getCurrentInterval = (): number => {
    if (retryCount > 0) {
      return backoffDelay;
    }
    return optimizedInterval;
  };

  // 判断是否应该跳过请求
  const shouldSkipRequest = (): boolean => {
    // 离线时跳过
    if (!networkInfo.isOnline) {
      return true;
    }
    
    // 省流量模式下，降低请求频率
    if (networkInfo.saveData && Math.random() > 0.7) {
      return true;
    }

    // 慢网络时，随机跳过一些请求
    if (networkInfo.effectiveType === 'slow-2g' && Math.random() > 0.5) {
      return true;
    }

    return false;
  };

  return {
    networkInfo,
    optimizedInterval,
    currentInterval: getCurrentInterval(),
    retryCount,
    backoffDelay,
    
    // 方法
    handleRequestFailure,
    handleRequestSuccess,
    shouldSkipRequest,
    
    // 网络质量评估
    networkQuality: !networkInfo.isOnline ? 'offline' :
                   networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g' ? 'poor' :
                   networkInfo.effectiveType === '3g' ? 'fair' :
                   'good',
    
    // 是否为省流量模式
    isDataSaverMode: networkInfo.saveData || false
  };
}

/**
 * 网络感知的智能轮询Hook
 */
export function useNetworkAwarePolling(
  callback: () => Promise<void> | void,
  baseInterval: number = 30000
) {
  const [isExecuting, setIsExecuting] = useState(false);
  
  const networkOpt = useNetworkOptimization({
    baseInterval,
    slowNetworkMultiplier: 3,
    fastNetworkMultiplier: 0.8,
    offlineRetryInterval: 60000, // 离线时60秒重试
    maxRetries: 5
  });

  // 执行请求的包装函数
  const executeRequest = async () => {
    if (isExecuting || networkOpt.shouldSkipRequest()) {
      return;
    }

    setIsExecuting(true);
    try {
      await callback();
      networkOpt.handleRequestSuccess();
    } catch (error) {
      console.error('🚫 网络请求失败:', error);
      networkOpt.handleRequestFailure();
    } finally {
      setIsExecuting(false);
    }
  };

  // 返回当前网络优化状态和执行函数
  return {
    ...networkOpt,
    executeRequest,
    isExecuting,
    
    // 状态摘要（用于调试）
    statusSummary: {
      network: networkOpt.networkQuality,
      interval: `${Math.round(networkOpt.currentInterval / 1000)}s`,
      retries: networkOpt.retryCount,
      dataSaver: networkOpt.isDataSaverMode,
      executing: isExecuting
    }
  };
}
