// pages/home/index.js
const { ApiService } = require('../../utils/api');
const { formatRelativeTime, getCurrentLocation, showError, showSuccess, hapticFeedback, cacheManager } = require('../../utils/util');

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    dailyQuote: {
      content: '每一天都是新的开始，保持积极的心态。',
      author: 'kimochi心晴'
    },
    weather: {
      summary: '多云',
      temperatureC: '22',
      humidity: '65',
      locationName: '当前位置'
    },
    hotPosts: [],
    unreadCount: 0,
    isLoading: false, // 改为false，避免页面一直显示空白
    refreshing: false,
    location: {
      latitude: null,
      longitude: null,
      city: '当前位置'
    },
    quickActions: [
      {
        id: 'assessment',
        icon: '📊',
        title: '心理测评',
        desc: '了解内在的自己',
        color: '#007AFF',
        url: '/pages/assessments/index'
      },
      {
        id: 'wall', 
        icon: '💭',
        title: '心情墙',
        desc: '分享此刻心情',
        color: '#5856D6',
        url: '/pages/message-wall/index'
      },
      {
        id: 'chat',
        icon: '💬',
        title: '心语聊天',
        desc: '与他人心灵对话',
        color: '#34C759',
        url: '/pages/messages/index'
      },
      {
        id: 'scan',
        icon: '📱',
        title: '扫码登录',
        desc: 'PC端快捷登录',
        color: '#FF9500',
        url: '/pages/scan/index'
      }
    ]
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 每次显示时检查登录状态
    this.checkLoginStatus();
    // 更新未读数量
    this.getUnreadCount();
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.refreshHomeData().finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  async initPage() {
    try {
      // 先快速检查登录状态
      this.checkLoginStatus();
      
      // 延迟加载其他数据，避免阻塞界面显示
      setTimeout(() => {
        this.loadHomeData().catch(error => {
          console.error('首页数据加载失败:', error);
        });
      }, 100);
      
    } catch (error) {
      console.error('页面初始化失败:', error);
    }
  },

  checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token');
      if (token) {
        // 异步验证token，不阻塞界面
        ApiService.auth.getProfile().then(userInfo => {
          this.setData({
            isLoggedIn: true,
            userInfo
          });
        }).catch(error => {
          console.log('Token验证失败:', error);
          // Token失效，清除本地数据
          wx.removeStorageSync('token');
          this.setData({
            isLoggedIn: false,
            userInfo: null
          });
        });
      } else {
        this.setData({
          isLoggedIn: false,
          userInfo: null
        });
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      this.setData({
        isLoggedIn: false,
        userInfo: null
      });
    }
  },

  async loadHomeData() {
    try {
      // 并行加载各种数据
      const promises = [];
      
      // 获取今日心语
      promises.push(this.getDailyQuote());
      
      // 获取热门帖子
      promises.push(this.getHotPosts());
      
      // 如果已登录，获取未读数量
      if (this.data.isLoggedIn) {
        promises.push(this.getUnreadCount());
      }
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('加载首页数据失败:', error);
    }
  },

  async refreshHomeData() {
    await Promise.all([
      this.getDailyQuote(),
      this.getHotPosts(),
      this.getWeatherData(),
      this.data.isLoggedIn ? this.getUnreadCount() : Promise.resolve()
    ]);
  },

  async getDailyQuote() {
    try {
      // 检查缓存 (每日心语缓存1小时)
      const cacheKey = 'daily_quote_' + new Date().toDateString();
      const cached = cacheManager.get(cacheKey);
      
      if (cached) {
        this.setData({ dailyQuote: cached });
        return;
      }
      
      const data = await ApiService.home.getDailyQuote();
      const quoteData = data.sentence || {
        content: '心情就像天气，时而晴朗时而多云，但都会过去。',
        author: 'kimochi心晴'
      };
      
      this.setData({ dailyQuote: quoteData });
      
      // 缓存结果
      cacheManager.set(cacheKey, quoteData, 60 * 60 * 1000);
    } catch (error) {
      console.error('获取今日心语失败:', error);
      // 保持默认心语，不需要更新
    }
  },

  async getHotPosts() {
    try {
      const posts = await ApiService.home.getHotPosts();
      // 格式化时间
      const formattedPosts = posts.map(post => ({
        ...post,
        _createdAt: formatRelativeTime(post.createdAt),
        _content: post.content.length > 50 ? 
          post.content.substring(0, 50) + '...' : post.content
      }));
      
      this.setData({ hotPosts: formattedPosts });
    } catch (error) {
      console.error('获取热门帖子失败:', error);
      this.setData({ hotPosts: [] });
    }
  },

  async getUnreadCount() {
    try {
      const data = await ApiService.messages.getUnreadCount();
      this.setData({ unreadCount: data.count || 0 });
      
      // 更新TabBar的徽章
      if (data.count > 0) {
        wx.setTabBarBadge({
          index: 3, // 消息tab的索引
          text: data.count > 99 ? '99+' : data.count.toString()
        });
      } else {
        wx.removeTabBarBadge({ index: 3 });
      }
    } catch (error) {
      console.error('获取未读数量失败:', error);
    }
  },

  async getWeatherData() {
    try {
      // 先尝试获取位置
      const location = await getCurrentLocation();
      
      this.setData({
        'location.latitude': location.latitude,
        'location.longitude': location.longitude
      });

      // 天气数据缓存15分钟
      const cacheKey = `weather_${location.latitude}_${location.longitude}`;
      const cached = cacheManager.get(cacheKey);
      
      if (cached) {
        this.setData({
          weather: cached,
          'location.city': cached.locationName || this.data.location.city
        });
        return;
      }

      // 获取天气数据
      const weather = await ApiService.home.getWeather(
        location.latitude, 
        location.longitude
      );
      
      this.setData({
        weather,
        'location.city': weather.locationName || this.data.location.city
      });
      
      // 缓存天气数据
      cacheManager.set(cacheKey, weather, 15 * 60 * 1000);
    } catch (error) {
      console.error('获取天气失败:', error);
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        showError('需要位置权限才能获取天气信息');
      } else {
        // 使用默认天气信息
        this.setData({
          weather: {
            summary: '无法获取天气',
            temperatureC: '--',
            humidity: '--',
            locationName: '未知位置'
          }
        });
      }
    }
  },

  // 点击快捷操作
  onQuickActionTap(e) {
    const { url } = e.currentTarget.dataset;
    hapticFeedback();
    
    if (url.includes('tab')) {
      // TabBar页面使用switchTab
      wx.switchTab({ url });
    } else {
      // 普通页面使用navigateTo
      wx.navigateTo({ url });
    }
  },

  // 点击今日心语
  onDailyQuoteTap() {
    hapticFeedback();
    if (!this.data.dailyQuote) {
      this.getDailyQuote();
    } else {
      // 分享今日心语
      this.shareDailyQuote();
    }
  },

  // 分享今日心语
  shareDailyQuote() {
    const quote = this.data.dailyQuote;
    if (!quote) return;

    wx.showActionSheet({
      itemList: ['复制文本', '生成海报'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 复制文本
          wx.setClipboardData({
            data: quote,
            success: () => showSuccess('已复制到剪贴板')
          });
        } else if (res.tapIndex === 1) {
          // 生成海报 - 这里可以跳转到海报生成页面
          wx.navigateTo({
            url: `/pages/share/poster?quote=${encodeURIComponent(quote)}`
          });
        }
      }
    });
  },

  // 点击天气卡片
  onWeatherTap() {
    hapticFeedback();
    if (this.data.weather) {
      // 显示详细天气信息
      const { weather } = this.data;
      wx.showModal({
        title: '天气详情',
        content: `位置：${weather.locationName}\n天气：${weather.summary}\n温度：${weather.temperatureC}°C\n体感：${weather.feelsLikeC}°C\n湿度：${weather.humidity}%`,
        showCancel: false
      });
    } else {
      // 重新获取天气
      this.getWeatherData();
    }
  },

  // 点击热门帖子
  onHotPostTap(e) {
    const { id } = e.currentTarget.dataset;
    hapticFeedback();
    wx.navigateTo({
      url: `/pages/message-wall/detail?id=${id}`
    });
  },

  // 点击登录/个人信息
  onUserInfoTap() {
    hapticFeedback();
    if (this.data.isLoggedIn) {
      wx.switchTab({ url: '/pages/profile/index' });
    } else {
      wx.navigateTo({ url: '/pages/auth/login' });
    }
  },

  // 请求位置权限
  requestLocationPermission() {
    wx.showModal({
      title: '位置权限',
      content: '需要您的位置信息来获取准确的天气数据，是否前往设置开启位置权限？',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.userLocation']) {
                this.getWeatherData();
              }
            }
          });
        }
      }
    });
  },

  // 长按事件 - 开发者选项
  onLongPress() {
    if (getCurrentPages().length === 1) {
      // 只有在首页时才显示开发者选项
      wx.showActionSheet({
        itemList: ['开发者工具', '清除缓存', '关于应用'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.navigateTo({ url: '/pages/dev-tools/index' });
          } else if (res.tapIndex === 1) {
            this.clearCache();
          } else if (res.tapIndex === 2) {
            wx.navigateTo({ url: '/pages/about/index' });
          }
        }
      });
    }
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除应用缓存吗？这将清除除登录状态外的所有本地数据。',
      success: (res) => {
        if (res.confirm) {
          // 保存token
          const token = wx.getStorageSync('token');
          
          // 清除所有存储
          wx.clearStorageSync();
          
          // 恢复token
          if (token) {
            wx.setStorageSync('token', token);
          }
          
          // 重新加载页面
          showSuccess('缓存已清除');
          setTimeout(() => {
            this.initPage();
          }, 1000);
        }
      }
    });
  },

  // 分享给朋友
  onShareAppMessage() {
    const quote = this.data.dailyQuote;
    return {
      title: quote || 'kimochi心晴 - 关照情绪，连接彼此',
      path: '/pages/home/index',
      imageUrl: '/assets/share/default.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const quote = this.data.dailyQuote;
    return {
      title: quote || 'kimochi心晴 - 关照情绪，连接彼此',
      path: '/pages/home/index',
      imageUrl: '/assets/share/timeline.png'
    };
  }
});
