// API 配置和工具函数
// 为避免循环引用，延迟加载性能模块
let performance = null;
let errorManager = null;

function getPerformanceModules() {
  if (!performance || !errorManager) {
    try {
      const perfModule = require('./performance');
      performance = perfModule.performance;
      errorManager = perfModule.errorManager;
    } catch (error) {
      console.log('性能模块加载失败，使用简化版本');
      performance = {
        getCache: () => null,
        setCache: () => {},
        clearCache: () => {},
        dedupeRequest: (key, fn) => fn(),
        metrics: { apiCalls: 0, errors: 0 }
      };
      errorManager = {
        handleError: (error, context, options) => ({ success: false, error })
      };
    }
  }
  return { performance, errorManager };
}

// 环境配置
const ENVIRONMENT = {
  development: {
    baseURL: 'http://localhost:3001', // 本地开发服务器
    name: '开发环境'
  },
  production: {
    baseURL: 'https://47.104.8.84', // 生产服务器
    name: '生产环境'
  }
};

// 自动检测环境
function getEnvironment() {
  // 开发模式下默认使用开发环境，除非手动切换
  let env = wx.getStorageSync('miniprogram_env');
  
  // 如果没有设置环境，根据开发工具判断
  if (!env) {
    try {
      const accountInfo = wx.getAccountInfoSync();
      // 在开发工具中默认使用开发环境
      if (accountInfo.miniProgram.envVersion === 'develop') {
        env = 'development';
        wx.setStorageSync('miniprogram_env', env);
        console.log('🔧 自动设置为开发环境');
      } else {
        env = 'production';
      }
    } catch (error) {
      env = 'production'; // 临时使用生产环境，确保API可用
      wx.setStorageSync('miniprogram_env', env);
    }
  }
  
  console.log(`🌐 当前环境: ${env}`);
  return ENVIRONMENT[env] || ENVIRONMENT.development;
}

const currentEnv = getEnvironment();
const API_BASE_URL = currentEnv.baseURL;

class API {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = wx.getStorageSync('token') || '';
    this.currentEnv = currentEnv;
    
    // 开发环境提示
    if (this.currentEnv.baseURL.includes('localhost')) {
      console.log(`🔧 小程序运行在${this.currentEnv.name}: ${this.baseURL}`);
    }
  }
  
  // 切换环境
  switchEnvironment(env = 'production') {
    wx.setStorageSync('miniprogram_env', env);
    wx.showModal({
      title: '环境切换',
      content: `已切换到${ENVIRONMENT[env].name}，请重启小程序生效`,
      showCancel: false
    });
  }
  
  // 获取当前环境信息
  getEnvInfo() {
    return {
      ...this.currentEnv,
      isDevelopment: this.baseURL.includes('localhost')
    };
  }

  // 设置token
  setToken(token) {
    this.token = token;
    wx.setStorageSync('token', token);
  }

  // 清除token
  clearToken() {
    this.token = '';
    wx.removeStorageSync('token');
  }

  // 请求拦截器
  async request(options) {
    const {
      url,
      method = 'GET',
      data = {},
      header = {},
      showLoading = true,
      loadingText = '加载中...',
      cache = false,
      cacheTTL = 5 * 60 * 1000, // 5分钟缓存
      enableRetry = true
    } = options;

    // 生成缓存键
    const cacheKey = cache ? `${method}:${url}:${JSON.stringify(data)}` : null;
    
    // 检查缓存
    if (cache && method === 'GET') {
      const cached = performance.getCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 请求去重
    const requestKey = `${method}:${url}:${JSON.stringify(data)}`;
    
    try {
      const { performance, errorManager } = getPerformanceModules();
      
      const response = await performance.dedupeRequest(requestKey, async () => {
        performance.metrics.apiCalls++;

        if (showLoading) {
          wx.showLoading({ title: loadingText, mask: true });
        }

        const requestHeader = {
          'Content-Type': 'application/json',
          ...header
        };

        if (this.token) {
          requestHeader['Authorization'] = `Bearer ${this.token}`;
        }

        const requestPromise = new Promise((resolve, reject) => {
          wx.request({
            url: `${this.baseURL}${url}`,
            method,
            data,
            header: requestHeader,
            timeout: 10000,
            success: resolve,
            fail: reject
          });
        });

        const response = await requestPromise;

        if (showLoading) {
          wx.hideLoading();
        }

        const { statusCode, data: responseData } = response;
        
        // 处理认证错误
        if (statusCode === 401) {
          const authError = new Error('Unauthorized');
          authError.statusCode = 401;
          throw authError;
        }

        // 处理其他HTTP错误
        if (statusCode >= 400) {
          const error = new Error(responseData?.message || `请求失败 (${statusCode})`);
          error.statusCode = statusCode;
          error.responseData = responseData;
          throw error;
        }

        // 缓存成功响应
        if (cache && method === 'GET') {
          performance.setCache(cacheKey, responseData, cacheTTL);
        }

        return responseData;
      });

      return response;
    } catch (error) {
      if (showLoading) {
        wx.hideLoading();
      }

      const { performance, errorManager } = getPerformanceModules();
      
      performance.metrics.errors++;
      
      // 使用错误管理器处理错误
      const errorResult = await errorManager.handleError(error, `API ${method} ${url}`, {
        enableRetry,
        retryFn: enableRetry && !error.statusCode ? () => this.request(options) : null,
        silent: error.statusCode >= 400 // HTTP错误不重试
      });

      if (errorResult.needReauth) {
        // 清除缓存中的认证相关数据
        performance.clearCache('auth');
        performance.clearCache('user');
        this.clearToken();
      }

      throw error;
    }
  }

  // GET 请求
  get(url, options = {}) {
    return this.request({ url, method: 'GET', ...options });
  }

  // POST 请求
  post(url, data, options = {}) {
    return this.request({ url, method: 'POST', data, ...options });
  }

  // PUT 请求
  put(url, data, options = {}) {
    return this.request({ url, method: 'PUT', data, ...options });
  }

  // DELETE 请求
  delete(url, options = {}) {
    return this.request({ url, method: 'DELETE', ...options });
  }

  // 文件上传
  async upload(filePath, name = 'file', formData = {}) {
    wx.showLoading({ title: '上传中...', mask: true });

    try {
      const response = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${this.baseURL}/api/upload`,
          filePath,
          name,
          formData,
          header: {
            'Authorization': this.token ? `Bearer ${this.token}` : ''
          },
          success: resolve,
          fail: reject
        });
      });

      wx.hideLoading();

      const { statusCode, data } = response;
      const responseData = JSON.parse(data);

      if (statusCode >= 400) {
        const errorMsg = responseData?.message || `上传失败 (${statusCode})`;
        wx.showToast({ title: errorMsg, icon: 'none' });
        throw new Error(errorMsg);
      }

      return responseData;
    } catch (error) {
      wx.hideLoading();
      if (error.errMsg) {
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
      throw error;
    }
  }
}

// 创建单例实例
const api = new API();

// 具体API方法
const ApiService = {
  // 用户认证
  auth: {
    // 微信登录
    wxLogin: (code, userInfo) => api.post('/api/auth/weapp-login', { code, userInfo }),
    
    // 绑定账号
    bindAccount: (email, password) => api.post('/api/auth/bind-account', { email, password }),
    
    // 获取用户信息
    getProfile: () => api.get('/api/auth/profile'),
    
    // 更新用户信息
    updateProfile: (data) => api.put('/api/auth/profile', data),
    
    // 登出
    logout: () => api.post('/api/auth/logout')
  },

  // 首页相关
  home: {
    // 获取首页数据
    getHomeData: () => api.get('/api/home/data'),
    
    // 获取今日心语
    getDailyQuote: () => api.get('/api/daily'),
    
    // 获取天气信息
    getWeather: (lat, lng) => api.get(`/api/weather?lat=${lat}&lng=${lng}`),
    
    // 获取热门帖子
    getHotPosts: () => api.get('/api/posts/hot?limit=3')
  },

  // 心理测评
  assessments: {
    // 获取测评列表
    getList: () => api.get('/api/assessments'),
    
    // 获取测评详情
    getDetail: (id) => api.get(`/api/assessments/${id}`),
    
    // 提交测评
    submit: (id, answers) => api.post(`/api/assessments/${id}/submit`, { answers }),
    
    // 获取测评历史
    getHistory: () => api.get('/api/assessments/history'),
    
    // 获取测评结果
    getResult: (id) => api.get(`/api/assessments/results/${id}`)
  },

  // 心情墙
  wall: {
    // 获取帖子列表
    getPosts: (page = 1, limit = 10) => api.get(`/api/posts?page=${page}&limit=${limit}`),
    
    // 创建帖子
    createPost: (data) => api.post('/api/posts', data),
    
    // 获取帖子详情
    getPost: (id) => api.get(`/api/posts/${id}`),
    
    // 点赞/取消点赞
    toggleLike: (id) => api.post(`/api/posts/${id}/like`),
    
    // 删除帖子
    deletePost: (id) => api.delete(`/api/posts/${id}`)
  },

  // 消息系统
  messages: {
    // 获取聊天室列表
    getChatRooms: () => api.get('/api/messages/rooms'),
    
    // 获取聊天消息
    getMessages: (roomId, page = 1) => api.get(`/api/messages/${roomId}?page=${page}`),
    
    // 发送消息
    sendMessage: (roomId, data) => api.post(`/api/messages/${roomId}`, data),
    
    // 标记已读
    markAsRead: (roomId) => api.post(`/api/messages/${roomId}/read`),
    
    // 获取未读数量
    getUnreadCount: () => api.get('/api/messages/unread-count')
  },

  // 扫码登录
  scan: {
    // 确认登录
    confirmLogin: (qrId) => api.post('/api/auth/confirm-login', { qrId })
  },

  // 上传文件
  upload: (filePath, name, formData) => api.upload(filePath, name, formData)
};

// 环境管理工具
const EnvManager = {
  // 切换到开发环境
  switchToDevelopment() {
    api.switchEnvironment('development');
  },
  
  // 切换到生产环境
  switchToProduction() {
    api.switchEnvironment('production');
  },
  
  // 获取当前环境
  getCurrentEnv() {
    return api.getEnvInfo();
  },
  
  // 显示环境信息
  showEnvInfo() {
    const envInfo = api.getEnvInfo();
    wx.showModal({
      title: '环境信息',
      content: `当前环境: ${envInfo.name}\nAPI地址: ${envInfo.baseURL}`,
      showCancel: false
    });
  }
};

module.exports = {
  API,
  ApiService,
  api,
  EnvManager,
  ENVIRONMENT
};
