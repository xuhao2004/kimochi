// pages/auth/login.js
const { ApiService } = require('../../utils/api');
const { showError, showSuccess, hapticFeedback, showLoading, hideLoading } = require('../../utils/util');

Page({
  data: {
    loginMode: 'wechat', // 'wechat' | 'password'
    isLoading: false,
    hasUserInfo: false,
    userInfo: null,
    bindMode: false, // 是否为绑定模式
    
    // 账号密码登录表单
    loginForm: {
      email: '',
      password: ''
    },
    showLoginPassword: false,
    
    // 微信绑定表单
    bindForm: {
      email: '',
      password: ''
    },
    showPassword: false
  },

  onLoad(options) {
    // 检查是否为绑定模式
    if (options.bind === '1') {
      this.setData({ bindMode: true });
    }
    
    // 检查是否指定登录模式
    if (options.mode === 'password') {
      this.setData({ loginMode: 'password' });
    }
  },

  // 切换登录模式
  switchLoginMode(e) {
    const mode = e.currentTarget.dataset.mode;
    hapticFeedback();
    this.setData({ 
      loginMode: mode,
      // 清空表单数据
      loginForm: { email: '', password: '' }
    });
  },

  // 账号密码登录表单输入事件
  onLoginEmailInput(e) {
    this.setData({
      'loginForm.email': e.detail.value
    });
  },

  onLoginPasswordInput(e) {
    this.setData({
      'loginForm.password': e.detail.value
    });
  },

  onToggleLoginPassword() {
    hapticFeedback();
    this.setData({
      showLoginPassword: !this.data.showLoginPassword
    });
  },

  // 微信登录
  onWeChatLogin() {
    if (this.data.isLoading) return;
    
    hapticFeedback();
    this.setData({ isLoading: true });

    // 立即在用户点击时获取用户信息，避免异步延迟导致失效
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: async (userProfileRes) => {
        try {
          // 1. 获取微信登录码
          const loginRes = await this.getWxLoginCode();
          
          // 2. 调用后端API
          const response = await ApiService.auth.wxLogin(loginRes.code, userProfileRes);
          
          if (response.needBind) {
            // 需要绑定现有账号
            this.setData({
              bindMode: true,
              hasUserInfo: true,
              userInfo: userProfileRes.userInfo
            });
            showError('检测到您已有账号，请绑定现有账号');
          } else {
            // 登录成功
            ApiService.auth.setToken(response.token);
            showSuccess('登录成功');
            
            // 延迟跳转，让用户看到成功提示
            setTimeout(() => {
              this.navigateBack();
            }, 1500);
          }
        } catch (error) {
          console.error('微信登录失败:', error);
          showError(error.message || '登录失败，请重试');
        } finally {
          this.setData({ isLoading: false });
        }
      },
      fail: (error) => {
        console.error('获取用户信息失败:', error);
        showError('需要授权用户信息才能登录');
        this.setData({ isLoading: false });
      }
    });
  },

  // 账号密码登录
  async onPasswordLogin() {
    if (this.data.isLoading) return;
    
    const { loginForm } = this.data;
    
    // 表单验证
    if (!loginForm.email || !loginForm.password) {
      showError('请填写完整的登录信息');
      return;
    }
    
    // 简单的邮箱格式验证
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(loginForm.email)) {
      showError('请输入正确的邮箱格式');
      return;
    }
    
    hapticFeedback();
    this.setData({ isLoading: true });
    
    try {
      // 调用账号密码登录API
      const response = await ApiService.auth.login(loginForm.email, loginForm.password);
      
      if (response.success) {
        // 登录成功
        ApiService.auth.setToken(response.token);
        showSuccess('登录成功');
        
        // 通知全局状态更新
        const app = getApp();
        app.globalData.userInfo = response.user;
        app.globalData.isLoggedIn = true;
        
        // 延迟跳转
        setTimeout(() => {
          this.navigateBack();
        }, 1500);
      } else {
        showError(response.message || '登录失败');
      }
    } catch (error) {
      console.error('账号密码登录失败:', error);
      
      // 根据错误类型提供不同提示
      if (error.message.includes('401')) {
        showError('邮箱或密码错误');
      } else if (error.message.includes('网络')) {
        showError('网络连接失败，请检查网络后重试');
      } else {
        showError(error.message || '登录失败，请重试');
      }
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 获取微信登录码
  getWxLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      });
    });
  },

  // 注释：getUserProfile 方法已经被直接集成到 onWeChatLogin 中
  // 避免异步调用导致的用户手势失效问题

  // 账号绑定
  async onBindAccount() {
    const { bindForm } = this.data;
    
    // 验证表单
    if (!bindForm.email.trim()) {
      showError('请输入邮箱');
      return;
    }
    
    if (!bindForm.password.trim()) {
      showError('请输入密码');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bindForm.email)) {
      showError('请输入正确的邮箱格式');
      return;
    }

    if (this.data.isLoading) return;
    
    hapticFeedback();
    this.setData({ isLoading: true });

    try {
      const response = await ApiService.auth.bindAccount(
        bindForm.email,
        bindForm.password
      );
      
      // 绑定成功，保存token
      ApiService.auth.setToken(response.token);
      showSuccess('绑定成功');
      
      setTimeout(() => {
        this.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('账号绑定失败:', error);
      showError(error.message || '绑定失败，请检查邮箱和密码');
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 表单输入处理
  onEmailInput(e) {
    this.setData({
      'bindForm.email': e.detail.value
    });
  },

  onPasswordInput(e) {
    this.setData({
      'bindForm.password': e.detail.value
    });
  },

  // 切换密码显示
  onTogglePassword() {
    hapticFeedback();
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 忘记密码
  onForgotPassword() {
    wx.showModal({
      title: '忘记密码',
      content: '请前往网页版重置密码，或联系管理员协助处理',
      showCancel: true,
      cancelText: '取消',
      confirmText: '前往网页版',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'https://47.104.8.84',
            success: () => {
              showSuccess('网址已复制到剪贴板');
            }
          });
        }
      }
    });
  },

  // 切换到注册模式  
  onSwitchToRegister() {
    hapticFeedback();
    wx.showModal({
      title: '账号注册',
      content: '请在kimochi官网完成账号注册，注册后即可在小程序使用账号密码登录',
      confirmText: '前往官网', 
      cancelText: '稍后注册',
      confirmText: '前往注册',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'https://47.104.8.84/register',
            success: () => {
              showSuccess('注册链接已复制到剪贴板');
            }
          });
        }
      }
    });
  },

  // 返回处理
  navigateBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/home/index' });
    }
  },

  // 取消登录
  onCancel() {
    this.navigateBack();
  },

  // 服务条款
  onServiceTerms() {
    wx.navigateTo({
      url: '/pages/about/service-terms'
    });
  },

  // 隐私政策
  onPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/about/privacy'
    });
  },

  // 帮助支持
  onHelp() {
    wx.showActionSheet({
      itemList: ['使用帮助', '联系客服', '反馈问题'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({ url: '/pages/about/help' });
        } else if (res.tapIndex === 1) {
          this.contactSupport();
        } else if (res.tapIndex === 2) {
          this.submitFeedback();
        }
      }
    });
  },

  contactSupport() {
    wx.showModal({
      title: '联系客服',
      content: '客服邮箱：admin@kimochi.space\n\n请描述您遇到的问题，我们会尽快回复',
      showCancel: true,
      cancelText: '取消',
      confirmText: '复制邮箱',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'admin@kimochi.space',
            success: () => showSuccess('邮箱已复制')
          });
        }
      }
    });
  },

  submitFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/index'
    });
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: 'kimochi心晴 - 关照情绪，连接彼此',
      path: '/pages/home/index',
      imageUrl: '/assets/share/default.png'
    };
  }
});
