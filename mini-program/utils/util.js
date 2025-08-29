// 工具函数集合

/**
 * 格式化时间
 */
const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`;
};

/**
 * 相对时间格式化
 */
const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  } else {
    return formatDate(date);
  }
};

/**
 * 格式化日期
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

/**
 * 数字补零
 */
const formatNumber = (n) => {
  n = n.toString();
  return n[1] ? n : `0${n}`;
};

/**
 * 防抖函数
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 */
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 深拷贝
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const copy = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone(obj[key]);
    });
    return copy;
  }
};

/**
 * 生成随机字符串
 */
const randomString = (length = 8) => {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

/**
 * 验证邮箱格式
 */
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * 验证手机号格式
 */
const validatePhone = (phone) => {
  const re = /^1[3-9]\d{9}$/;
  return re.test(phone);
};

/**
 * 显示成功提示
 */
const showSuccess = (title, duration = 2000) => {
  wx.showToast({
    title,
    icon: 'success',
    duration
  });
};

/**
 * 显示错误提示
 */
const showError = (title, duration = 2000) => {
  wx.showToast({
    title,
    icon: 'none',
    duration
  });
};

/**
 * 显示加载中
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  });
};

/**
 * 隐藏加载
 */
const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 确认对话框
 */
const showConfirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success(res) {
        resolve(res.confirm);
      }
    });
  });
};

/**
 * 获取用户位置
 */
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: resolve,
      fail: reject
    });
  });
};

/**
 * 选择图片
 */
const chooseImage = (count = 1, sizeType = ['compressed'], sourceType = ['album', 'camera']) => {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count,
      sizeType,
      sourceType,
      success: resolve,
      fail: reject
    });
  });
};

/**
 * 预览图片
 */
const previewImage = (current, urls) => {
  wx.previewImage({
    current,
    urls
  });
};

/**
 * 保存图片到相册
 */
const saveImageToPhotosAlbum = (filePath) => {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: reject
    });
  });
};

/**
 * 复制到剪贴板
 */
const setClipboardData = (data) => {
  wx.setClipboardData({
    data,
    success: () => {
      showSuccess('已复制到剪贴板');
    }
  });
};

/**
 * 分享到朋友圈
 */
const shareToTimeline = (title, path, imageUrl) => {
  return {
    title,
    path,
    imageUrl
  };
};

/**
 * 分享给朋友
 */
const shareToFriend = (title, path, imageUrl) => {
  return {
    title,
    path,
    imageUrl
  };
};

/**
 * 震动反馈
 */
const vibrateShort = () => {
  wx.vibrateShort({
    type: 'light'
  });
};

/**
 * 触觉反馈
 */
const hapticFeedback = (type = 'light') => {
  if (wx.getSystemInfoSync().platform === 'ios') {
    wx.vibrateShort({ type });
  }
};

/**
 * 扫码
 */
const scanCode = (onlyFromCamera = true, scanType = ['qrCode']) => {
  return new Promise((resolve, reject) => {
    wx.scanCode({
      onlyFromCamera,
      scanType,
      success: resolve,
      fail: reject
    });
  });
};

/**
 * 获取系统信息
 */
const getSystemInfo = () => {
  return wx.getSystemInfoSync();
};

/**
 * 检查更新
 */
const checkForUpdate = () => {
  if (wx.canIUse('getUpdateManager')) {
    const updateManager = wx.getUpdateManager();
    
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        updateManager.onUpdateReady(() => {
          wx.showModal({
            title: '更新提示',
            content: '新版本已经准备好，是否重启应用？',
            success(res) {
              if (res.confirm) {
                updateManager.applyUpdate();
              }
            }
          });
        });
        
        updateManager.onUpdateFailed(() => {
          wx.showModal({
            title: '更新失败',
            content: '新版本下载失败，请检查网络后重试。',
            showCancel: false
          });
        });
      }
    });
  }
};

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * URL参数解析
 */
const parseQuery = (url) => {
  const query = {};
  const search = url.split('?')[1];
  if (search) {
    search.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
  }
  return query;
};

module.exports = {
  formatTime,
  formatRelativeTime,
  formatDate,
  formatNumber,
  debounce,
  throttle,
  deepClone,
  randomString,
  validateEmail,
  validatePhone,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  showConfirm,
  getCurrentLocation,
  chooseImage,
  previewImage,
  saveImageToPhotosAlbum,
  setClipboardData,
  shareToTimeline,
  shareToFriend,
  vibrateShort,
  hapticFeedback,
  scanCode,
  getSystemInfo,
  checkForUpdate,
  formatFileSize,
  parseQuery
};