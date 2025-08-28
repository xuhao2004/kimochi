const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const violationReasons = [
  // 垃圾信息类别
  {
    name: '发布广告信息',
    description: '发布商业广告、推广链接或其他营销内容',
    category: 'spam',
    order: 1
  },
  {
    name: '重复发布内容',
    description: '多次发布相同或相似的内容刷屏',
    category: 'spam',
    order: 2
  },
  {
    name: '无关内容',
    description: '发布与社区主题无关的内容',
    category: 'spam',
    order: 3
  },

  // 不当内容类别
  {
    name: '包含不良信息',
    description: '包含暴力、色情、赌博等不适宜内容',
    category: 'inappropriate',
    order: 1
  },
  {
    name: '语言粗俗',
    description: '使用脏话、侮辱性语言或不文明用词',
    category: 'inappropriate',
    order: 2
  },
  {
    name: '内容低俗',
    description: '发布低俗、恶心或令人不适的内容',
    category: 'inappropriate',
    order: 3
  },

  // 骚扰行为类别
  {
    name: '人身攻击',
    description: '对他人进行人身攻击、恶意诽谤或侮辱',
    category: 'harassment',
    order: 1
  },
  {
    name: '恶意骚扰',
    description: '持续骚扰、跟踪或威胁他人',
    category: 'harassment',
    order: 2
  },
  {
    name: '歧视言论',
    description: '基于种族、性别、宗教等的歧视性言论',
    category: 'harassment',
    order: 3
  },

  // 虚假信息类别
  {
    name: '传播谣言',
    description: '发布未经证实的不实信息或谣言',
    category: 'fake',
    order: 1
  },
  {
    name: '虚假身份',
    description: '冒充他人身份或发布虚假个人信息',
    category: 'fake',
    order: 2
  },
  {
    name: '误导信息',
    description: '故意发布误导性或欺骗性信息',
    category: 'fake',
    order: 3
  },

  // 其他类别
  {
    name: '侵犯隐私',
    description: '未经同意发布他人私人信息或照片',
    category: 'other',
    order: 1
  },
  {
    name: '版权侵权',
    description: '发布侵犯他人版权的内容',
    category: 'other',
    order: 2
  },
  {
    name: '违反社区规定',
    description: '违反其他社区规则或行为准则',
    category: 'other',
    order: 3
  }
];

async function initViolationReasons() {
  try {
    console.log('开始初始化违规理由数据...');

    // 清空现有数据（可选）
    await prisma.violationReason.deleteMany({});
    console.log('已清空现有违规理由数据');

    // 插入新数据
    for (const reason of violationReasons) {
      await prisma.violationReason.create({
        data: reason
      });
      console.log(`已创建违规理由: ${reason.name}`);
    }

    console.log(`✅ 成功初始化 ${violationReasons.length} 个违规理由`);
    console.log('违规理由按分类统计:');
    
    const categories = ['spam', 'inappropriate', 'harassment', 'fake', 'other'];
    const categoryNames = {
      spam: '垃圾信息',
      inappropriate: '不当内容', 
      harassment: '骚扰行为',
      fake: '虚假信息',
      other: '其他'
    };
    
    for (const category of categories) {
      const count = violationReasons.filter(r => r.category === category).length;
      console.log(`  - ${categoryNames[category]}: ${count} 个`);
    }

  } catch (error) {
    console.error('❌ 初始化违规理由失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行初始化
initViolationReasons();