// pages/assessments/index.js
const { ApiService } = require('../../utils/api');
const { showError, showSuccess, hapticFeedback, showConfirm } = require('../../utils/util');

Page({
  data: {
    assessments: [],
    categories: [
      { id: 'personality', name: '人格测试', icon: '🧠', color: '#007AFF' },
      { id: 'emotion', name: '情绪评估', icon: '💝', color: '#5856D6' },
      { id: 'behavior', name: '行为分析', icon: '⚡', color: '#34C759' },
      { id: 'relationship', name: '关系评估', icon: '🤝', color: '#FF9500' }
    ],
    activeCategory: 'all',
    isLoading: true,
    isLoggedIn: false,
    userInfo: null,
    completedAssessments: new Set(), // 已完成的测评ID集合
    searchText: '',
    showSearch: false,
    filteredAssessments: []
  },

  onLoad() {
    this.checkLoginStatus();
    this.loadAssessments();
  },

  onShow() {
    // 刷新登录状态和已完成测评
    this.checkLoginStatus();
    this.loadCompletedAssessments();
  },

  onPullDownRefresh() {
    this.loadAssessments().finally(() => {
      wx.stopPullDownRefresh();
    });
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
        wx.removeStorageSync('token');
        this.setData({
          isLoggedIn: false,
          userInfo: null
        });
      }
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null
      });
    }
  },

  async loadAssessments() {
    try {
      this.setData({ isLoading: true });
      
      // 并行加载测评列表和已完成测评
      const [assessments] = await Promise.all([
        ApiService.assessments.getList(),
        this.data.isLoggedIn ? this.loadCompletedAssessments() : Promise.resolve()
      ]);

      // 处理测评数据
      const processedAssessments = assessments.map(item => ({
        ...item,
        _estimatedTime: this.formatEstimatedTime(item.estimatedMinutes),
        _difficulty: this.formatDifficulty(item.difficulty),
        _isCompleted: this.data.completedAssessments.has(item.id)
      }));

      this.setData({
        assessments: processedAssessments,
        filteredAssessments: processedAssessments
      });
    } catch (error) {
      console.error('加载测评失败:', error);
      showError('加载测评失败，请重试');
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async loadCompletedAssessments() {
    if (!this.data.isLoggedIn) return;
    
    try {
      const history = await ApiService.assessments.getHistory();
      const completedSet = new Set(history.map(item => item.assessmentId));
      this.setData({ completedAssessments: completedSet });
    } catch (error) {
      console.error('加载完成历史失败:', error);
    }
  },

  formatEstimatedTime(minutes) {
    if (minutes < 60) {
      return `${minutes}分钟`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`;
    }
  },

  formatDifficulty(difficulty) {
    const levels = {
      'easy': { text: '简单', color: '#34C759' },
      'medium': { text: '中等', color: '#FF9500' },
      'hard': { text: '困难', color: '#FF3B30' }
    };
    return levels[difficulty] || levels['medium'];
  },

  // 分类筛选
  onCategoryTap(e) {
    const { category } = e.currentTarget.dataset;
    hapticFeedback();
    
    this.setData({ activeCategory: category });
    this.filterAssessments();
  },

  filterAssessments() {
    const { assessments, activeCategory, searchText } = this.data;
    let filtered = assessments;

    // 分类筛选
    if (activeCategory !== 'all') {
      filtered = filtered.filter(item => item.category === activeCategory);
    }

    // 搜索筛选
    if (searchText.trim()) {
      const search = searchText.trim().toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search)
      );
    }

    this.setData({ filteredAssessments: filtered });
  },

  // 搜索功能
  onSearchToggle() {
    hapticFeedback();
    this.setData({ 
      showSearch: !this.data.showSearch,
      searchText: ''
    });
    if (!this.data.showSearch) {
      this.filterAssessments();
    }
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
    // 使用防抖处理搜索
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.filterAssessments();
    }, 300);
  },

  onSearchClear() {
    this.setData({ searchText: '' });
    this.filterAssessments();
  },

  // 开始测评
  async onAssessmentTap(e) {
    const { assessment } = e.currentTarget.dataset;
    hapticFeedback();

    if (!this.data.isLoggedIn) {
      const confirm = await showConfirm('需要登录后才能进行测评，是否前往登录？');
      if (confirm) {
        wx.navigateTo({ url: '/pages/auth/login' });
      }
      return;
    }

    // 检查是否已完成
    if (assessment._isCompleted) {
      const confirm = await showConfirm('您已经完成过这个测评，是否重新测试？重新测试会覆盖之前的结果。');
      if (!confirm) return;
    }

    wx.navigateTo({
      url: `/pages/assessments/detail?id=${assessment.id}`
    });
  },

  // 查看测评历史
  onHistoryTap() {
    hapticFeedback();
    
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/auth/login' });
      return;
    }

    wx.navigateTo({ url: '/pages/assessments/history' });
  },

  // 测评详情
  onAssessmentDetail(e) {
    const { assessment } = e.currentTarget.dataset;
    hapticFeedback();

    wx.showActionSheet({
      itemList: ['查看详情', '查看示例', '分享测评'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 查看详情
          this.showAssessmentDetail(assessment);
        } else if (res.tapIndex === 1) {
          // 查看示例题目
          this.showAssessmentSample(assessment);
        } else if (res.tapIndex === 2) {
          // 分享测评
          this.shareAssessment(assessment);
        }
      }
    });
  },

  showAssessmentDetail(assessment) {
    wx.showModal({
      title: assessment.title,
      content: `${assessment.description}\n\n预计用时：${assessment._estimatedTime}\n难度级别：${assessment._difficulty.text}\n题目数量：${assessment.questionCount || 0}题`,
      showCancel: false,
      confirmText: '开始测评',
      success: (res) => {
        if (res.confirm) {
          this.onAssessmentTap({ currentTarget: { dataset: { assessment } } });
        }
      }
    });
  },

  async showAssessmentSample(assessment) {
    try {
      wx.showLoading({ title: '加载中...' });
      const detail = await ApiService.assessments.getDetail(assessment.id);
      wx.hideLoading();

      if (detail.questions && detail.questions.length > 0) {
        const sampleQuestion = detail.questions[0];
        wx.showModal({
          title: '示例题目',
          content: sampleQuestion.question,
          showCancel: false,
          confirmText: '开始测评'
        });
      } else {
        showError('暂无示例题目');
      }
    } catch (error) {
      wx.hideLoading();
      showError('加载示例失败');
    }
  },

  shareAssessment(assessment) {
    // 生成分享内容
    const shareData = {
      title: `${assessment.title} - kimochi心晴心理测评`,
      path: `/pages/assessments/index?id=${assessment.id}`,
      imageUrl: assessment.thumbnail || '/assets/share/assessment.png'
    };

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    return shareData;
  },

  // 快速筛选
  onQuickFilter() {
    wx.showActionSheet({
      itemList: ['显示全部', '仅显示未完成', '仅显示已完成', '按时间排序', '按难度排序'],
      success: (res) => {
        const { assessments } = this.data;
        let filtered = [...assessments];

        switch (res.tapIndex) {
          case 0: // 显示全部
            break;
          case 1: // 仅显示未完成
            filtered = filtered.filter(item => !item._isCompleted);
            break;
          case 2: // 仅显示已完成
            filtered = filtered.filter(item => item._isCompleted);
            break;
          case 3: // 按时间排序
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
          case 4: // 按难度排序
            const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
            filtered.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
            break;
        }

        this.setData({ filteredAssessments: filtered });
      }
    });
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: 'kimochi心晴 - 专业心理测评',
      path: '/pages/assessments/index',
      imageUrl: '/assets/share/assessments.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: 'kimochi心晴 - 了解内在的自己',
      path: '/pages/assessments/index',
      imageUrl: '/assets/share/assessments-timeline.png'
    };
  }
});
