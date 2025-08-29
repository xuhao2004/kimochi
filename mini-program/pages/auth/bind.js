// pages/auth/bind.js
const { ApiService } = require('../../utils/api');
const { showError, showSuccess, hapticFeedback, showConfirm } = require('../../utils/util');

Page({
  data: {
    bindType: '', // email 或 phone
    step: 1, // 1: 输入信息, 2: 验证码, 3: 完成
    isLoading: false,
    
    // 表单数据
    form: {
      email: '',
      phone: '',
      verificationCode: '',
      password: ''
    },
    
    // UI状态
    countdown: 0,
    canSendCode: true,
    showPassword: false,
    
    // 微信用户信息
    wechatInfo: null,
    
    // 绑定选项
    bindOptions: [
      {
        id: 'email',
        title: '邮箱绑定',
        desc: '使用邮箱账号绑定微信',
        icon: '📧',
        color: '#007AFF'
      },
      {
        id: 'phone',
        title: '手机绑定', 
        desc: '使用手机号绑定微信',
        icon: '📱',
        color: '#34C759'
      }
    ]
  },

  onLoad(options) {
    const { type } = options;
    if (type) {
      this.setData({ 
        bindType: type,
        step: 1 
      });
    }
    
    this.getWechatUserInfo();
  },

  // 获取微信用户信息
  async getWechatUserInfo() {
    try {
      // 获取微信登录状态
      const loginResult = await wx.checkSession();
      
      wx.getUserProfile({
        desc: '用于账号绑定',
        success: (res) => {
          this.setData({
            wechatInfo: {
              nickName: res.userInfo.nickName,
              avatarUrl: res.userInfo.avatarUrl
            }
          });
        },
        fail: (error) => {
          console.log('获取用户信息失败:', error);
        }
      });
    } catch (error) {
      console.log('微信登录状态检查失败:', error);
    }
  },

  // 选择绑定类型
  onBindTypeTap(e) {
    const { option } = e.currentTarget.dataset;
    hapticFeedback();
    
    this.setData({
      bindType: option.id,
      step: 1
    });
  },

  // 输入框变化
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`form.${field}`]: value
    });
  },

  // 密码显示切换
  onPasswordToggle() {
    hapticFeedback();
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 发送验证码
  async onSendCode() {
    const { bindType, form } = this.data;
    
    if (!this.data.canSendCode) return;
    
    // 验证输入
    if (bindType === 'email' && !this.validateEmail(form.email)) {
      showError('请输入正确的邮箱地址');
      return;
    }
    
    if (bindType === 'phone' && !this.validatePhone(form.phone)) {
      showError('请输入正确的手机号');
      return;
    }
    
    hapticFeedback();
    
    try {
      this.setData({ isLoading: true });
      
      const target = bindType === 'email' ? form.email : form.phone;
      
      // TODO: 调用发送验证码API
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      
      showSuccess('验证码已发送');
      this.startCountdown();
      this.setData({ step: 2 });
      
    } catch (error) {
      showError(error.message || '发送验证码失败');
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 开始倒计时
  startCountdown() {
    this.setData({ 
      countdown: 60,
      canSendCode: false 
    });
    
    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({
          countdown: 0,
          canSendCode: true
        });
      } else {
        this.setData({ countdown });
      }
    }, 1000);
  },

  // 验证码输入完成
  onCodeComplete(e) {
    const { value } = e.detail;
    this.setData({
      'form.verificationCode': value
    });
    
    // 自动验证
    if (value.length === 6) {
      this.verifyCode();
    }
  },

  // 验证验证码
  async verifyCode() {
    const { form } = this.data;
    
    if (!form.verificationCode || form.verificationCode.length !== 6) {
      showError('请输入6位验证码');
      return;
    }
    
    try {
      this.setData({ isLoading: true });
      
      // TODO: 调用验证码验证API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess('验证码正确');
      this.setData({ step: 3 });
      
    } catch (error) {
      showError(error.message || '验证码错误');
      this.setData({
        'form.verificationCode': ''
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 完成绑定
  async onCompleteBind() {
    const { bindType, form, wechatInfo } = this.data;
    
    if (!form.password || form.password.length < 6) {
      showError('请输入至少6位密码');
      return;
    }
    
    try {
      this.setData({ isLoading: true });
      
      const bindData = {
        type: bindType,
        target: bindType === 'email' ? form.email : form.phone,
        verificationCode: form.verificationCode,
        password: form.password,
        wechatInfo
      };
      
      // TODO: 调用账号绑定API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showSuccess('绑定成功');
      
      // 延迟跳转
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      showError(error.message || '绑定失败');
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 返回上一步
  onPrevStep() {
    const { step } = this.data;
    
    if (step > 1) {
      hapticFeedback();
      this.setData({ step: step - 1 });
    }
  },

  // 重新选择绑定类型
  onResetBindType() {
    hapticFeedback();
    this.setData({
      bindType: '',
      step: 1,
      form: {
        email: '',
        phone: '',
        verificationCode: '',
        password: ''
      }
    });
  },

  // 验证邮箱格式
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 验证手机号格式
  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // 跳过绑定
  onSkipBind() {
    wx.showModal({
      title: '跳过绑定',
      content: '跳过绑定后，部分功能可能无法使用。您可以稍后在设置中进行绑定。',
      confirmText: '仍要跳过',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },

  // 用户协议
  onAgreementTap() {
    wx.showModal({
      title: '用户协议',
      content: '请查看完整的用户协议和隐私政策以了解详细条款。\n\n点击"查看详情"将复制协议链接到剪贴板。',
      confirmText: '查看详情',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'https://47.104.8.84/terms',
            success: () => showSuccess('协议链接已复制')
          });
        }
      }
    });
  },

  // 获取帮助
  onGetHelp() {
    wx.showActionSheet({
      itemList: ['联系客服', '常见问题', '操作指南'],
      success: (res) => {
        if (res.tapIndex === 0) {
          showSuccess('客服功能开发中');
        } else if (res.tapIndex === 1) {
          showSuccess('帮助文档开发中');
        } else if (res.tapIndex === 2) {
          showSuccess('操作指南开发中');
        }
      }
    });
  }
});