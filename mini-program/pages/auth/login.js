// pages/auth/login.js
const { ApiService } = require('../../utils/api');
const { showError, showSuccess, hapticFeedback, showLoading, hideLoading } = require('../../utils/util');

Page({
  data: {
    isLoading: false,
    hasUserInfo: false,
    userInfo: null,
    bindMode: false, // 是否为绑定模式
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
  },

  // 微信登录
  async onWeChatLogin() {
    if (this.data.isLoading) return;
    
    hapticFeedback();
    this.setData({ isLoading: true });

    try {
      // 1. 获取微信登录码
      const loginRes = await this.getWxLoginCode();
      
      // 2. 获取用户信息
      const userInfo = await this.getUserProfile();
      
      // 3. 调用后端API
      const response = await ApiService.auth.wxLogin(loginRes.code, userInfo);
      
      if (response.needBind) {
        // 需要绑定现有账号
        this.setData({
          bindMode: true,
          hasUserInfo: true,
          userInfo: userInfo.userInfo
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

  // 获取微信登录码
  getWxLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      });
    });
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: resolve,
        fail: reject
      });
    });
  },

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
    wx.showModal({
      title: '注册新账号',
      content: '建议前往网页版注册新账号，获得完整功能体验',
      showCancel: true,
      cancelText: '取消',
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
