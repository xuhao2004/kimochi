// pages/scan/index.js
const { ApiService } = require('../../utils/api');
const { showError, showSuccess, hapticFeedback, showConfirm, scanCode } = require('../../utils/util');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    scanHistory: [],
    quickActions: [
      {
        id: 'qr-login',
        title: '扫码登录',
        desc: '扫描PC端登录二维码',
        icon: '🔑',
        color: '#007AFF',
        action: 'scanLogin'
      },
      {
        id: 'qr-code',
        title: '我的二维码',
        desc: '生成个人二维码',
        icon: '📱',
        color: '#5856D6',
        action: 'showMyQR'
      },
      {
        id: 'add-friend',
        title: '扫码加友',
        desc: '扫描好友二维码',
        icon: '👥',
        color: '#34C759',
        action: 'scanAddFriend'
      },
      {
        id: 'join-group',
        title: '加入群聊',
        desc: '扫描群聊二维码',
        icon: '🎭',
        color: '#FF9500',
        action: 'scanJoinGroup'
      }
    ]
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    this.loadScanHistory();
  },

  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      try {
        const userInfo = await ApiService.auth.getProfile();
        this.setData({
          isLoggedIn: true,
          userInfo
        });
      } catch (error) {
        this.setData({
          isLoggedIn: false,
          userInfo: null
        });
      }
    }
  },

  loadScanHistory() {
    // 从本地存储加载扫码历史
    try {
      const history = wx.getStorageSync('scan_history') || [];
      this.setData({
        scanHistory: history.slice(0, 5) // 只显示最近5条
      });
    } catch (error) {
      console.error('加载扫码历史失败:', error);
    }
  },

  saveScanHistory(type, data) {
    try {
      const history = wx.getStorageSync('scan_history') || [];
      const newRecord = {
        id: Date.now(),
        type,
        data,
        time: new Date().toISOString(),
        success: true
      };
      
      history.unshift(newRecord);
      // 保留最近20条记录
      if (history.length > 20) {
        history.splice(20);
      }
      
      wx.setStorageSync('scan_history', history);
      this.loadScanHistory();
    } catch (error) {
      console.error('保存扫码历史失败:', error);
    }
  },

  // 快捷操作点击
  onActionTap(e) {
    const { action } = e.currentTarget.dataset;
    hapticFeedback();
    
    if (!this.data.isLoggedIn && action !== 'scanLogin') {
      this.showLoginPrompt();
      return;
    }
    
    switch (action) {
      case 'scanLogin':
        this.scanLogin();
        break;
      case 'showMyQR':
        this.showMyQRCode();
        break;
      case 'scanAddFriend':
        this.scanAddFriend();
        break;
      case 'scanJoinGroup':
        this.scanJoinGroup();
        break;
      default:
        this.startGeneralScan();
    }
  },

  // 扫码登录
  async scanLogin() {
    try {
      const result = await scanCode(true, ['qrCode']);
      const qrContent = result.result;
      
      console.log('扫码结果:', qrContent);
      
      // 验证是否是登录二维码
      if (!qrContent.includes('kimochi-login:') && !qrContent.includes('47.104.8.84')) {
        showError('这不是有效的登录二维码');
        return;
      }
      
      // 解析二维码内容
      let qrId = '';
      if (qrContent.includes('kimochi-login:')) {
        qrId = qrContent.replace('kimochi-login:', '');
      } else {
        // 从URL中提取qrId
        const url = new URL(qrContent);
        qrId = url.searchParams.get('qrId') || url.pathname.split('/').pop();
      }
      
      if (!qrId) {
        showError('二维码格式错误');
        return;
      }
      
      // 确认登录
      const confirm = await showConfirm(
        `确认在PC端登录？\n\n设备信息：网页浏览器\n时间：${new Date().toLocaleString()}`
      );
      
      if (!confirm) return;
      
      // 调用确认登录API
      await ApiService.scan.confirmLogin(qrId);
      
      showSuccess('登录确认成功');
      
      // 保存扫码历史
      this.saveScanHistory('login', {
        qrId,
        device: 'PC浏览器',
        time: new Date().toLocaleString()
      });
      
    } catch (error) {
      console.error('扫码登录失败:', error);
      if (error.errMsg && error.errMsg.includes('cancel')) {
        return; // 用户取消扫码
      }
      showError(error.message || '登录确认失败');
    }
  },

  // 显示我的二维码
  showMyQRCode() {
    if (!this.data.isLoggedIn) {
      this.showLoginPrompt();
      return;
    }
    
    wx.navigateTo({
      url: '/pages/qr-code/my'
    });
  },

  // 扫码加好友
  async scanAddFriend() {
    try {
      const result = await scanCode(true, ['qrCode']);
      const qrContent = result.result;
      
      console.log('好友二维码:', qrContent);
      
      // 验证是否是好友二维码
      if (!qrContent.includes('kimochi-user:') && !qrContent.includes('user=')) {
        showError('这不是有效的好友二维码');
        return;
      }
      
      // 解析用户ID
      let userId = '';
      if (qrContent.includes('kimochi-user:')) {
        userId = qrContent.replace('kimochi-user:', '');
      } else {
        const url = new URL(qrContent);
        userId = url.searchParams.get('user');
      }
      
      if (!userId) {
        showError('二维码格式错误');
        return;
      }
      
      // 跳转到用户资料页
      wx.navigateTo({
        url: `/pages/user/profile?id=${userId}&action=add`
      });
      
      // 保存扫码历史
      this.saveScanHistory('add_friend', {
        userId,
        time: new Date().toLocaleString()
      });
      
    } catch (error) {
      console.error('扫码加好友失败:', error);
      if (error.errMsg && error.errMsg.includes('cancel')) {
        return;
      }
      showError('无法识别好友二维码');
    }
  },

  // 扫码加入群聊
  async scanJoinGroup() {
    try {
      const result = await scanCode(true, ['qrCode']);
      const qrContent = result.result;
      
      console.log('群聊二维码:', qrContent);
      
      // 验证是否是群聊二维码
      if (!qrContent.includes('kimochi-group:') && !qrContent.includes('group=')) {
        showError('这不是有效的群聊二维码');
        return;
      }
      
      // 解析群聊ID
      let groupId = '';
      if (qrContent.includes('kimochi-group:')) {
        groupId = qrContent.replace('kimochi-group:', '');
      } else {
        const url = new URL(qrContent);
        groupId = url.searchParams.get('group');
      }
      
      if (!groupId) {
        showError('二维码格式错误');
        return;
      }
      
      // 跳转到群聊信息页
      wx.navigateTo({
        url: `/pages/groups/info?id=${groupId}&action=join`
      });
      
      // 保存扫码历史
      this.saveScanHistory('join_group', {
        groupId,
        time: new Date().toLocaleString()
      });
      
    } catch (error) {
      console.error('扫码加群失败:', error);
      if (error.errMsg && error.errMsg.includes('cancel')) {
        return;
      }
      showError('无法识别群聊二维码');
    }
  },

  // 通用扫码
  async startGeneralScan() {
    try {
      const result = await scanCode(true, ['qrCode', 'barCode']);
      const content = result.result;
      
      console.log('扫码结果:', content);
      
      // 自动识别二维码类型
      if (content.includes('kimochi-login:') || content.includes('qrId=')) {
        // 登录二维码
        wx.showModal({
          title: '检测到登录二维码',
          content: '是否确认PC端登录？',
          success: (res) => {
            if (res.confirm) {
              this.handleLoginQR(content);
            }
          }
        });
      } else if (content.includes('kimochi-user:') || content.includes('user=')) {
        // 用户二维码
        this.handleUserQR(content);
      } else if (content.includes('kimochi-group:') || content.includes('group=')) {
        // 群聊二维码
        this.handleGroupQR(content);
      } else if (content.startsWith('http://') || content.startsWith('https://')) {
        // 网页链接
        this.handleWebLink(content);
      } else {
        // 其他内容
        this.handleOtherContent(content);
      }
      
    } catch (error) {
      console.error('扫码失败:', error);
      if (error.errMsg && error.errMsg.includes('cancel')) {
        return;
      }
      showError('扫码失败，请重试');
    }
  },

  handleWebLink(url) {
    wx.showModal({
      title: '检测到网页链接',
      content: url,
      confirmText: '复制链接',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: url,
            success: () => showSuccess('链接已复制到剪贴板')
          });
        }
      }
    });
  },

  handleOtherContent(content) {
    wx.showModal({
      title: '扫码结果',
      content: content,
      confirmText: '复制内容',
      cancelText: '确定',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: content,
            success: () => showSuccess('内容已复制到剪贴板')
          });
        }
      }
    });
  },

  // 扫码历史点击
  onHistoryTap(e) {
    const { item } = e.currentTarget.dataset;
    hapticFeedback();
    
    const typeNames = {
      'login': '登录确认',
      'add_friend': '添加好友',
      'join_group': '加入群聊',
      'other': '其他'
    };
    
    const typeName = typeNames[item.type] || '扫码记录';
    
    wx.showModal({
      title: typeName,
      content: `时间：${new Date(item.time).toLocaleString()}\n类型：${typeName}`,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 清除历史记录
  onClearHistory() {
    wx.showModal({
      title: '清除历史',
      content: '确定要清除所有扫码记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('scan_history');
          this.setData({ scanHistory: [] });
          showSuccess('历史记录已清除');
        }
      }
    });
  },

  // 权限说明
  onPermissionHelp() {
    wx.showModal({
      title: '相机权限说明',
      content: '扫码功能需要相机权限。如果无法使用，请在小程序设置中开启相机权限。',
      confirmText: '去设置',
      cancelText: '我知道了',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  // 登录提示
  showLoginPrompt() {
    wx.showModal({
      title: '需要登录',
      content: '登录后可以使用完整的扫码功能',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/auth/login' });
        }
      }
    });
  },

  // 点击登录
  onLogin() {
    hapticFeedback();
    wx.navigateTo({ url: '/pages/auth/login' });
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: 'kimochi心晴 - 扫码登录',
      path: '/pages/home/index',
      imageUrl: '/assets/share/scan.png'
    };
  }
});
