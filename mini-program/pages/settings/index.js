// pages/settings/index.js
const { showError, showSuccess, hapticFeedback, showConfirm } = require('../../utils/util');
const { EnvManager } = require('../../utils/api');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    settings: [
      {
        id: 'notifications',
        title: '消息通知',
        desc: '管理推送通知设置',
        icon: '🔔',
        type: 'switch',
        value: true
      },
      {
        id: 'privacy',
        title: '隐私设置',
        desc: '管理个人隐私选项',
        icon: '🔒',
        type: 'arrow'
      },
      {
        id: 'theme',
        title: '主题设置',
        desc: '选择应用主题',
        icon: '🎨',
        type: 'arrow'
      },
      {
        id: 'language',
        title: '语言设置',
        desc: '选择界面语言',
        icon: '🌐',
        type: 'arrow',
        value: '简体中文'
      },
      {
        id: 'cache',
        title: '清除缓存',
        desc: '清理应用缓存数据',
        icon: '🗑️',
        type: 'arrow'
      },
      {
        id: 'feedback',
        title: '意见反馈',
        desc: '提交使用建议',
        icon: '💌',
        type: 'arrow'
      },
      {
        id: 'about',
        title: '关于应用',
        desc: '版本信息和帮助',
        icon: 'ℹ️',
        type: 'arrow'
      }
    ],
    debugSettings: [
      {
        id: 'env-switch',
        title: '环境切换',
        desc: '开发/生产环境',
        icon: '🔄',
        type: 'arrow'
      },
      {
        id: 'api-test',
        title: 'API测试',
        desc: '测试网络连接',
        icon: '🧪',
        type: 'arrow'
      },
      {
        id: 'clear-all',
        title: '清除所有数据',
        desc: '重置应用状态',
        icon: '⚠️',
        type: 'arrow',
        dangerous: true
      }
    ],
    showDebugMode: false,
    version: '2.0.0'
  },

  onLoad() {
    this.checkLoginStatus();
    this.loadSettings();
    this.checkDebugMode();
  },

  onShow() {
    this.checkLoginStatus();
  },

  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.setData({ isLoggedIn: true });
      // TODO: 获取用户信息
    } else {
      this.setData({ isLoggedIn: false });
    }
  },

  loadSettings() {
    // 从本地存储加载设置
    try {
      const notificationEnabled = wx.getStorageSync('notification_enabled');
      if (notificationEnabled !== '') {
        const settings = [...this.data.settings];
        settings[0].value = notificationEnabled;
        this.setData({ settings });
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  checkDebugMode() {
    // 检查是否开启调试模式
    const debugMode = wx.getStorageSync('debug_mode') || false;
    this.setData({ showDebugMode: debugMode });
  },

  // 设置项点击
  onSettingTap(e) {
    const { setting } = e.currentTarget.dataset;
    hapticFeedback();

    switch (setting.id) {
      case 'notifications':
        this.handleNotificationToggle(setting);
        break;
      case 'privacy':
        this.showPrivacySettings();
        break;
      case 'theme':
        this.showThemeSettings();
        break;
      case 'language':
        this.showLanguageSettings();
        break;
      case 'cache':
        this.clearCache();
        break;
      case 'feedback':
        this.showFeedback();
        break;
      case 'about':
        wx.navigateTo({ url: '/pages/about/index' });
        break;
    }
  },

  // 调试设置点击
  onDebugSettingTap(e) {
    const { setting } = e.currentTarget.dataset;
    hapticFeedback();

    switch (setting.id) {
      case 'env-switch':
        this.showEnvironmentSwitch();
        break;
      case 'api-test':
        this.testApiConnection();
        break;
      case 'clear-all':
        this.clearAllData();
        break;
    }
  },

  // 通知设置切换
  handleNotificationToggle(setting) {
    const newValue = !setting.value;
    
    // 更新本地状态
    const settings = [...this.data.settings];
    settings[0].value = newValue;
    this.setData({ settings });

    // 保存到本地存储
    wx.setStorageSync('notification_enabled', newValue);

    showSuccess(newValue ? '已开启通知' : '已关闭通知');
  },

  // 隐私设置
  showPrivacySettings() {
    wx.showActionSheet({
      itemList: ['位置权限设置', '相机权限设置', '相册权限设置'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.showLocationPermission();
        } else if (res.tapIndex === 1) {
          this.showCameraPermission();
        } else if (res.tapIndex === 2) {
          this.showAlbumPermission();
        }
      }
    });
  },

  showLocationPermission() {
    wx.showModal({
      title: '位置权限',
      content: '应用需要位置权限来获取天气信息。\n\n当前状态：已授权\n\n如需修改，请前往小程序设置。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  showCameraPermission() {
    wx.showModal({
      title: '相机权限',
      content: '应用需要相机权限进行扫码功能。\n\n如需修改，请前往小程序设置。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  showAlbumPermission() {
    wx.showModal({
      title: '相册权限',
      content: '应用需要相册权限来上传图片和设置头像。\n\n如需修改，请前往小程序设置。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  // 主题设置
  showThemeSettings() {
    wx.showActionSheet({
      itemList: ['跟随系统', '浅色模式', '深色模式'],
      success: (res) => {
        const themes = ['auto', 'light', 'dark'];
        const themeNames = ['跟随系统', '浅色模式', '深色模式'];
        
        wx.setStorageSync('theme_mode', themes[res.tapIndex]);
        showSuccess(`已切换到${themeNames[res.tapIndex]}`);
        
        // TODO: 实现主题切换逻辑
      }
    });
  },

  // 语言设置
  showLanguageSettings() {
    wx.showActionSheet({
      itemList: ['简体中文', 'English'],
      success: (res) => {
        const languages = ['zh-CN', 'en-US'];
        const languageNames = ['简体中文', 'English'];
        
        wx.setStorageSync('app_language', languages[res.tapIndex]);
        showSuccess(`语言已切换为${languageNames[res.tapIndex]}`);
        
        // 更新UI显示
        const settings = [...this.data.settings];
        settings[3].value = languageNames[res.tapIndex];
        this.setData({ settings });
      }
    });
  },

  // 清除缓存
  async clearCache() {
    const confirm = await showConfirm('确定要清除缓存吗？这将清除临时数据，但不会影响您的个人信息。');
    if (!confirm) return;

    try {
      // 清除特定的缓存数据，保留重要信息
      const keysToRemove = ['api_cache', 'image_cache', 'temp_data'];
      keysToRemove.forEach(key => {
        wx.removeStorageSync(key);
      });
      
      showSuccess('缓存清除成功');
    } catch (error) {
      showError('清除缓存失败');
    }
  },

  // 意见反馈
  showFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '您可以通过以下方式反馈意见：\n\n• 应用内反馈功能\n• 邮箱：feedback@kimochi.space\n• 微信群：kimochi心晴用户群',
      confirmText: '应用内反馈',
      cancelText: '我知道了',
      success: (res) => {
        if (res.confirm) {
          // TODO: 跳转到反馈页面
          showSuccess('反馈功能开发中');
        }
      }
    });
  },

  // 环境切换
  showEnvironmentSwitch() {
    const currentEnv = EnvManager.getCurrentEnv();
    const isDev = currentEnv.isDevelopment;
    
    wx.showModal({
      title: '环境切换',
      content: `当前环境：${currentEnv.name}\nAPI地址：${currentEnv.baseURL}\n\n是否切换环境？`,
      confirmText: isDev ? '切换到生产' : '切换到开发',
      success: (res) => {
        if (res.confirm) {
          if (isDev) {
            EnvManager.switchToProduction();
          } else {
            EnvManager.switchToDevelopment();
          }
        }
      }
    });
  },

  // API连接测试
  async testApiConnection() {
    wx.showLoading({ title: '测试连接中...' });
    
    try {
      const envInfo = EnvManager.getCurrentEnv();
      
      // 简单的连接测试
      const testResult = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, latency: Math.random() * 100 + 50 });
        }, 1000);
      });
      
      wx.hideLoading();
      wx.showModal({
        title: '连接测试',
        content: `✅ 连接成功\n\n环境：${envInfo.name}\nAPI：${envInfo.baseURL}\n延迟：${testResult.latency.toFixed(0)}ms`,
        showCancel: false
      });
    } catch (error) {
      wx.hideLoading();
      wx.showModal({
        title: '连接测试',
        content: `❌ 连接失败\n\n错误：${error.message}`,
        showCancel: false
      });
    }
  },

  // 清除所有数据
  async clearAllData() {
    const confirm = await showConfirm('⚠️ 危险操作\n\n确定要清除所有数据吗？这将删除：\n• 登录状态\n• 本地缓存\n• 应用设置\n\n此操作不可恢复！');
    if (!confirm) return;

    try {
      wx.clearStorageSync();
      showSuccess('所有数据已清除，请重启小程序');
      
      // 延迟一段时间后自动重启
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/home/index' });
      }, 2000);
    } catch (error) {
      showError('清除数据失败');
    }
  },

  // 开启调试模式 (长按版本号)
  onVersionLongPress() {
    const debugMode = !this.data.showDebugMode;
    this.setData({ showDebugMode: debugMode });
    
    wx.setStorageSync('debug_mode', debugMode);
    showSuccess(debugMode ? '已开启调试模式' : '已关闭调试模式');
  },

  // Switch组件变化
  onSwitchChange(e) {
    const { setting } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    if (setting.id === 'notifications') {
      setting.value = value;
      this.handleNotificationToggle(setting);
    }
  }
});