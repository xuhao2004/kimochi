import { useState, useEffect, useRef } from 'react';

/**
 * 页面可见性检测Hook - 苹果风格优化
 * 当页面不可见时暂停轮询，减少资源消耗
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document !== 'undefined') {
      return !document.hidden;
    }
    return true;
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    // 使用 Page Visibility API
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 兼容旧版浏览器的事件
    window.addEventListener('focus', () => setIsVisible(true));
    window.addEventListener('blur', () => setIsVisible(false));

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => setIsVisible(true));
      window.removeEventListener('blur', () => setIsVisible(false));
    };
  }, []);

  return isVisible;
}

/**
 * 智能轮询Hook - 苹果风格智能优化
 * 基于页面可见性和用户活跃度调整轮询频率
 */
export function useSmartPolling(
  callback: () => void,
  baseInterval: number = 30000, // 基础间隔30秒
  options: {
    minInterval?: number; // 最小间隔
    maxInterval?: number; // 最大间隔
    exponentialBackoff?: boolean; // 是否使用指数退避
    pauseWhenHidden?: boolean; // 页面不可见时是否暂停
  } = {}
) {
  const {
    minInterval = 5000,
    maxInterval = 300000, // 5分钟
    exponentialBackoff = true,
    pauseWhenHidden = true
  } = options;

  const isVisible = usePageVisibility();
  const [currentInterval, setCurrentInterval] = useState(baseInterval);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isActive, setIsActive] = useState(true);
  
  // 使用useRef保存callback，避免循环依赖
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 检测用户活跃度
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      setLastActivity(Date.now());
      setIsActive(true);
      setCurrentInterval(baseInterval); // 恢复基础间隔
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // 检查用户是否长时间无活动（5分钟）
    const inactivityTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity > 5 * 60 * 1000) { // 5分钟无活动
        setIsActive(false);
        if (exponentialBackoff) {
          setCurrentInterval(prev => Math.min(prev * 1.5, maxInterval));
        }
      }
    }, 60000); // 每分钟检查一次

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityTimer);
    };
  }, [baseInterval, exponentialBackoff, lastActivity, maxInterval]);

  // 智能轮询逻辑
  useEffect(() => {
    // 如果设置了暂停且页面不可见，则不启动轮询
    if (pauseWhenHidden && !isVisible) {
      return;
    }

    // 根据用户活跃度调整间隔
    const adjustedInterval = isActive ? currentInterval : Math.min(currentInterval * 2, maxInterval);
    
    const interval = setInterval(() => {
      callbackRef.current();
    }, adjustedInterval);

    return () => clearInterval(interval);
  }, [currentInterval, isVisible, isActive, pauseWhenHidden, maxInterval]); // 移除callback依赖，避免无限循环

  // 页面重新可见时立即执行一次回调
  useEffect(() => {
    if (isVisible && pauseWhenHidden) {
      callbackRef.current();
    }
  }, [isVisible, pauseWhenHidden]);

  return {
    isVisible,
    isActive,
    currentInterval: isActive ? currentInterval : Math.min(currentInterval * 2, maxInterval)
  };
}
