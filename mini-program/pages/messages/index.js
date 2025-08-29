// pages/messages/index.js
const { ApiService } = require('../../utils/api');
const { formatRelativeTime, showError, showSuccess, hapticFeedback, showConfirm } = require('../../utils/util');

Page({
  data: {
    chatRooms: [],
    isLoading: true,
    isLoggedIn: false,
    userInfo: null,
    unreadCount: 0,
    searchText: '',
    showSearch: false,
    filteredRooms: [],
    activeTab: 'all', // all, unread, groups
    tabs: [
      { id: 'all', name: '全部', icon: '💬' },
      { id: 'unread', name: '未读', icon: '🔴' },
      { id: 'groups', name: '群聊', icon: '👥' }
    ]
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    if (this.data.isLoggedIn) {
      this.loadChatRooms();
      this.updateUnreadCount();
    }
  },

  onPullDownRefresh() {
    if (this.data.isLoggedIn) {
      this.loadChatRooms().finally(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
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
          userInfo: null,
          chatRooms: [],
          filteredRooms: []
        });
      }
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null,
        chatRooms: [],
        filteredRooms: [],
        isLoading: false
      });
    }
  },

  async loadChatRooms() {
    if (!this.data.isLoggedIn) return;
    
    try {
      this.setData({ isLoading: true });
      
      const chatRooms = await ApiService.messages.getChatRooms();
      const processedRooms = this.processChatRooms(chatRooms);
      
      this.setData({
        chatRooms: processedRooms,
        filteredRooms: processedRooms
      });
      
      this.filterRooms();
    } catch (error) {
      console.error('加载聊天列表失败:', error);
      showError('加载聊天列表失败');
    } finally {
      this.setData({ isLoading: false });
    }
  },

  processChatRooms(rooms) {
    return rooms.map(room => ({
      ...room,
      _lastMessageTime: room.lastMessage ? 
        formatRelativeTime(room.lastMessage.createdAt) : '',
      _lastMessageText: this.formatLastMessage(room.lastMessage),
      _avatar: this.getRoomAvatar(room),
      _title: this.getRoomTitle(room),
      _isGroup: room.type === 'group',
      _unreadCount: room.unreadCount || 0
    }));
  },

  formatLastMessage(message) {
    if (!message) return '暂无消息';
    
    const { type, content } = message;
    
    switch (type) {
      case 'text':
        return content.length > 30 ? content.substring(0, 30) + '...' : content;
      case 'image':
        return '[图片]';
      case 'voice':
        return '[语音]';
      case 'file':
        return '[文件]';
      case 'system':
        return content;
      default:
        return '[消息]';
    }
  },

  getRoomAvatar(room) {
    if (room.type === 'group') {
      return room.avatar || '/assets/default/group.png';
    } else {
      // 私聊，显示对方头像
      const otherUser = room.participants?.find(p => p.id !== this.data.userInfo?.id);
      return otherUser?.avatar || '/assets/default/avatar.png';
    }
  },

  getRoomTitle(room) {
    if (room.type === 'group') {
      return room.name || '群聊';
    } else {
      // 私聊，显示对方姓名
      const otherUser = room.participants?.find(p => p.id !== this.data.userInfo?.id);
      return otherUser?.name || '用户';
    }
  },

  async updateUnreadCount() {
    try {
      const data = await ApiService.messages.getUnreadCount();
      const unreadCount = data.count || 0;
      
      this.setData({ unreadCount });
      
      // 更新TabBar徽章
      if (unreadCount > 0) {
        wx.setTabBarBadge({
          index: 3,
          text: unreadCount > 99 ? '99+' : unreadCount.toString()
        });
      } else {
        wx.removeTabBarBadge({ index: 3 });
      }
    } catch (error) {
      console.error('更新未读数量失败:', error);
    }
  },

  // 标签切换
  onTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    if (tab === this.data.activeTab) return;
    
    hapticFeedback();
    this.setData({ activeTab: tab });
    this.filterRooms();
  },

  filterRooms() {
    const { chatRooms, activeTab, searchText } = this.data;
    let filtered = [...chatRooms];

    // 按标签筛选
    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter(room => room._unreadCount > 0);
        break;
      case 'groups':
        filtered = filtered.filter(room => room._isGroup);
        break;
      default:
        // all - 不筛选
        break;
    }

    // 搜索筛选
    if (searchText.trim()) {
      const search = searchText.trim().toLowerCase();
      filtered = filtered.filter(room => 
        room._title.toLowerCase().includes(search) ||
        room._lastMessageText.toLowerCase().includes(search)
      );
    }

    // 排序：未读在前，最后消息时间倒序
    filtered.sort((a, b) => {
      if (a._unreadCount > 0 && b._unreadCount === 0) return -1;
      if (a._unreadCount === 0 && b._unreadCount > 0) return 1;
      
      const aTime = new Date(a.lastMessage?.createdAt || 0);
      const bTime = new Date(b.lastMessage?.createdAt || 0);
      return bTime - aTime;
    });

    this.setData({ filteredRooms: filtered });
  },

  // 搜索功能
  onSearchToggle() {
    hapticFeedback();
    this.setData({ 
      showSearch: !this.data.showSearch,
      searchText: ''
    });
    if (!this.data.showSearch) {
      this.filterRooms();
    }
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
    // 使用防抖处理搜索
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.filterRooms();
    }, 300);
  },

  onSearchClear() {
    this.setData({ searchText: '' });
    this.filterRooms();
  },

  // 聊天室点击
  onRoomTap(e) {
    const { room } = e.currentTarget.dataset;
    hapticFeedback();
    
    wx.navigateTo({
      url: `/pages/messages/chat?roomId=${room.id}&title=${encodeURIComponent(room._title)}`
    });
  },

  // 长按聊天室
  onRoomLongPress(e) {
    const { room, index } = e.currentTarget.dataset;
    
    const itemList = ['标记已读', '置顶聊天'];
    if (room._unreadCount > 0) {
      itemList[0] = '标记已读';
    } else {
      itemList[0] = '标记未读';
    }
    
    if (room.isPinned) {
      itemList[1] = '取消置顶';
    }
    
    itemList.push('删除聊天');
    
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === 0) {
          this.toggleReadStatus(room, index);
        } else if (res.tapIndex === 1) {
          this.togglePinStatus(room, index);
        } else if (res.tapIndex === 2) {
          this.deleteRoom(room, index);
        }
      }
    });
  },

  async toggleReadStatus(room, index) {
    try {
      if (room._unreadCount > 0) {
        await ApiService.messages.markAsRead(room.id);
        
        // 更新本地状态
        const chatRooms = [...this.data.chatRooms];
        chatRooms[index] = { ...chatRooms[index], _unreadCount: 0 };
        this.setData({ chatRooms });
        this.filterRooms();
        
        showSuccess('已标记为已读');
      } else {
        // TODO: 实现标记未读功能
        showSuccess('已标记为未读');
      }
      
      this.updateUnreadCount();
    } catch (error) {
      showError('操作失败');
    }
  },

  async togglePinStatus(room, index) {
    try {
      // TODO: 实现置顶功能
      const chatRooms = [...this.data.chatRooms];
      chatRooms[index] = { 
        ...chatRooms[index], 
        isPinned: !chatRooms[index].isPinned 
      };
      this.setData({ chatRooms });
      this.filterRooms();
      
      showSuccess(room.isPinned ? '已取消置顶' : '已置顶');
    } catch (error) {
      showError('操作失败');
    }
  },

  async deleteRoom(room, index) {
    const confirm = await showConfirm('确定要删除这个聊天吗？删除后不可恢复。');
    if (!confirm) return;
    
    try {
      // TODO: 实现删除聊天室功能
      const chatRooms = [...this.data.chatRooms];
      chatRooms.splice(index, 1);
      this.setData({ chatRooms });
      this.filterRooms();
      
      showSuccess('已删除聊天');
    } catch (error) {
      showError('删除失败');
    }
  },

  // 创建新聊天
  onCreateChat() {
    if (!this.data.isLoggedIn) {
      this.showLoginPrompt();
      return;
    }
    
    hapticFeedback();
    wx.showActionSheet({
      itemList: ['发起私聊', '创建群聊', '扫码加好友'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({ url: '/pages/friends/select?action=chat' });
        } else if (res.tapIndex === 1) {
          wx.navigateTo({ url: '/pages/groups/create' });
        } else if (res.tapIndex === 2) {
          wx.navigateTo({ url: '/pages/scan/index' });
        }
      }
    });
  },

  // 登录提示
  showLoginPrompt() {
    wx.showModal({
      title: '需要登录',
      content: '登录后可以查看和发送消息',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/auth/login' });
        }
      }
    });
  },

  // 点击登录按钮
  onLogin() {
    hapticFeedback();
    wx.navigateTo({ url: '/pages/auth/login' });
  },

  // 头像点击
  onAvatarTap(e) {
    e.stopPropagation();
    
    const { room } = e.currentTarget.dataset;
    if (room._isGroup) {
      // 群聊信息
      wx.navigateTo({ url: `/pages/groups/info?id=${room.id}` });
    } else {
      // 用户信息
      const otherUser = room.participants?.find(p => p.id !== this.data.userInfo?.id);
      if (otherUser) {
        wx.navigateTo({ url: `/pages/user/profile?id=${otherUser.id}` });
      }
    }
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: 'kimochi心晴 - 心语聊天',
      path: '/pages/home/index',
      imageUrl: '/assets/share/messages.png'
    };
  }
});