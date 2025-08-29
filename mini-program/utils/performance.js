// 性能优化工具
// 性能监控、缓存管理、请求优化

class PerformanceManager {
  constructor() {
    this.cache = new Map();
    this.requestQueue = new Map();
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
  }

  // 缓存管理
  setCache(key, data, ttl = 5 * 60 * 1000) { // 默认5分钟缓存
    const expires = Date.now() + ttl;
    this.cache.set(key, {
      data,
      expires
    });
    
    // 自动清理过期缓存
    setTimeout(() => {
      this.cache.delete(key);
    }, ttl);
  }

  getCache(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.metrics.cacheMisses++;
      return null;
    }
    
    if (cached.expires < Date.now()) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }
    
    this.metrics.cacheHits++;
    return cached.data;
  }

  clearCache(pattern) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    // 按模式清理缓存
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // 请求去重
  async dedupeRequest(key, requestFn) {
    // 如果有相同请求正在进行，等待结果
    if (this.requestQueue.has(key)) {
      return await this.requestQueue.get(key);
    }
    
    // 创建新请求
    const promise = requestFn();
    this.requestQueue.set(key, promise);
    
    try {
      const result = await promise;
      this.requestQueue.delete(key);
      return result;
    } catch (error) {
      this.requestQueue.delete(key);
      throw error;
    }
  }

  // 函数防抖
  debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // 函数节流
  throttle(func, delay = 300) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  }

  // 图片懒加载优化
  lazyLoadImage(src, fallback = '/assets/default/placeholder.png') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(fallback);
      img.src = src;
    });
  }

  // 内存使用监控
  checkMemoryUsage() {
    try {
      const performanceInfo = wx.getPerformance();
      if (performanceInfo && performanceInfo.usedJSHeapSize) {
        return {
          used: performanceInfo.usedJSHeapSize,
          total: performanceInfo.totalJSHeapSize,
          usage: (performanceInfo.usedJSHeapSize / performanceInfo.totalJSHeapSize) * 100
        };
      }
    } catch (error) {
      console.log('内存监控不可用');
    }
    return null;
  }

  // 性能指标报告
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      activeRequests: this.requestQueue.size,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100 || 0
    };
  }

  // 清理和重置
  cleanup() {
    this.cache.clear();
    this.requestQueue.clear();
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
  }
}

// 错误处理管理器
class ErrorManager {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 50;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    };
  }

  // 统一错误处理
  handleError(error, context = '', options = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message || error,
      stack: error.stack,
      context,
      userAgent: getApp().globalData.systemInfo?.system,
      url: getCurrentPages().pop()?.route
    };

    // 记录错误日志
    this.logError(errorInfo);

    // 根据错误类型决定处理方式
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error, context, options);
    }
    
    if (this.isAuthError(error)) {
      return this.handleAuthError(error, context);
    }

    // 默认错误处理
    const message = this.getFriendlyMessage(error);
    
    if (!options.silent) {
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
    }

    return { success: false, error: errorInfo };
  }

  // 网络错误处理
  async handleNetworkError(error, context, options = {}) {
    const { enableRetry = true, maxRetries = this.retryConfig.maxRetries } = options;
    
    if (enableRetry && options.retryFn) {
      return await this.retryWithBackoff(options.retryFn, maxRetries);
    }

    wx.showModal({
      title: '网络错误',
      content: '网络连接出现问题，请检查网络设置后重试。',
      showCancel: true,
      confirmText: '重试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && options.retryFn) {
          options.retryFn();
        }
      }
    });

    return { success: false, error, retry: !!options.retryFn };
  }

  // 认证错误处理
  handleAuthError(error, context) {
    // 清除本地认证信息
    getApp().clearUserData();
    
    wx.showModal({
      title: '登录过期',
      content: '您的登录状态已过期，请重新登录。',
      showCancel: false,
      confirmText: '重新登录',
      success: () => {
        wx.navigateTo({ url: '/pages/auth/login' });
      }
    });

    return { success: false, error, needReauth: true };
  }

  // 指数退避重试
  async retryWithBackoff(fn, maxRetries = 3, currentRetry = 1) {
    try {
      return await fn();
    } catch (error) {
      if (currentRetry >= maxRetries) {
        throw error;
      }

      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, currentRetry - 1),
        this.retryConfig.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithBackoff(fn, maxRetries, currentRetry + 1);
    }
  }

  // 错误类型判断
  isNetworkError(error) {
    const networkErrors = [
      'NetworkError',
      'request:fail',
      'timeout',
      'abort',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];

    const message = error.message || error.errMsg || '';
    return networkErrors.some(type => message.includes(type));
  }

  isAuthError(error) {
    const authErrors = [401, 403, 'Unauthorized', 'Forbidden'];
    
    if (error.statusCode && authErrors.includes(error.statusCode)) {
      return true;
    }
    
    const message = error.message || error.errMsg || '';
    return authErrors.some(type => message.includes(type));
  }

  // 友好的错误消息
  getFriendlyMessage(error) {
    const errorMap = {
      'NetworkError': '网络连接失败',
      'request:fail': '请求失败，请检查网络',
      'timeout': '请求超时，请重试',
      'abort': '请求已取消',
      'Unauthorized': '登录已过期',
      'Forbidden': '没有访问权限',
      '404': '请求的资源不存在',
      '500': '服务器内部错误'
    };

    const message = error.message || error.errMsg || '';
    
    for (const [key, value] of Object.entries(errorMap)) {
      if (message.includes(key)) {
        return value;
      }
    }

    return '操作失败，请重试';
  }

  // 记录错误日志
  logError(errorInfo) {
    this.errorLog.unshift(errorInfo);
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.splice(this.maxLogSize);
    }

    // 持久化关键错误
    try {
      const criticalErrors = wx.getStorageSync('critical_errors') || [];
      if (this.isCriticalError(errorInfo)) {
        criticalErrors.unshift(errorInfo);
        if (criticalErrors.length > 10) {
          criticalErrors.splice(10);
        }
        wx.setStorageSync('critical_errors', criticalErrors);
      }
    } catch (e) {
      console.error('保存错误日志失败:', e);
    }
  }

  // 判断关键错误
  isCriticalError(errorInfo) {
    const criticalPatterns = [
      'crash',
      'Cannot read property',
      'undefined is not a function',
      'Maximum call stack'
    ];

    return criticalPatterns.some(pattern => 
      errorInfo.message.includes(pattern) || 
      (errorInfo.stack && errorInfo.stack.includes(pattern))
    );
  }

  // 获取错误报告
  getErrorReport() {
    return {
      recentErrors: this.errorLog.slice(0, 10),
      criticalErrors: wx.getStorageSync('critical_errors') || [],
      errorCount: this.errorLog.length,
      lastError: this.errorLog[0] || null
    };
  }

  // 清理错误日志
  clearErrorLog() {
    this.errorLog = [];
    wx.removeStorageSync('critical_errors');
  }
}

// 创建全局实例
const performance = new PerformanceManager();
const errorManager = new ErrorManager();

// 导出
module.exports = {
  performance,
  errorManager,
  PerformanceManager,
  ErrorManager
};
