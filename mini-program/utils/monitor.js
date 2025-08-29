// 全局监控和分析工具
const { performance, errorManager } = require('./performance');

class GlobalMonitor {
  constructor() {
    this.pageLoadTimes = new Map();
    this.userActions = [];
    this.performanceReports = [];
    this.isMonitoring = false;
  }

  // 开始监控
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 全局性能监控已启动');
    
    // 监控页面加载性能
    this.monitorPagePerformance();
    
    // 监控内存使用
    this.monitorMemoryUsage();
    
    // 监控用户行为
    this.monitorUserActions();
  }

  // 停止监控
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🛑 全局性能监控已停止');
  }

  // 页面性能监控
  monitorPagePerformance() {
    const originalPage = Page;
    
    Page = (options) => {
      const originalOnLoad = options.onLoad || (() => {});
      const originalOnShow = options.onShow || (() => {});
      const originalOnReady = options.onReady || (() => {});
      
      // 重写onLoad
      options.onLoad = function(...args) {
        const startTime = Date.now();
        this._pageStartTime = startTime;
        
        // 调用原始onLoad
        const result = originalOnLoad.call(this, ...args);
        
        // 记录加载时间
        const loadTime = Date.now() - startTime;
        const pagePath = getCurrentPages().pop()?.route || 'unknown';
        
        globalMonitor.recordPageLoad(pagePath, loadTime);
        
        return result;
      };
      
      // 重写onReady
      options.onReady = function(...args) {
        if (this._pageStartTime) {
          const readyTime = Date.now() - this._pageStartTime;
          const pagePath = getCurrentPages().pop()?.route || 'unknown';
          
          globalMonitor.recordPageReady(pagePath, readyTime);
        }
        
        return originalOnReady.call(this, ...args);
      };
      
      return originalPage(options);
    };
  }

  // 记录页面加载时间
  recordPageLoad(pagePath, loadTime) {
    if (!this.pageLoadTimes.has(pagePath)) {
      this.pageLoadTimes.set(pagePath, []);
    }
    
    this.pageLoadTimes.get(pagePath).push({
      loadTime,
      timestamp: Date.now()
    });
    
    console.log(`📊 页面加载: ${pagePath} - ${loadTime}ms`);
  }

  // 记录页面就绪时间
  recordPageReady(pagePath, readyTime) {
    console.log(`✅ 页面就绪: ${pagePath} - ${readyTime}ms`);
  }

  // 监控内存使用
  monitorMemoryUsage() {
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      const memoryInfo = performance.checkMemoryUsage();
      if (memoryInfo && memoryInfo.usage > 80) {
        console.warn(`⚠️ 内存使用过高: ${memoryInfo.usage.toFixed(1)}%`);
        
        // 自动清理缓存
        performance.clearCache();
        
        wx.showToast({
          title: '已优化内存使用',
          icon: 'none',
          duration: 1500
        });
      }
    }, 30000); // 每30秒检查一次
  }

  // 监控用户行为
  monitorUserActions() {
    // 监控tap事件
    const originalTap = wx.onTap || (() => {});
    
    // 简单的用户行为记录
    this.recordUserAction = (action, data = {}) => {
      if (this.userActions.length > 100) {
        this.userActions.shift(); // 保持最近100个操作
      }
      
      this.userActions.push({
        action,
        data,
        timestamp: Date.now(),
        page: getCurrentPages().pop()?.route
      });
    };
  }

  // 生成性能报告
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      
      // API性能
      apiMetrics: performance.getMetrics(),
      
      // 页面性能
      pagePerformance: this.getPagePerformanceStats(),
      
      // 错误统计
      errorStats: this.getErrorStats(),
      
      // 用户行为
      userBehavior: this.getUserBehaviorStats(),
      
      // 系统信息
      systemInfo: getApp().globalData.systemInfo
    };
    
    this.performanceReports.push(report);
    
    // 保留最近10份报告
    if (this.performanceReports.length > 10) {
      this.performanceReports.shift();
    }
    
    return report;
  }

  // 获取页面性能统计
  getPagePerformanceStats() {
    const stats = {};
    
    for (const [pagePath, loadTimes] of this.pageLoadTimes.entries()) {
      const times = loadTimes.map(item => item.loadTime);
      
      stats[pagePath] = {
        count: times.length,
        avgLoadTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        minLoadTime: Math.min(...times),
        maxLoadTime: Math.max(...times),
        lastLoadTime: loadTimes[loadTimes.length - 1]?.timestamp
      };
    }
    
    return stats;
  }

  // 获取错误统计
  getErrorStats() {
    const errorReport = errorManager.getErrorReport();
    
    return {
      totalErrors: errorReport.errorCount,
      criticalErrors: errorReport.criticalErrors.length,
      recentErrors: errorReport.recentErrors.length,
      lastError: errorReport.lastError
    };
  }

  // 获取用户行为统计
  getUserBehaviorStats() {
    const actions = this.userActions.slice(-50); // 最近50个操作
    const actionCounts = {};
    
    actions.forEach(action => {
      actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
    });
    
    return {
      totalActions: actions.length,
      actionTypes: actionCounts,
      lastAction: actions[actions.length - 1]
    };
  }

  // 显示性能报告
  showPerformanceReport() {
    const report = this.generatePerformanceReport();
    
    const content = `📊 性能报告

🚀 API性能:
• 请求总数: ${report.apiMetrics.apiCalls}
• 缓存命中率: ${report.apiMetrics.cacheHitRate.toFixed(1)}%
• 错误率: ${((report.apiMetrics.errors / report.apiMetrics.apiCalls) * 100).toFixed(1)}%

📱 页面性能:
• 监控页面: ${Object.keys(report.pagePerformance).length}
• 平均加载时间: ${this.getAvgLoadTime(report.pagePerformance)}ms

⚠️ 错误统计:
• 总错误数: ${report.errorStats.totalErrors}
• 关键错误: ${report.errorStats.criticalErrors}

👤 用户行为:
• 操作总数: ${report.userBehavior.totalActions}`;

    wx.showModal({
      title: '性能监控报告',
      content,
      showCancel: false,
      confirmText: '了解'
    });
  }

  // 获取平均加载时间
  getAvgLoadTime(pagePerformance) {
    const loadTimes = Object.values(pagePerformance).map(page => page.avgLoadTime);
    if (loadTimes.length === 0) return 0;
    
    return Math.round(loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length);
  }

  // 清理监控数据
  clearMonitorData() {
    this.pageLoadTimes.clear();
    this.userActions = [];
    this.performanceReports = [];
    
    console.log('🧹 监控数据已清理');
  }

  // 导出监控数据
  exportMonitorData() {
    const report = this.generatePerformanceReport();
    
    wx.setClipboardData({
      data: JSON.stringify(report, null, 2),
      success: () => {
        wx.showToast({
          title: '监控数据已复制',
          icon: 'success'
        });
      }
    });
  }
}

// 创建全局监控实例
const globalMonitor = new GlobalMonitor();

// 自动启动监控 (仅在开发环境)
const isDevelopment = wx.getStorageSync('miniprogram_env') === 'development';
if (isDevelopment) {
  globalMonitor.startMonitoring();
}

module.exports = {
  globalMonitor,
  GlobalMonitor
};
