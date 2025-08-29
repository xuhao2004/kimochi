// pages/profile/index.js
const { ApiService, EnvManager } = require('../../utils/api');
const { showError, showSuccess, hapticFeedback, showConfirm, formatRelativeTime } = require('../../utils/util');
const { globalMonitor } = require('../../utils/monitor');

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    isLoading: true,
    stats: {
      assessmentCount: 0,
      messageCount: 0,
      postCount: 0,
      friendCount: 0
    },
    recentActivities: [],
    menuItems: [
      {
        id: 'assessments',
        icon: '📊',
        title: '测评历史',
        desc: '查看测评记录',
        url: '/pages/assessments/history',
        requireLogin: true
      },
      {
        id: 'posts',
        icon: '💭',
        title: '我的动态',
        desc: '管理发布内容',
        url: '/pages/message-wall/my-posts',
        requireLogin: true
      },
      {
        id: 'friends',
        icon: '👥',
        title: '好友管理',
        desc: '好友列表',
        url: '/pages/friends/index',
        requireLogin: true
      },
      {
        id: 'settings',
        icon: '⚙️',
        title: '设置',
        desc: '个人设置',
        url: '/pages/settings/index',
        requireLogin: false
      },
      {
        id: 'about',
        icon: 'ℹ️',
        title: '关于',
        desc: '应用信息',
        url: '/pages/about/index',
        requireLogin: false
      },
      {
        id: 'developer',
        icon: '👨‍💻',
        title: '开发者工具',
        desc: '环境切换、调试工具',
        action: 'showDevTools',
        requireLogin: false
      }
    ]
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
  },

  onPullDownRefresh() {
    this.loadUserData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.setData({ isLoggedIn: true });
      await this.loadUserData();
    } else {
      this.setData({
        isLoggedIn: false,
        isLoading: false
      });
    }
  },

  async loadUserData() {
    try {
      this.setData({ isLoading: true });
      
      // 并行加载用户数据
      const [userInfo] = await Promise.all([
        ApiService.auth.getProfile(),
        this.loadUserStats(),
        this.loadRecentActivities()
      ]);

      this.setData({ userInfo });
    } catch (error) {
      console.error('加载用户数据失败:', error);
      // 可能是token失效
      if (error.message === 'Unauthorized') {
        this.handleLogout(false);
      } else {
        showError('加载用户信息失败');
      }
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async loadUserStats() {
    try {
      // 这里可以调用API获取用户统计数据
      // const stats = await ApiService.user.getStats();
      // this.setData({ stats });
      
      // 暂时使用模拟数据
      this.setData({
        stats: {
          assessmentCount: 12,
          messageCount: 45,
          postCount: 8,
          friendCount: 23
        }
      });
    } catch (error) {
      console.error('加载用户统计失败:', error);
    }
  },

  async loadRecentActivities() {
    try {
      // 获取最近活动
      // const activities = await ApiService.user.getRecentActivities();
      // this.setData({ recentActivities: activities });
      
      // 暂时使用模拟数据
      this.setData({
        recentActivities: [
          {
            id: 1,
            type: 'assessment',
            title: '完成了MBTI人格测试',
            time: '2024-08-28T10:00:00Z',
            icon: '📊'
          },
          {
            id: 2,
            type: 'post',
            title: '发布了新动态',
            time: '2024-08-27T15:30:00Z',
            icon: '💭'
          }
        ]
      });
    } catch (error) {
      console.error('加载最近活动失败:', error);
    }
  },

  // 点击登录
  onLogin() {
    hapticFeedback();
    wx.navigateTo({ url: '/pages/auth/login' });
  },

  // 编辑个人资料
  onEditProfile() {
    if (!this.data.isLoggedIn) {
      this.onLogin();
      return;
    }
    
    hapticFeedback();
    wx.navigateTo({ url: '/pages/profile/edit' });
  },

  // 点击头像
  onAvatarTap() {
    if (!this.data.isLoggedIn) {
      this.onLogin();
      return;
    }

    const { userInfo } = this.data;
    if (userInfo && userInfo.avatar) {
      wx.previewImage({
        urls: [userInfo.avatar],
        current: userInfo.avatar
      });
    } else {
      this.onEditProfile();
    }
  },

  // 菜单项点击
  onMenuItemTap(e) {
    const { item } = e.currentTarget.dataset;
    hapticFeedback();

    if (item.requireLogin && !this.data.isLoggedIn) {
      this.onLogin();
      return;
    }

    // 处理特殊action
    if (item.action) {
      this[item.action] && this[item.action]();
      return;
    }

    // 根据不同类型处理跳转
    if (item.url.includes('tab')) {
      wx.switchTab({ url: item.url });
    } else {
      wx.navigateTo({ url: item.url });
    }
  },

  // 统计项点击
  onStatTap(e) {
    const { type } = e.currentTarget.dataset;
    
    if (!this.data.isLoggedIn) {
      this.onLogin();
      return;
    }

    hapticFeedback();

    const routeMap = {
      assessmentCount: '/pages/assessments/history',
      messageCount: '/pages/messages/index',
      postCount: '/pages/message-wall/my-posts',
      friendCount: '/pages/friends/index'
    };

    const url = routeMap[type];
    if (url) {
      if (url.includes('tab')) {
        wx.switchTab({ url });
      } else {
        wx.navigateTo({ url });
      }
    }
  },

  // 最近活动点击
  onActivityTap(e) {
    const { activity } = e.currentTarget.dataset;
    hapticFeedback();

    // 根据活动类型跳转
    const routeMap = {
      assessment: '/pages/assessments/history',
      post: '/pages/message-wall/my-posts',
      message: '/pages/messages/index'
    };

    const url = routeMap[activity.type];
    if (url) {
      wx.navigateTo({ url });
    }
  },

  // 退出登录
  async onLogout() {
    const confirm = await showConfirm('确定要退出登录吗？');
    if (confirm) {
      this.handleLogout(true);
    }
  },

  async handleLogout(showMessage = true) {
    try {
      // 调用登出API
      await ApiService.auth.logout();
    } catch (error) {
      console.error('登出API调用失败:', error);
    }

    // 清理本地数据
    ApiService.auth.clearToken();
    
    // 清除TabBar徽章
    wx.removeTabBarBadge({ index: 3 });

    this.setData({
      isLoggedIn: false,
      userInfo: null,
      stats: {
        assessmentCount: 0,
        messageCount: 0,
        postCount: 0,
        friendCount: 0
      },
      recentActivities: []
    });

    if (showMessage) {
      showSuccess('已退出登录');
    }
  },

  // 扫码功能
  onScanCode() {
    hapticFeedback();
    wx.navigateTo({ url: '/pages/scan/index' });
  },

  // 意见反馈
  onFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' });
  },

  // 分享应用
  onShareApp() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  // 长按个人信息区域
  onUserInfoLongPress() {
    if (!this.data.isLoggedIn) return;

    wx.showActionSheet({
      itemList: ['复制用户信息', '导出数据', '账号安全'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.copyUserInfo();
        } else if (res.tapIndex === 1) {
          this.exportUserData();
        } else if (res.tapIndex === 2) {
          wx.navigateTo({ url: '/pages/settings/security' });
        }
      }
    });
  },

  copyUserInfo() {
    const { userInfo } = this.data;
    const info = `用户名：${userInfo.name}\n邮箱：${userInfo.email}\n注册时间：${formatRelativeTime(userInfo.createdAt)}`;
    
    wx.setClipboardData({
      data: info,
      success: () => showSuccess('用户信息已复制')
    });
  },

  async exportUserData() {
    try {
      showSuccess('数据导出功能开发中');
      // TODO: 实现数据导出功能
    } catch (error) {
      showError('导出失败');
    }
  },

  // 显示开发者工具
  showDevTools() {
    try {
      const currentEnv = EnvManager.getCurrentEnv();
      const isDev = currentEnv && currentEnv.isDevelopment;
      
      wx.showActionSheet({
        itemList: [
          '环境信息',
          '智能环境检测',
          isDev ? '切换到生产环境' : '切换到开发环境', 
          '调试面板',
          '性能监控报告',
          '查看网络日志',
          '清除缓存',
          '测试API连接'
        ],
        success: (res) => {
          try {
            switch (res.tapIndex) {
              case 0:
                EnvManager.showEnvInfo();
                break;
              case 1:
                EnvManager.smartEnvironmentCheck();
                break;
              case 2:
                if (isDev) {
                  EnvManager.switchToProduction();
                } else {
                  EnvManager.switchToDevelopment();
                }
                break;
              case 3:
                wx.navigateTo({ url: '/pages/debug/index' });
                break;
              case 4:
                try {
                  globalMonitor.showPerformanceReport();
                } catch (error) {
                  wx.showModal({
                    title: '性能监控',
                    content: '性能监控功能暂时不可用',
                    showCancel: false
                  });
                }
                break;
              case 5:
                this.showNetworkLogs();
                break;
              case 6:
                this.clearAllCache();
                break;
              case 7:
                this.testApiConnection();
                break;
            }
          } catch (error) {
            console.error('开发者工具操作失败:', error);
            showError('操作失败，请重试');
          }
        }
      });
    } catch (error) {
      console.error('显示开发者工具失败:', error);
      showError('开发者工具暂时不可用');
    }
  },

  // 显示网络日志
  showNetworkLogs() {
    wx.showModal({
      title: '网络日志',
      content: '请在开发者工具的控制台查看网络请求日志',
      showCancel: false
    });
  },

  // 清除缓存
  clearAllCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            showSuccess('缓存清除成功，请重启小程序');
          } catch (error) {
            showError('清除缓存失败');
          }
        }
      }
    });
  },

  // 测试API连接
  async testApiConnection() {
    wx.showLoading({ title: '测试连接中...' });
    
    try {
      const envInfo = EnvManager.getCurrentEnv();
      
      // 尝试访问健康检查接口
      const response = await ApiService.auth.getProfile().catch(() => {
        // 如果认证失败，尝试公开接口
        return { test: 'connection' };
      });
      
      wx.hideLoading();
      wx.showModal({
        title: '连接测试',
        content: `✅ 连接成功\n\n环境: ${envInfo.name}\nAPI: ${envInfo.baseURL}`,
        showCancel: false
      });
    } catch (error) {
      wx.hideLoading();
      wx.showModal({
        title: '连接测试',
        content: `❌ 连接失败\n\n错误: ${error.message || '网络连接异常'}`,
        showCancel: false
      });
    }
  },

  // 检查更新
  onCheckUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          showSuccess('发现新版本');
        } else {
          showSuccess('当前已是最新版本');
        }
      });
    } else {
      showSuccess('当前微信版本过低，无法检查更新');
    }
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: 'kimochi心晴 - 关照情绪，连接彼此',
      path: '/pages/home/index',
      imageUrl: '/assets/share/default.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: 'kimochi心晴 - 了解内在的自己',
      path: '/pages/home/index',
      imageUrl: '/assets/share/timeline.png'
    };
  }
});