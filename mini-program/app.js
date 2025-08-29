// app.js
// 简化启动，减少模块依赖
const { api } = require('./utils/api');

App({
  globalData: {
    userInfo: null,
    token: '',
    systemInfo: {},
    unreadCount: 0,
    version: '2.0.0'
  },

  onLaunch(options) {
    console.log('小程序启动', options);
    
    // 基础初始化
    this.initSystemInfo();
    this.initUserData();
    
    // 延迟初始化其他功能
    setTimeout(() => {
      this.initAdvancedFeatures();
      this.handleLaunchOptions(options);
    }, 100);
  },

  onShow(options) {
    console.log('小程序显示', options);
    
    // 每次前台时检查登录状态
    this.checkLoginStatus();
    
    // 处理分享进入
    this.handleShowOptions(options);
  },

  onHide() {
    console.log('小程序隐藏');
    
    // 保存当前状态
    this.saveAppState();
  },

  onError(error) {
    console.error('小程序错误:', error);
    
    // 记录错误日志
    this.logError(error);
  },

  // 初始化高级功能
  initAdvancedFeatures() {
    try {
      // 启动性能监控 (仅开发环境)
      const isDevelopment = wx.getStorageSync('miniprogram_env') === 'development';
      if (isDevelopment) {
        console.log('🔍 开发环境：启用监控功能');
      }
      
      // 检查更新
      this.checkAppUpdate();
    } catch (error) {
      console.error('高级功能初始化失败:', error);
    }
  },

  // 初始化系统信息
  initSystemInfo() {
    // 使用新的API替代废弃的wx.getSystemInfo
    try {
      const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : {};
      const appBaseInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
      
      // 合并系统信息以保持兼容性
      const systemInfo = {
        ...deviceInfo,
        ...windowInfo,
        ...appBaseInfo
      };
      
      this.globalData.systemInfo = systemInfo;
      
      console.log('系统信息:', {
        platform: systemInfo.platform,
        version: systemInfo.version,
        SDKVersion: systemInfo.SDKVersion,
        screenWidth: systemInfo.screenWidth,
        screenHeight: systemInfo.screenHeight
      });
      
      // 设置全局样式变量
      this.setGlobalStyle(systemInfo);
    } catch (error) {
      console.error('获取系统信息失败:', error);
      
      // 兼容旧版本API
      wx.getSystemInfo({
        success: (systemInfo) => {
          this.globalData.systemInfo = systemInfo;
          this.setGlobalStyle(systemInfo);
        },
        fail: (error) => {
          console.error('获取系统信息失败:', error);
        }
      });
    }
  },

  // 设置全局样式
  setGlobalStyle(systemInfo) {
    // 根据系统信息调整样式
    const { platform, pixelRatio } = systemInfo;
    
    // iOS设备特殊处理
    if (platform === 'ios') {
      // 添加iOS特有的样式类
      wx.setStorageSync('platform', 'ios');
    } else {
      wx.setStorageSync('platform', 'android');
    }
    
    // 高分辨率屏幕优化
    if (pixelRatio >= 3) {
      wx.setStorageSync('highDPI', true);
    }
  },

  // 初始化用户数据
  initUserData() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      api.setToken(token);
      this.checkLoginStatus();
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    const token = this.globalData.token || wx.getStorageSync('token');
    if (!token) return;

    try {
      const userInfo = await api.get('/api/auth/profile', { showLoading: false });
      this.globalData.userInfo = userInfo;
      
      // 更新未读数量
      this.updateUnreadCount();
    } catch (error) {
      console.error('检查登录状态失败:', error);
      
      // Token失效，清除本地数据
      this.clearUserData();
    }
  },

  // 更新未读数量
  async updateUnreadCount() {
    try {
      const data = await api.get('/api/messages/unread-count', { showLoading: false });
      const unreadCount = data.count || 0;
      
      this.globalData.unreadCount = unreadCount;
      
      // 更新TabBar徽章
      if (unreadCount > 0) {
        wx.setTabBarBadge({
          index: 3,
          text: unreadCount > 99 ? '99+' : unreadCount.toString()
        });
      } else {
        wx.removeTabBarBadge({ index: 3 });
      }
    } catch (error) {
      console.error('更新未读数量失败:', error);
    }
  },

  // 清除用户数据
  clearUserData() {
    this.globalData.userInfo = null;
    this.globalData.token = '';
    this.globalData.unreadCount = 0;
    
    api.clearToken();
    wx.removeTabBarBadge({ index: 3 });
  },

  // 检查应用更新
  checkAppUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本');
        }
      });
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
    }
  },

  // 处理启动参数
  handleLaunchOptions(options) {
    const { scene, query, shareTicket } = options;
    
    console.log('启动场景:', scene);
    
    // 处理不同启动场景
    switch (scene) {
      case 1001: // 发现栏小程序主入口
      case 1089: // 微信聊天主界面下拉
        break;
      case 1007: // 单人聊天会话中的小程序消息卡片
      case 1008: // 群聊会话中的小程序消息卡片  
        this.handleShareEntry(query, shareTicket);
        break;
      case 1011: // 扫描二维码
        this.handleQREntry(query);
        break;
      default:
        console.log('未处理的启动场景:', scene);
    }
  },

  // 处理显示参数
  handleShowOptions(options) {
    const { scene, query } = options;
    
    // 处理从其他小程序或H5页面跳转
    if (query && Object.keys(query).length > 0) {
      this.handleDeepLink(query);
    }
  },

  // 处理分享进入
  handleShareEntry(query, shareTicket) {
    console.log('分享进入:', query, shareTicket);
    
    // 延迟处理，等待页面加载完成
    setTimeout(() => {
      if (query.postId) {
        // 分享的动态
        wx.navigateTo({
          url: `/pages/message-wall/detail?id=${query.postId}`
        });
      } else if (query.assessmentId) {
        // 分享的测评
        wx.navigateTo({
          url: `/pages/assessments/detail?id=${query.assessmentId}`
        });
      }
    }, 1000);
  },

  // 处理二维码进入
  handleQREntry(query) {
    console.log('二维码进入:', query);
    
    setTimeout(() => {
      if (query.qrId) {
        // 登录确认
        wx.navigateTo({
          url: `/pages/scan/confirm-login?qrId=${query.qrId}`
        });
      } else if (query.userId) {
        // 用户资料
        wx.navigateTo({
          url: `/pages/user/profile?id=${query.userId}`
        });
      }
    }, 1000);
  },

  // 处理深度链接
  handleDeepLink(query) {
    const { action, target, id } = query;
    
    console.log('深度链接:', query);
    
    setTimeout(() => {
      switch (action) {
        case 'assessment':
          wx.navigateTo({
            url: `/pages/assessments/detail?id=${id}`
          });
          break;
        case 'post':
          wx.navigateTo({
            url: `/pages/message-wall/detail?id=${id}`
          });
          break;
        case 'chat':
          wx.navigateTo({
            url: `/pages/messages/chat?roomId=${id}`
          });
          break;
        default:
          break;
      }
    }, 1000);
  },

  // 保存应用状态
  saveAppState() {
    try {
      const state = {
        lastActiveTime: Date.now(),
        unreadCount: this.globalData.unreadCount,
        version: this.globalData.version
      };
      
      wx.setStorageSync('app_state', state);
    } catch (error) {
      console.error('保存应用状态失败:', error);
    }
  },

  // 记录错误日志
  logError(error) {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        stack: error.stack,
        userAgent: this.globalData.systemInfo.system,
        version: this.globalData.version
      };
      
      // 保存到本地存储
      const logs = wx.getStorageSync('error_logs') || [];
      logs.unshift(errorLog);
      
      // 保留最近50条错误日志
      if (logs.length > 50) {
        logs.splice(50);
      }
      
      wx.setStorageSync('error_logs', logs);
      
      // TODO: 可以发送到服务器用于错误分析
    } catch (err) {
      console.error('记录错误日志失败:', err);
    }
  },

  // 全局方法：显示错误
  showError(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration
    });
  },

  // 全局方法：显示成功
  showSuccess(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration
    });
  },

  // 全局方法：获取用户信息
  getUserInfo() {
    return this.globalData.userInfo;
  },

  // 全局方法：设置用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
  },

  // 全局方法：检查是否登录
  isLoggedIn() {
    return !!(this.globalData.token && this.globalData.userInfo);
  }
});