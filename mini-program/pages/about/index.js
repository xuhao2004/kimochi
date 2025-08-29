// pages/about/index.js
const { showError, showSuccess, hapticFeedback } = require('../../utils/util');

Page({
  data: {
    appInfo: {
      name: 'kimochi心晴',
      version: '2.0.0',
      description: '关照情绪，连接彼此',
      logo: '🌸'
    },
    features: [
      {
        icon: '🧠',
        title: '心理测评',
        desc: '科学的心理健康评估工具'
      },
      {
        icon: '💭',
        title: '心情墙',
        desc: '分享心情，倾听他人'
      },
      {
        icon: '💬',
        title: '心语聊天',
        desc: '安全的情感交流空间'
      },
      {
        icon: '🌤️',
        title: '天气心情',
        desc: '天气与心情的完美结合'
      },
      {
        icon: '🎯',
        title: '个性化服务',
        desc: '基于AI的个性化建议'
      },
      {
        icon: '🔒',
        title: '隐私保护',
        desc: '严格的数据安全保障'
      }
    ],
    team: [
      {
        name: '开发团队',
        role: '全栈开发',
        avatar: '👨‍💻',
        desc: '致力于打造优质的心理健康应用'
      }
    ],
    links: [
      {
        id: 'website',
        title: '官方网站',
        url: 'https://47.104.8.84',
        icon: '🌐'
      },
      {
        id: 'github',
        title: 'GitHub',
        url: 'https://github.com/xuhao2004/kimochi',
        icon: '💾'
      },
      {
        id: 'feedback',
        title: '意见反馈',
        url: 'mailto:feedback@kimochi.space',
        icon: '📧'
      },
      {
        id: 'privacy',
        title: '隐私政策',
        icon: '📄'
      },
      {
        id: 'terms',
        title: '服务条款',
        icon: '📋'
      }
    ],
    changelog: [
      {
        version: '2.0.0',
        date: '2024-08-29',
        changes: [
          '🎨 全新UI设计，符合苹果美学',
          '📱 重构小程序架构',
          '🔧 开发环境配置优化',
          '⚡ 性能优化和体验提升',
          '🛠️ 开发者工具增强'
        ]
      },
      {
        version: '1.0.0',
        date: '2024-08-01',
        changes: [
          '🎉 应用首次发布',
          '🧠 心理测评功能',
          '💭 心情墙社区',
          '💬 即时消息功能',
          '🌤️ 天气集成'
        ]
      }
    ],
    statistics: {
      users: '1,000+',
      assessments: '5,000+',
      posts: '10,000+',
      uptime: '99.9%'
    }
  },

  onLoad() {
    console.log('关于页面加载');
  },

  onShow() {
    // 页面显示时的逻辑
  },

  // 功能项点击
  onFeatureTap(e) {
    const { feature } = e.currentTarget.dataset;
    hapticFeedback();
    
    wx.showModal({
      title: feature.title,
      content: feature.desc + '\n\n这是kimochi心晴的核心功能之一，致力于为用户提供专业的心理健康服务。',
      showCancel: false,
      confirmText: '了解'
    });
  },

  // 团队成员点击
  onTeamMemberTap(e) {
    const { member } = e.currentTarget.dataset;
    hapticFeedback();
    
    wx.showModal({
      title: member.name,
      content: `职位：${member.role}\n\n${member.desc}`,
      showCancel: false,
      confirmText: '了解'
    });
  },

  // 链接点击
  onLinkTap(e) {
    const { link } = e.currentTarget.dataset;
    hapticFeedback();

    switch (link.id) {
      case 'website':
        this.copyToClipboard(link.url, '官网地址已复制');
        break;
      case 'github':
        this.copyToClipboard(link.url, 'GitHub地址已复制');
        break;
      case 'feedback':
        this.showFeedbackOptions();
        break;
      case 'privacy':
        this.showPrivacyPolicy();
        break;
      case 'terms':
        this.showTermsOfService();
        break;
    }
  },

  // 复制到剪贴板
  copyToClipboard(text, message) {
    wx.setClipboardData({
      data: text,
      success: () => showSuccess(message)
    });
  },

  // 显示反馈选项
  showFeedbackOptions() {
    wx.showActionSheet({
      itemList: ['邮件反馈', '应用内反馈', '加入用户群'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.copyToClipboard('feedback@kimochi.space', '反馈邮箱已复制');
        } else if (res.tapIndex === 1) {
          showSuccess('应用内反馈功能开发中');
        } else if (res.tapIndex === 2) {
          showSuccess('用户群功能开发中');
        }
      }
    });
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: 'kimochi心晴严格保护用户隐私：\n\n1. 数据加密存储\n2. 不出售个人信息\n3. 最小化数据收集\n4. 用户可删除数据\n5. 透明的数据使用\n\n详细政策请访问官网查看。',
      confirmText: '访问官网',
      success: (res) => {
        if (res.confirm) {
          this.copyToClipboard('https://47.104.8.84/privacy', '隐私政策地址已复制');
        }
      }
    });
  },

  // 显示服务条款
  showTermsOfService() {
    wx.showModal({
      title: '服务条款',
      content: '使用kimochi心晴即表示您同意：\n\n1. 遵守社区规范\n2. 不发布违法内容\n3. 尊重他人隐私\n4. 合理使用服务\n5. 配合安全检查\n\n详细条款请访问官网查看。',
      confirmText: '访问官网',
      success: (res) => {
        if (res.confirm) {
          this.copyToClipboard('https://47.104.8.84/terms', '服务条款地址已复制');
        }
      }
    });
  },

  // 版本更新日志点击
  onChangelogTap(e) {
    const { changelog } = e.currentTarget.dataset;
    hapticFeedback();
    
    const changeText = changelog.changes.join('\n');
    wx.showModal({
      title: `版本 ${changelog.version}`,
      content: `发布时间：${changelog.date}\n\n更新内容：\n${changeText}`,
      showCancel: false,
      confirmText: '了解'
    });
  },

  // 统计数据点击
  onStatTap(e) {
    const { stat, value } = e.currentTarget.dataset;
    hapticFeedback();
    
    const descriptions = {
      users: '活跃用户数量，感谢每一位用户的支持',
      assessments: '已完成的心理测评总数',
      posts: '用户在心情墙发布的动态总数',
      uptime: '系统可用性，我们致力于稳定服务'
    };

    wx.showModal({
      title: '数据说明',
      content: `${descriptions[stat]}\n\n当前数值：${value}`,
      showCancel: false,
      confirmText: '了解'
    });
  },

  // Logo点击 - 彩蛋
  onLogoTap() {
    hapticFeedback();
    
    // 简单的彩蛋效果
    wx.showToast({
      title: 'kimochi 🌸',
      icon: 'none',
      duration: 1500
    });
  },

  // 长按Logo - 开发信息
  onLogoLongPress() {
    wx.showModal({
      title: '开发信息',
      content: '💻 技术栈：\n• 前端：Next.js + React\n• 后端：Node.js + Prisma\n• 小程序：原生开发\n• 数据库：SQLite\n• 部署：Nginx + PM2\n\n🛠️ 开发工具：\n• VSCode + Cursor\n• Git + GitHub\n• 微信开发者工具',
      showCancel: false,
      confirmText: '厉害'
    });
  },

  // 分享应用
  onShareApp() {
    wx.showActionSheet({
      itemList: ['分享给朋友', '生成分享码', '推荐给群聊'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 触发分享
        } else if (res.tapIndex === 1) {
          showSuccess('分享码功能开发中');
        } else if (res.tapIndex === 2) {
          // 群聊分享
        }
      }
    });
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: 'kimochi心晴 - 关照情绪，连接彼此',
      path: '/pages/home/index',
      imageUrl: '/assets/share/about.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: 'kimochi心晴 - 心理健康小程序',
      path: '/pages/about/index',
      imageUrl: '/assets/share/about-timeline.png'
    };
  }
});