// MBTI 16型人格测试
// 基于四个维度：内向/外向、感觉/直觉、思考/情感、判断/知觉

export interface MBTIQuestion {
  id: string;
  text: string;
  dimension: string; // E/I, S/N, T/F, J/P
  direction: string; // A 或 B，表示倾向于哪个类型
}

export interface MBTIDimension {
  name: string;
  typeA: string;
  typeB: string;
  descriptionA: string;
  descriptionB: string;
}

// MBTI 四个维度
export const MBTI_DIMENSIONS: Record<string, MBTIDimension> = {
  "EI": {
    name: "能量倾向",
    typeA: "E", // 外向
    typeB: "I", // 内向
    descriptionA: "外向型：从外部世界获得能量，喜欢社交",
    descriptionB: "内向型：从内心世界获得能量，偏好独处"
  },
  "SN": {
    name: "信息收集",
    typeA: "S", // 感觉
    typeB: "N", // 直觉
    descriptionA: "感觉型：关注具体事实和细节",
    descriptionB: "直觉型：关注可能性和整体概念"
  },
  "TF": {
    name: "决策方式",
    typeA: "T", // 思考
    typeB: "F", // 情感
    descriptionA: "思考型：基于逻辑和客观分析做决定",
    descriptionB: "情感型：基于价值观和他人感受做决定"
  },
  "JP": {
    name: "生活方式",
    typeA: "J", // 判断
    typeB: "P", // 知觉
    descriptionA: "判断型：喜欢计划和结构化的生活",
    descriptionB: "知觉型：喜欢灵活和适应性强的生活"
  }
};

// MBTI 测试题目（60题，每个维度15题）
export const MBTI_QUESTIONS: MBTIQuestion[] = [
  // 外向 vs 内向 (E/I) - 15题
  { id: "ei1", text: "在聚会中，我通常会：", dimension: "EI", direction: "A" }, // A: 主动与很多人交谈 B: 与少数人深入交谈
  { id: "ei2", text: "当我需要放松时，我更喜欢：", dimension: "EI", direction: "B" }, // A: 和朋友出去 B: 独自待着
  { id: "ei3", text: "我在团队中通常：", dimension: "EI", direction: "A" }, // A: 主动发表意见 B: 仔细听取别人的想法
  { id: "ei4", text: "我更容易：", dimension: "EI", direction: "A" }, // A: 先说后想 B: 先想后说
  { id: "ei5", text: "我的能量来源主要是：", dimension: "EI", direction: "A" }, // A: 与人互动 B: 独处思考
  { id: "ei6", text: "在会议中，我倾向于：", dimension: "EI", direction: "A" }, // A: 积极参与讨论 B: 深思熟虑后发言
  { id: "ei7", text: "我更喜欢：", dimension: "EI", direction: "A" }, // A: 广泛的人际关系 B: 深入的友谊
  { id: "ei8", text: "在工作中，我更愿意：", dimension: "EI", direction: "A" }, // A: 与团队协作 B: 独立工作
  { id: "ei9", text: "当面临压力时，我倾向于：", dimension: "EI", direction: "A" }, // A: 寻求他人支持 B: 独自处理
  { id: "ei10", text: "我通常：", dimension: "EI", direction: "B" }, // A: 容易表达感受 B: 保留内心想法
  { id: "ei11", text: "在学习新事物时，我更喜欢：", dimension: "EI", direction: "A" }, // A: 讨论学习 B: 阅读学习
  { id: "ei12", text: "我的注意力更多放在：", dimension: "EI", direction: "A" }, // A: 外部世界 B: 内心世界
  { id: "ei13", text: "在解决问题时，我喜欢：", dimension: "EI", direction: "A" }, // A: 头脑风暴 B: 深度思考
  { id: "ei14", text: "我认为自己是：", dimension: "EI", direction: "A" }, // A: 善于交际的 B: 深思熟虑的
  { id: "ei15", text: "在陌生环境中，我通常：", dimension: "EI", direction: "A" }, // A: 主动适应 B: 观察后行动

  // 感觉 vs 直觉 (S/N) - 15题
  { id: "sn1", text: "我更关注：", dimension: "SN", direction: "A" }, // A: 现实和事实 B: 可能性和概念
  { id: "sn2", text: "在学习时，我更喜欢：", dimension: "SN", direction: "A" }, // A: 具体例子 B: 抽象理论
  { id: "sn3", text: "我更信任：", dimension: "SN", direction: "A" }, // A: 经验和常识 B: 直觉和洞察
  { id: "sn4", text: "我倾向于：", dimension: "SN", direction: "A" }, // A: 关注细节 B: 看大局
  { id: "sn5", text: "我更喜欢：", dimension: "SN", direction: "B" }, // A: 按部就班 B: 创新变化
  { id: "sn6", text: "在工作中，我更重视：", dimension: "SN", direction: "A" }, // A: 实用性 B: 原创性
  { id: "sn7", text: "我更容易记住：", dimension: "SN", direction: "A" }, // A: 具体事实 B: 整体印象
  { id: "sn8", text: "我的思维方式更偏向：", dimension: "SN", direction: "A" }, // A: 现实主义 B: 理想主义
  { id: "sn9", text: "在做计划时，我更看重：", dimension: "SN", direction: "A" }, // A: 可行性 B: 创意性
  { id: "sn10", text: "我更喜欢处理：", dimension: "SN", direction: "A" }, // A: 具体问题 B: 抽象概念
  { id: "sn11", text: "我倾向于：", dimension: "SN", direction: "A" }, // A: 相信事实 B: 相信直觉
  { id: "sn12", text: "在阅读时，我更喜欢：", dimension: "SN", direction: "A" }, // A: 说明文 B: 文学作品
  { id: "sn13", text: "我的注意力更多在：", dimension: "SN", direction: "A" }, // A: 当下现实 B: 未来可能
  { id: "sn14", text: "我更擅长：", dimension: "SN", direction: "A" }, // A: 观察细节 B: 发现模式
  { id: "sn15", text: "我认为自己是：", dimension: "SN", direction: "A" }, // A: 务实的 B: 想象力丰富的

  // 思考 vs 情感 (T/F) - 15题
  { id: "tf1", text: "做决定时，我更重视：", dimension: "TF", direction: "A" }, // A: 逻辑分析 B: 他人感受
  { id: "tf2", text: "我更看重：", dimension: "TF", direction: "A" }, // A: 公正 B: 和谐
  { id: "tf3", text: "在冲突中，我倾向于：", dimension: "TF", direction: "A" }, // A: 讲道理 B: 关注情感
  { id: "tf4", text: "我更容易：", dimension: "TF", direction: "A" }, // A: 保持客观 B: 感同身受
  { id: "tf5", text: "我认为更重要的是：", dimension: "TF", direction: "A" }, // A: 正确性 B: 人际关系
  { id: "tf6", text: "在团队中，我更注重：", dimension: "TF", direction: "A" }, // A: 效率 B: 团队和谐
  { id: "tf7", text: "我的判断更基于：", dimension: "TF", direction: "A" }, // A: 事实和逻辑 B: 价值和情感
  { id: "tf8", text: "我更愿意被人认为是：", dimension: "TF", direction: "A" }, // A: 有能力的 B: 善解人意的
  { id: "tf9", text: "在批评他人时，我：", dimension: "TF", direction: "A" }, // A: 直接指出问题 B: 考虑对方感受
  { id: "tf10", text: "我更擅长：", dimension: "TF", direction: "A" }, // A: 分析问题 B: 理解他人
  { id: "tf11", text: "我的决策通常：", dimension: "TF", direction: "A" }, // A: 基于客观标准 B: 考虑人的因素
  { id: "tf12", text: "我更重视：", dimension: "TF", direction: "A" }, // A: 真实性 B: 体贴性
  { id: "tf13", text: "在工作中，我更关注：", dimension: "TF", direction: "A" }, // A: 任务完成 B: 人际关系
  { id: "tf14", text: "我认为自己是：", dimension: "TF", direction: "A" }, // A: 理性的 B: 感性的
  { id: "tf15", text: "处理问题时，我更依赖：", dimension: "TF", direction: "A" }, // A: 头脑 B: 内心

  // 判断 vs 知觉 (J/P) - 15题
  { id: "jp1", text: "我更喜欢：", dimension: "JP", direction: "A" }, // A: 有计划的生活 B: 自发的生活
  { id: "jp2", text: "我的工作空间通常：", dimension: "JP", direction: "A" }, // A: 整洁有序 B: 灵活多变
  { id: "jp3", text: "面对截止日期，我：", dimension: "JP", direction: "A" }, // A: 提前完成 B: 临近时完成
  { id: "jp4", text: "我更喜欢：", dimension: "JP", direction: "A" }, // A: 确定性 B: 开放性
  { id: "jp5", text: "在旅行时，我更喜欢：", dimension: "JP", direction: "A" }, // A: 详细规划 B: 随意安排
  { id: "jp6", text: "我的决策风格是：", dimension: "JP", direction: "A" }, // A: 快速决断 B: 保持选择开放
  { id: "jp7", text: "我更倾向于：", dimension: "JP", direction: "A" }, // A: 完成任务 B: 开始新项目
  { id: "jp8", text: "我的生活方式更偏向：", dimension: "JP", direction: "A" }, // A: 结构化 B: 灵活性
  { id: "jp9", text: "面对变化，我：", dimension: "JP", direction: "B" }, // A: 需要时间适应 B: 容易接受
  { id: "jp10", text: "我更喜欢：", dimension: "JP", direction: "A" }, // A: 按计划行事 B: 临时应变
  { id: "jp11", text: "在购物时，我通常：", dimension: "JP", direction: "A" }, // A: 列清单 B: 随意浏览
  { id: "jp12", text: "我的时间观念：", dimension: "JP", direction: "A" }, // A: 准时重要 B: 灵活为主
  { id: "jp13", text: "我更倾向于：", dimension: "JP", direction: "A" }, // A: 遵循规则 B: 寻找例外
  { id: "jp14", text: "我认为自己是：", dimension: "JP", direction: "A" }, // A: 有组织的 B: 适应性强的
  { id: "jp15", text: "处理多项任务时，我：", dimension: "JP", direction: "A" } // A: 逐个完成 B: 同时进行
];

// MBTI 16种人格类型描述
export const MBTI_TYPES = {
  "INTJ": {
    name: "建筑师",
    description: "富有想象力和战略性的思想家，一切皆在计划之中。",
    strengths: ["独立思考", "战略规划", "高标准", "创新能力"],
    weaknesses: ["过于独立", "完美主义", "缺乏耐心", "社交困难"],
    careers: ["科学家", "工程师", "建筑师", "研究员", "战略顾问"]
  },
  "INTP": {
    name: "逻辑学家", 
    description: "具有创造性的思想家，对知识有着强烈的渴望。",
    strengths: ["逻辑思维", "创新性", "独立性", "灵活性"],
    weaknesses: ["缺乏组织", "完美主义", "社交困难", "情感表达"],
    careers: ["研究员", "分析师", "程序员", "学者", "发明家"]
  },
  "ENTJ": {
    name: "指挥官",
    description: "大胆、富有想象力、意志强烈的领导者。",
    strengths: ["领导力", "战略思维", "决断力", "自信"],
    weaknesses: ["过于严厉", "不耐烦", "缺乏同理心", "专断"],
    careers: ["CEO", "管理者", "律师", "投资银行家", "政治家"]
  },
  "ENTP": {
    name: "辩论家",
    description: "聪明好奇的思想家，无法抗拒智力挑战。",
    strengths: ["创新性", "热情", "机智", "适应性"],
    weaknesses: ["缺乏专注", "争论性", "不敏感", "难以实施"],
    careers: ["企业家", "顾问", "发明家", "记者", "心理学家"]
  },
  "INFJ": {
    name: "提倡者",
    description: "安静而神秘，同时鼓舞他人的理想主义者。",
    strengths: ["洞察力", "理想主义", "果断", "有组织"],
    weaknesses: ["敏感", "完美主义", "私人性", "倦怠"],
    careers: ["心理咨询师", "作家", "教师", "艺术家", "非营利工作"]
  },
  "INFP": {
    name: "调停者",
    description: "诗意、善良的利他主义者，总是热心于促成正面变化。",
    strengths: ["理想主义", "忠诚", "适应性", "好奇心"],
    weaknesses: ["过于理想", "难以知足", "不切实际", "情绪化"],
    careers: ["写作", "艺术", "心理学", "社会工作", "宗教工作"]
  },
  "ENFJ": {
    name: "主人公",
    description: "富有魅力的鼓舞者，能够使听众为之着迷。",
    strengths: ["领导力", "同理心", "沟通", "利他主义"],
    weaknesses: ["过于理想", "过于敏感", "犹豫不决", "自我批评"],
    careers: ["教师", "心理咨询师", "政治家", "人力资源", "销售"]
  },
  "ENFP": {
    name: "竞选者",
    description: "热情、有创造力的社交者，总能找到微笑的理由。",
    strengths: ["热情", "创造力", "社交性", "观察力"],
    weaknesses: ["缺乏专注", "容易紧张", "情绪化", "难以决定"],
    careers: ["心理学家", "记者", "演员", "销售", "顾问"]
  },
  "ISTJ": {
    name: "物流师",
    description: "实用且注重事实的人，其可靠性毋庸置疑。",
    strengths: ["忠诚", "负责任", "冷静", "实用"],
    weaknesses: ["顽固", "责备自己", "难以适应", "缺乏表达"],
    careers: ["会计", "审计", "银行", "管理", "军事"]
  },
  "ISFJ": {
    name: "守护者", 
    description: "非常专注、温暖的守护者，时刻准备保护爱着的人们。",
    strengths: ["支持性", "可靠", "有组织", "想象力"],
    weaknesses: ["过于利他", "低估自己", "难以拒绝", "压抑感情"],
    careers: ["护士", "教师", "社会工作", "人力资源", "图书管理"]
  },
  "ESTJ": {
    name: "总经理",
    description: "出色的管理者，在管理事物或人员方面无与伦比。",
    strengths: ["专注", "意志坚强", "正直", "创造秩序"],
    weaknesses: ["顽固", "缺乏耐心", "缺乏想象", "不愿妥协"],
    careers: ["管理", "法律", "银行", "军事", "政府"]
  },
  "ESFJ": {
    name: "执政官",
    description: "非常关心他人、善于社交的人们，总是渴望帮助他人。",
    strengths: ["强烈的实用技能", "忠诚", "敏感", "连接他人"],
    weaknesses: ["担心社会地位", "缺乏创新", "缺乏冒险", "过于无私"],
    careers: ["销售", "护理", "教学", "人力资源", "社会工作"]
  },
  "ISTP": {
    name: "鉴赏家",
    description: "大胆而实际的实验者，擅长使用各种工具。",
    strengths: ["乐观积极", "创造性", "实用性", "危机处理"],
    weaknesses: ["顽固", "缺乏敏感", "极端私人", "容易厌倦"],
    careers: ["机械师", "工程师", "警察", "消防员", "运动员"]
  },
  "ISFP": {
    name: "探险家",
    description: "灵活、迷人的艺术家，时刻准备探索新的可能性。",
    strengths: ["魅力", "敏感他人", "想象力", "热情"],
    weaknesses: ["情绪波动", "缺乏长远规划", "难以做决定", "容易紧张"],
    careers: ["艺术家", "音乐家", "设计师", "心理学家", "兽医"]
  },
  "ESTP": {
    name: "企业家",
    description: "聪明、精力充沛的感知者，真正享受生活在边缘。",
    strengths: ["大胆", "理性实用", "原创性", "感知力"],
    weaknesses: ["缺乏敏感", "缺乏耐心", "冒险性", "难以专注"],
    careers: ["销售", "市场营销", "企业家", "演员", "体育"]
  },
  "ESFP": {
    name: "娱乐家",
    description: "自发的、精力充沛的娱乐者，哪里有他们哪里就有欢乐。",
    strengths: ["大胆", "美学", "实用性", "人际技巧"],
    weaknesses: ["敏感", "冲突厌恶", "缺乏专注", "缺乏长远规划"],
    careers: ["演艺", "销售", "时尚", "摄影", "社会工作"]
  }
};

// 答案选项 - 每题两个选项代表不同倾向
export const MBTI_ANSWER_OPTIONS: Record<string, { A: string; B: string }> = {
  // 外向 vs 内向题目选项
  "ei1": { A: "主动与很多人交谈", B: "与少数人深入交谈" },
  "ei2": { A: "和朋友出去", B: "独自待着" },
  "ei3": { A: "主动发表意见", B: "仔细听取别人的想法" },
  "ei4": { A: "先说后想", B: "先想后说" },
  "ei5": { A: "与人互动", B: "独处思考" },
  "ei6": { A: "积极参与讨论", B: "深思熟虑后发言" },
  "ei7": { A: "广泛的人际关系", B: "深入的友谊" },
  "ei8": { A: "与团队协作", B: "独立工作" },
  "ei9": { A: "寻求他人支持", B: "独自处理" },
  "ei10": { A: "容易表达感受", B: "保留内心想法" },
  "ei11": { A: "讨论学习", B: "阅读学习" },
  "ei12": { A: "外部世界", B: "内心世界" },
  "ei13": { A: "头脑风暴", B: "深度思考" },
  "ei14": { A: "善于交际的", B: "深思熟虑的" },
  "ei15": { A: "主动适应", B: "观察后行动" },

  // 感觉 vs 直觉题目选项
  "sn1": { A: "现实和事实", B: "可能性和概念" },
  "sn2": { A: "具体例子", B: "抽象理论" },
  "sn3": { A: "经验和常识", B: "直觉和洞察" },
  "sn4": { A: "关注细节", B: "看大局" },
  "sn5": { A: "按部就班", B: "创新变化" },
  "sn6": { A: "实用性", B: "原创性" },
  "sn7": { A: "具体事实", B: "整体印象" },
  "sn8": { A: "现实主义", B: "理想主义" },
  "sn9": { A: "可行性", B: "创意性" },
  "sn10": { A: "具体问题", B: "抽象概念" },
  "sn11": { A: "相信事实", B: "相信直觉" },
  "sn12": { A: "说明文", B: "文学作品" },
  "sn13": { A: "当下现实", B: "未来可能" },
  "sn14": { A: "观察细节", B: "发现模式" },
  "sn15": { A: "务实的", B: "想象力丰富的" },

  // 思考 vs 情感题目选项
  "tf1": { A: "逻辑分析", B: "他人感受" },
  "tf2": { A: "公正", B: "和谐" },
  "tf3": { A: "讲道理", B: "关注情感" },
  "tf4": { A: "保持客观", B: "感同身受" },
  "tf5": { A: "正确性", B: "人际关系" },
  "tf6": { A: "效率", B: "团队和谐" },
  "tf7": { A: "事实和逻辑", B: "价值和情感" },
  "tf8": { A: "有能力的", B: "善解人意的" },
  "tf9": { A: "直接指出问题", B: "考虑对方感受" },
  "tf10": { A: "分析问题", B: "理解他人" },
  "tf11": { A: "基于客观标准", B: "考虑人的因素" },
  "tf12": { A: "真实性", B: "体贴性" },
  "tf13": { A: "任务完成", B: "人际关系" },
  "tf14": { A: "理性的", B: "感性的" },
  "tf15": { A: "头脑", B: "内心" },

  // 判断 vs 知觉题目选项
  "jp1": { A: "有计划的生活", B: "自发的生活" },
  "jp2": { A: "整洁有序", B: "灵活多变" },
  "jp3": { A: "提前完成", B: "临近时完成" },
  "jp4": { A: "确定性", B: "开放性" },
  "jp5": { A: "详细规划", B: "随意安排" },
  "jp6": { A: "快速决断", B: "保持选择开放" },
  "jp7": { A: "完成任务", B: "开始新项目" },
  "jp8": { A: "结构化", B: "灵活性" },
  "jp9": { A: "需要时间适应", B: "容易接受" },
  "jp10": { A: "按计划行事", B: "临时应变" },
  "jp11": { A: "列清单", B: "随意浏览" },
  "jp12": { A: "准时重要", B: "灵活为主" },
  "jp13": { A: "遵循规则", B: "寻找例外" },
  "jp14": { A: "有组织的", B: "适应性强的" },
  "jp15": { A: "逐个完成", B: "同时进行" }
};

// MBTI 计分和分析函数
export function calculateMBTIResult(answers: Record<string, string>): {
  personalityType: string;
  dimensions: Record<string, { score: number; type: string; percentage: number }>;
  description: {
    name: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
    careers: string[];
  };
} {
  // 计算每个维度的得分
  const dimensionScores = {
    EI: { E: 0, I: 0 },
    SN: { S: 0, N: 0 },
    TF: { T: 0, F: 0 },
    JP: { J: 0, P: 0 }
  };

  // 统计答案
  Object.entries(answers).forEach(([questionId, answer]) => {
    const question = MBTI_QUESTIONS.find(q => q.id === questionId);
    if (!question) return;

    const dimension = question.dimension;
    const isDirectionA = question.direction === "A";
    
    if (dimension === "EI") {
      if ((isDirectionA && answer === "A") || (!isDirectionA && answer === "B")) {
        dimensionScores.EI.E++;
      } else {
        dimensionScores.EI.I++;
      }
    } else if (dimension === "SN") {
      if ((isDirectionA && answer === "A") || (!isDirectionA && answer === "B")) {
        dimensionScores.SN.S++;
      } else {
        dimensionScores.SN.N++;
      }
    } else if (dimension === "TF") {
      if ((isDirectionA && answer === "A") || (!isDirectionA && answer === "B")) {
        dimensionScores.TF.T++;
      } else {
        dimensionScores.TF.F++;
      }
    } else if (dimension === "JP") {
      if ((isDirectionA && answer === "A") || (!isDirectionA && answer === "B")) {
        dimensionScores.JP.J++;
      } else {
        dimensionScores.JP.P++;
      }
    }
  });

  // 确定每个维度的类型
  const personalityType = 
    (dimensionScores.EI.E >= dimensionScores.EI.I ? "E" : "I") +
    (dimensionScores.SN.S >= dimensionScores.SN.N ? "S" : "N") +
    (dimensionScores.TF.T >= dimensionScores.TF.F ? "T" : "F") +
    (dimensionScores.JP.J >= dimensionScores.JP.P ? "J" : "P");

  // 计算各维度详细信息
  const dimensions = {
    EI: {
      score: dimensionScores.EI.E,
      type: dimensionScores.EI.E >= dimensionScores.EI.I ? "E" : "I",
      percentage: Math.round((Math.max(dimensionScores.EI.E, dimensionScores.EI.I) / 15) * 100)
    },
    SN: {
      score: dimensionScores.SN.S,
      type: dimensionScores.SN.S >= dimensionScores.SN.N ? "S" : "N",
      percentage: Math.round((Math.max(dimensionScores.SN.S, dimensionScores.SN.N) / 15) * 100)
    },
    TF: {
      score: dimensionScores.TF.T,
      type: dimensionScores.TF.T >= dimensionScores.TF.F ? "T" : "F",
      percentage: Math.round((Math.max(dimensionScores.TF.T, dimensionScores.TF.F) / 15) * 100)
    },
    JP: {
      score: dimensionScores.JP.J,
      type: dimensionScores.JP.J >= dimensionScores.JP.P ? "J" : "P",
      percentage: Math.round((Math.max(dimensionScores.JP.J, dimensionScores.JP.P) / 15) * 100)
    }
  };

  return {
    personalityType,
    dimensions,
    description: MBTI_TYPES[personalityType as keyof typeof MBTI_TYPES] || MBTI_TYPES.INTJ
  };
}
