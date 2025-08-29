// pages/message-wall/index.js
const { ApiService } = require('../../utils/api');
const { formatRelativeTime, showError, showSuccess, hapticFeedback, showConfirm, cacheManager, optimizeImage, paginateData } = require('../../utils/util');

Page({
  data: {
    posts: [],
    isLoading: true,
    hasMore: true,
    page: 1,
    limit: 10,
    isRefreshing: false,
    isLoggedIn: false,
    userInfo: null,
    filterType: 'all', // all, following, liked
    showCreateBtn: true,
    filters: [
      { id: 'all', name: '全部', icon: '🌟' },
      { id: 'following', name: '关注', icon: '👥' },
      { id: 'liked', name: '点赞', icon: '❤️' }
    ]
  },

  onLoad() {
    this.checkLoginStatus();
    this.loadPosts();
  },

  onShow() {
    // 每次显示时刷新数据
    this.checkLoginStatus();
    this.refreshPosts();
  },

  onPullDownRefresh() {
    this.refreshPosts().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadMorePosts();
    }
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

  async loadPosts(append = false) {
    try {
      if (!append) {
        this.setData({ isLoading: true });
      }

      const { page, limit, filterType } = this.data;
      const currentPage = append ? page : 1;
      
      const response = await ApiService.wall.getPosts(currentPage, limit, filterType);
      const newPosts = await this.processPosts(response.posts || response);

      this.setData({
        posts: append ? [...this.data.posts, ...newPosts] : newPosts,
        page: append ? page + 1 : 2,
        hasMore: newPosts.length >= limit,
        isLoading: false
      });
    } catch (error) {
      console.error('加载动态失败:', error);
      showError('加载动态失败');
      this.setData({ isLoading: false });
    }
  },

  async refreshPosts() {
    this.setData({ 
      isRefreshing: true,
      page: 1 
    });
    await this.loadPosts();
    this.setData({ isRefreshing: false });
  },

  async loadMorePosts() {
    await this.loadPosts(true);
  },

  async processPosts(posts) {
    return Promise.all(posts.map(async post => {
      // 优化图片加载
      const optimizedImages = await Promise.all(
        (post.images || []).map(async img => await optimizeImage(img, { maxWidth: 400, maxHeight: 400 }))
      );
      
      return {
        ...post,
        _createdAt: formatRelativeTime(post.createdAt),
        _isLiked: post.isLiked || false,
        _canDelete: this.data.isLoggedIn && 
          (post.authorId === this.data.userInfo?.id || this.data.userInfo?.role === 'ADMIN'),
        _content: this.processContent(post.content),
        _images: optimizedImages,
        _authorAvatar: await optimizeImage(post.author.avatar || '/assets/default/avatar.png', { maxWidth: 100, maxHeight: 100 })
      };
    }));
  },

  processContent(content) {
    if (!content) return '';
    
    // 处理长文本
    if (content.length > 200) {
      return content.substring(0, 200) + '...';
    }
    
    // 处理话题标签 #话题#
    content = content.replace(/#([^#]+)#/g, '<span class="topic-tag">#$1#</span>');
    
    // 处理@提及
    content = content.replace(/@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g, '<span class="mention">@$1</span>');
    
    return content;
  },

  // 筛选器切换
  onFilterTap(e) {
    const { filter } = e.currentTarget.dataset;
    
    if (filter === this.data.filterType) return;
    
    hapticFeedback();
    this.setData({ filterType: filter });
    this.refreshPosts();
  },

  // 点击动态
  onPostTap(e) {
    const { post } = e.currentTarget.dataset;
    hapticFeedback();
    
    wx.navigateTo({
      url: `/pages/message-wall/detail?id=${post.id}`
    });
  },

  // 点赞/取消点赞
  async onLikeTap(e) {
    e.stopPropagation();
    
    if (!this.data.isLoggedIn) {
      this.showLoginPrompt();
      return;
    }

    const { post, index } = e.currentTarget.dataset;
    hapticFeedback();

    // 乐观更新UI
    const posts = [...this.data.posts];
    posts[index] = {
      ...posts[index],
      _isLiked: !posts[index]._isLiked,
      likeCount: posts[index]._isLiked ? 
        (posts[index].likeCount - 1) : (posts[index].likeCount + 1)
    };
    this.setData({ posts });

    try {
      await ApiService.wall.toggleLike(post.id);
    } catch (error) {
      // 出错时回滚UI
      posts[index] = {
        ...posts[index],
        _isLiked: !posts[index]._isLiked,
        likeCount: posts[index]._isLiked ? 
          (posts[index].likeCount - 1) : (posts[index].likeCount + 1)
      };
      this.setData({ posts });
      showError('操作失败，请重试');
    }
  },

  // 评论
  onCommentTap(e) {
    e.stopPropagation();
    
    const { post } = e.currentTarget.dataset;
    hapticFeedback();
    
    if (!this.data.isLoggedIn) {
      this.showLoginPrompt();
      return;
    }
    
    wx.navigateTo({
      url: `/pages/message-wall/detail?id=${post.id}&action=comment`
    });
  },

  // 分享
  onShareTap(e) {
    e.stopPropagation();
    
    const { post } = e.currentTarget.dataset;
    hapticFeedback();
    
    wx.showActionSheet({
      itemList: ['分享给朋友', '分享到朋友圈', '复制链接'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.shareToFriend(post);
        } else if (res.tapIndex === 1) {
          this.shareToTimeline(post);
        } else if (res.tapIndex === 2) {
          this.copyPostLink(post);
        }
      }
    });
  },

  shareToFriend(post) {
    return {
      title: post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content,
      path: `/pages/message-wall/detail?id=${post.id}`,
      imageUrl: post.images && post.images.length > 0 ? post.images[0] : '/assets/share/post.png'
    };
  },

  shareToTimeline(post) {
    return {
      title: post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content,
      path: `/pages/message-wall/detail?id=${post.id}`,
      imageUrl: post.images && post.images.length > 0 ? post.images[0] : '/assets/share/post-timeline.png'
    };
  },

  copyPostLink(post) {
    const link = `https://47.104.8.84/message-wall/${post.id}`;
    wx.setClipboardData({
      data: link,
      success: () => showSuccess('链接已复制到剪贴板')
    });
  },

  // 更多操作
  onMoreTap(e) {
    e.stopPropagation();
    
    const { post, index } = e.currentTarget.dataset;
    const { _canDelete } = post;
    
    const itemList = ['举报内容'];
    if (_canDelete) {
      itemList.unshift('删除动态');
    }
    
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (_canDelete && res.tapIndex === 0) {
          this.deletePost(post, index);
        } else {
          this.reportPost(post);
        }
      }
    });
  },

  async deletePost(post, index) {
    const confirm = await showConfirm('确定要删除这条动态吗？');
    if (!confirm) return;

    try {
      await ApiService.wall.deletePost(post.id);
      
      // 从列表中移除
      const posts = [...this.data.posts];
      posts.splice(index, 1);
      this.setData({ posts });
      
      showSuccess('删除成功');
    } catch (error) {
      showError('删除失败');
    }
  },

  reportPost(post) {
    wx.navigateTo({
      url: `/pages/report/index?type=post&id=${post.id}`
    });
  },

  // 图片预览
  onImageTap(e) {
    e.stopPropagation();
    
    const { images, current } = e.currentTarget.dataset;
    hapticFeedback();
    
    wx.previewImage({
      urls: images,
      current: current
    });
  },

  // 用户信息点击
  onUserTap(e) {
    e.stopPropagation();
    
    const { userId } = e.currentTarget.dataset;
    hapticFeedback();
    
    if (userId === this.data.userInfo?.id) {
      // 自己的资料
      wx.switchTab({ url: '/pages/profile/index' });
    } else {
      // 他人资料
      wx.navigateTo({ url: `/pages/user/profile?id=${userId}` });
    }
  },

  // 创建新动态
  onCreateTap() {
    if (!this.data.isLoggedIn) {
      this.showLoginPrompt();
      return;
    }
    
    hapticFeedback();
    wx.navigateTo({ url: '/pages/message-wall/create' });
  },

  // 搜索
  onSearchTap() {
    wx.navigateTo({ url: '/pages/message-wall/search' });
  },

  // 登录提示
  showLoginPrompt() {
    wx.showModal({
      title: '需要登录',
      content: '登录后可以点赞、评论和发布动态',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/auth/login' });
        }
      }
    });
  },

  // 滚动处理
  onScroll(e) {
    const { scrollTop } = e.detail;
    const showCreateBtn = scrollTop < 100; // 滚动距离小于100px时显示按钮
    
    if (showCreateBtn !== this.data.showCreateBtn) {
      this.setData({ showCreateBtn });
    }
  },

  // 分享给朋友
  onShareAppMessage(e) {
    if (e.target && e.target.dataset && e.target.dataset.post) {
      return this.shareToFriend(e.target.dataset.post);
    }
    
    return {
      title: 'kimochi心晴 - 分享心情，连接彼此',
      path: '/pages/message-wall/index',
      imageUrl: '/assets/share/wall.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: 'kimochi心晴 - 心情墙',
      path: '/pages/message-wall/index',
      imageUrl: '/assets/share/wall-timeline.png'
    };
  }
});
