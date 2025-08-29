// 手势和触控优化工具

class GestureManager {
  constructor() {
    this.touchStartTime = 0;
    this.touchStartPosition = { x: 0, y: 0 };
    this.touchEndPosition = { x: 0, y: 0 };
    this.isLongPress = false;
    this.longPressTimer = null;
    
    // 手势配置
    this.config = {
      longPressTime: 500,
      swipeThreshold: 50,
      tapMaxTime: 300,
      tapMaxDistance: 10
    };
  }

  // 触摸开始
  onTouchStart(e) {
    this.touchStartTime = Date.now();
    this.touchStartPosition = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    this.isLongPress = false;
    
    // 启动长按计时器
    this.longPressTimer = setTimeout(() => {
      this.isLongPress = true;
      this.triggerLongPress(e);
    }, this.config.longPressTime);
  }

  // 触摸移动
  onTouchMove(e) {
    const currentPosition = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    
    const distance = this.calculateDistance(this.touchStartPosition, currentPosition);
    
    // 如果移动距离超过阈值，取消长按
    if (distance > this.config.tapMaxDistance) {
      this.cancelLongPress();
    }
    
    this.touchEndPosition = currentPosition;
  }

  // 触摸结束
  onTouchEnd(e) {
    const touchTime = Date.now() - this.touchStartTime;
    const distance = this.calculateDistance(this.touchStartPosition, this.touchEndPosition);
    
    this.cancelLongPress();
    
    // 判断手势类型
    if (!this.isLongPress) {
      if (touchTime < this.config.tapMaxTime && distance < this.config.tapMaxDistance) {
        this.triggerTap(e);
      } else if (distance > this.config.swipeThreshold) {
        this.triggerSwipe(e);
      }
    }
  }

  // 取消长按
  cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // 计算距离
  calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 触发点击
  triggerTap(e) {
    // 添加点击反馈动画
    const target = e.currentTarget;
    if (target) {
      this.addTapFeedback(target);
    }
    
    // 触发振动反馈
    this.hapticFeedback('light');
  }

  // 触发长按
  triggerLongPress(e) {
    console.log('长按手势触发');
    
    // 触发强振动反馈
    this.hapticFeedback('medium');
  }

  // 触发滑动
  triggerSwipe(e) {
    const dx = this.touchEndPosition.x - this.touchStartPosition.x;
    const dy = this.touchEndPosition.y - this.touchStartPosition.y;
    
    let direction = '';
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }
    
    console.log(`滑动手势: ${direction}`);
    
    // 根据滑动方向执行相应操作
    this.handleSwipe(direction, e);
  }

  // 处理滑动操作
  handleSwipe(direction, e) {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    switch (direction) {
      case 'right':
        // 右滑返回 (如果不是首页)
        if (pages.length > 1 && !this.isTabBarPage(currentPage.route)) {
          wx.navigateBack();
        }
        break;
        
      case 'left':
        // 左滑可以实现其他功能
        break;
        
      case 'up':
        // 上滑刷新或加载更多
        if (currentPage.onReachBottom) {
          currentPage.onReachBottom();
        }
        break;
        
      case 'down':
        // 下拉刷新
        if (currentPage.onPullDownRefresh) {
          currentPage.onPullDownRefresh();
        }
        break;
    }
  }

  // 判断是否是TabBar页面
  isTabBarPage(route) {
    const tabBarPages = [
      'pages/home/index',
      'pages/assessments/index',
      'pages/message-wall/index',
      'pages/messages/index',
      'pages/profile/index'
    ];
    
    return tabBarPages.includes(route);
  }

  // 添加点击反馈效果
  addTapFeedback(element) {
    if (!element) return;
    
    // 添加CSS类进行动画反馈
    const classList = element.classList || [];
    if (!classList.includes('tap-feedback')) {
      element.classList.add('tap-feedback');
    }
    
    // 临时添加按下效果
    element.classList.add('tapped');
    setTimeout(() => {
      element.classList.remove('tapped');
    }, 150);
  }

  // 触觉反馈
  hapticFeedback(type = 'light') {
    try {
      switch (type) {
        case 'light':
          wx.vibrateShort({ type: 'light' });
          break;
        case 'medium':
          wx.vibrateShort({ type: 'medium' });
          break;
        case 'heavy':
          wx.vibrateShort({ type: 'heavy' });
          break;
        default:
          wx.vibrateShort();
      }
    } catch (error) {
      // 某些设备可能不支持振动
      console.log('振动反馈不可用');
    }
  }
}

// 全局手势管理器实例
const gestureManager = new GestureManager();

// 为页面添加手势支持的混入函数
const withGestures = (pageOptions) => {
  const originalOnLoad = pageOptions.onLoad || (() => {});
  
  pageOptions.onLoad = function(...args) {
    // 绑定手势事件
    this.onTouchStart = (e) => gestureManager.onTouchStart(e);
    this.onTouchMove = (e) => gestureManager.onTouchMove(e);
    this.onTouchEnd = (e) => gestureManager.onTouchEnd(e);
    
    return originalOnLoad.call(this, ...args);
  };
  
  return pageOptions;
};

// 快速手势配置
const QuickGestures = {
  // 为元素添加点击波纹效果
  addRipple(selector) {
    const query = wx.createSelectorQuery();
    query.select(selector).boundingClientRect();
    query.exec((res) => {
      if (res[0]) {
        res[0].classList?.add('ripple');
      }
    });
  },

  // 为列表项添加滑动删除
  addSwipeDelete(selector, deleteCallback) {
    // 实现滑动删除功能
    console.log(`为 ${selector} 添加滑动删除功能`);
  },

  // 添加下拉刷新增强
  enhancePullRefresh(page) {
    const originalOnPullDownRefresh = page.onPullDownRefresh || (() => {});
    
    page.onPullDownRefresh = function() {
      // 添加刷新动画
      this.setData({ isRefreshing: true });
      
      const result = originalOnPullDownRefresh.call(this);
      
      // 确保动画至少显示1秒
      setTimeout(() => {
        this.setData({ isRefreshing: false });
        wx.stopPullDownRefresh();
      }, 1000);
      
      return result;
    };
  }
};

module.exports = {
  gestureManager,
  withGestures,
  QuickGestures,
  GestureManager
};
