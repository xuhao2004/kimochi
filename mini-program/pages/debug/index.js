// pages/debug/index.js - 开发调试面板
const { ApiService, EnvManager } = require('../../utils/api');
const { showError, showSuccess, hapticFeedback, cacheManager } = require('../../utils/util');
const { globalMonitor } = require('../../utils/monitor');
const { performance, errorManager } = require('../../utils/performance');

Page({
  data: {
    isVisible: false,
    activeTab: 'performance',
    
    tabs: [
      { id: 'performance', name: '性能', icon: '📊' },
      { id: 'api', name: 'API', icon: '🔌' },
      { id: 'cache', name: '缓存', icon: '💾' },
      { id: 'errors', name: '错误', icon: '🐛' },
      { id: 'system', name: '系统', icon: '⚙️' }
    ],

    // 性能数据
    performanceData: null,
    
    // API数据
    apiMetrics: null,
    
    // 缓存信息
    cacheInfo: null,
    
    // 错误信息
    errorInfo: null,
    
    // 系统信息
    systemInfo: null
  },

  onLoad() {
    // 只在开发环境显示
    const isDev = wx.getStorageSync('miniprogram_env') === 'development';
    this.setData({ isVisible: isDev });
    
    if (isDev) {
      this.loadAllData();
    }
  },

  onShow() {
    if (this.data.isVisible) {
      this.loadAllData();
    }
  },

  async loadAllData() {
    await Promise.all([
      this.loadPerformanceData(),
      this.loadApiMetrics(),
      this.loadCacheInfo(),
      this.loadErrorInfo(),
      this.loadSystemInfo()
    ]);
  },

  // 加载性能数据
  loadPerformanceData() {
    try {
      const report = globalMonitor.generatePerformanceReport();
      this.setData({ performanceData: report });
    } catch (error) {
      console.error('加载性能数据失败:', error);
    }
  },

  // 加载API指标
  loadApiMetrics() {
    try {
      const metrics = performance.getMetrics();
      this.setData({ apiMetrics: metrics });
    } catch (error) {
      console.error('加载API指标失败:', error);
    }
  },

  // 加载缓存信息
  loadCacheInfo() {
    wx.getStorageInfo({
      success: (info) => {
        try {
          const cacheSize = performance.cache.size;
      
          this.setData({
            cacheInfo: {
              storageSize: `${(info.currentSize / 1024).toFixed(2)} KB`,
              storageLimit: `${(info.limitSize / 1024).toFixed(2)} KB`,
              storageUsage: ((info.currentSize / info.limitSize) * 100).toFixed(1),
              memoryCache: cacheSize,
              keys: info.keys.length
            }
          });
        } catch (error) {
          console.error('处理缓存信息失败:', error);
        }
      },
      fail: (error) => {
        console.error('获取缓存信息失败:', error);
      }
    });
  },

  // 加载错误信息
  loadErrorInfo() {
    try {
      const errorReport = errorManager.getErrorReport();
      this.setData({ errorInfo: errorReport });
    } catch (error) {
      console.error('加载错误信息失败:', error);
    }
  },

  // 加载系统信息
  loadSystemInfo() {
    try {
      const systemInfo = getApp().globalData.systemInfo;
      const envInfo = EnvManager.getCurrentEnv();
      
      this.setData({
        systemInfo: {
          ...systemInfo,
          environment: envInfo.name,
          apiBaseUrl: envInfo.baseURL,
          appVersion: getApp().globalData.version,
          isLoggedIn: getApp().isLoggedIn()
        }
      });
    } catch (error) {
      console.error('加载系统信息失败:', error);
    }
  },

  // 标签切换
  onTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    hapticFeedback();
    
    this.setData({ activeTab: tab });
    
    // 根据标签加载对应数据
    switch (tab) {
      case 'performance':
        this.loadPerformanceData();
        break;
      case 'api':
        this.loadApiMetrics();
        break;
      case 'cache':
        this.loadCacheInfo();
        break;
      case 'errors':
        this.loadErrorInfo();
        break;
      case 'system':
        this.loadSystemInfo();
        break;
    }
  },

  // 测试API连接
  async testApiConnection() {
    wx.showLoading({ title: '测试连接中...' });
    
    try {
      await ApiService.auth.getProfile();
      wx.hideLoading();
      showSuccess('API连接正常');
    } catch (error) {
      wx.hideLoading();
      showError(`API连接失败: ${error.message}`);
    }
  },

  // 清除所有缓存
  clearAllCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存吗？包括：\n• 内存缓存\n• 本地存储\n• 图片缓存',
      success: (res) => {
        if (res.confirm) {
          // 清除内存缓存
          performance.clearCache();
          
          // 清除本地存储缓存
          const keys = wx.getStorageInfoSync().keys;
          keys.forEach(key => {
            if (key.includes('cache') || key.includes('temp')) {
              wx.removeStorageSync(key);
            }
          });
          
          showSuccess('缓存清除完成');
          this.loadCacheInfo();
        }
      }
    });
  },

  // 导出性能报告
  exportPerformanceReport() {
    const report = globalMonitor.generatePerformanceReport();
    
    wx.setClipboardData({
      data: JSON.stringify(report, null, 2),
      success: () => showSuccess('性能报告已复制到剪贴板')
    });
  },

  // 模拟错误 (用于测试错误处理)
  simulateError() {
    wx.showActionSheet({
      itemList: ['网络错误', '认证错误', '应用崩溃', 'API错误'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            const networkError = new Error('Network request failed');
            networkError.type = 'NetworkError';
            errorManager.handleError(networkError, 'Debug Simulation');
            break;
          case 1:
            const authError = new Error('Unauthorized');
            authError.statusCode = 401;
            errorManager.handleError(authError, 'Debug Simulation');
            break;
          case 2:
            throw new Error('Simulated crash for testing');
            break;
          case 3:
            const apiError = new Error('API Server Error');
            apiError.statusCode = 500;
            errorManager.handleError(apiError, 'Debug Simulation');
            break;
        }
      }
    });
  },

  // 压力测试
  async stressTest() {
    wx.showLoading({ title: '压力测试中...' });
    
    try {
      const promises = [];
      
      // 并发发送10个请求
      for (let i = 0; i < 10; i++) {
        promises.push(
          ApiService.auth.getProfile().catch(e => ({ error: e.message }))
        );
      }
      
      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      wx.hideLoading();
      showSuccess(`压力测试完成: ${successCount}/10 成功`);
      
      this.loadApiMetrics();
    } catch (error) {
      wx.hideLoading();
      showError('压力测试失败');
    }
  },

  // 切换环境
  switchEnvironment() {
    const currentEnv = EnvManager.getCurrentEnv();
    const isDev = currentEnv.isDevelopment;
    
    if (isDev) {
      EnvManager.switchToProduction();
    } else {
      EnvManager.switchToDevelopment();
    }
    
    setTimeout(() => {
      this.loadSystemInfo();
    }, 1000);
  },

  // 刷新数据
  onRefresh() {
    hapticFeedback();
    this.loadAllData();
    showSuccess('数据已刷新');
  },

  // 复制调试信息
  onCopyDebugInfo() {
    const debugInfo = {
      performance: this.data.performanceData,
      api: this.data.apiMetrics,
      cache: this.data.cacheInfo,
      errors: this.data.errorInfo,
      system: this.data.systemInfo,
      timestamp: new Date().toISOString()
    };
    
    wx.setClipboardData({
      data: JSON.stringify(debugInfo, null, 2),
      success: () => showSuccess('调试信息已复制')
    });
  },

  // 重置监控数据
  resetMonitorData() {
    wx.showModal({
      title: '重置监控数据',
      content: '确定要重置所有监控数据吗？这将清除：\n• 性能统计\n• 错误记录\n• 缓存统计',
      success: (res) => {
        if (res.confirm) {
          globalMonitor.clearMonitorData();
          errorManager.clearErrorLog();
          performance.cleanup();
          
          this.loadAllData();
          showSuccess('监控数据已重置');
        }
      }
    });
  }
});
