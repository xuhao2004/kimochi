// SCL-90 心理症状自评量表
// 包含90道题目，9个症状因子，5点评分制

export interface SCL90Question {
  id: string;
  text: string;
  factor: string; // 症状因子
  reverse?: boolean; // 是否为反向计分题
}

export interface SCL90Factor {
  name: string;
  label: string;
  description: string;
  questions: string[]; // question IDs
}

// 评分选项
export const SCL90_OPTIONS = [
  { value: 1, label: "没有" },
  { value: 2, label: "很轻" },
  { value: 3, label: "中等" },
  { value: 4, label: "偏重" },
  { value: 5, label: "严重" }
];

// SCL-90 题目库 - 标准90道题目
export const SCL90_QUESTIONS: SCL90Question[] = [
  // 1-10
  { id: "q1", text: "头痛", factor: "somatization" },
  { id: "q2", text: "神经过敏，心中不踏实", factor: "anxiety" },
  { id: "q3", text: "反复洗手、点数或触摸某些东西", factor: "obsessive_compulsive" },
  { id: "q4", text: "头昏或昏倒", factor: "somatization" },
  { id: "q5", text: "对任何事物缺乏兴趣", factor: "depression" },
  { id: "q6", text: "对旁人责备求全", factor: "interpersonal_sensitivity" },
  { id: "q7", text: "感到别人能控制你的思想", factor: "psychoticism" },
  { id: "q8", text: "感到别人应为你的困难负责", factor: "paranoid_ideation" },
  { id: "q9", text: "忘性大", factor: "obsessive_compulsive" },
  { id: "q10", text: "担心自己的衣饰整齐及仪态的端正", factor: "obsessive_compulsive" },

  // 11-20
  { id: "q11", text: "容易烦恼和激动", factor: "hostility" },
  { id: "q12", text: "心脏跳动得很厉害", factor: "somatization" },
  { id: "q13", text: "害怕空旷的场所或街道", factor: "phobic_anxiety" },
  { id: "q14", text: "感到苦闷", factor: "depression" },
  { id: "q15", text: "哭泣", factor: "depression" },
  { id: "q16", text: "听到一些别人听不到的声音", factor: "psychoticism" },
  { id: "q17", text: "颤抖", factor: "anxiety" },
  { id: "q18", text: "感到大多数人都不可信任", factor: "paranoid_ideation" },
  { id: "q19", text: "胃口不好", factor: "additional" },
  { id: "q20", text: "感到受骗、中圈套或有人想抓住你的把柄", factor: "depression" },

  // 21-30
  { id: "q21", text: "感到害羞不自在", factor: "interpersonal_sensitivity" },
  { id: "q22", text: "感到孤独", factor: "depression" },
  { id: "q23", text: "突然的恐惧感", factor: "anxiety" },
  { id: "q24", text: "脾气发作不能控制", factor: "hostility" },
  { id: "q25", text: "害怕出门", factor: "phobic_anxiety" },
  { id: "q26", text: "责备自己", factor: "depression" },
  { id: "q27", text: "下腰痛", factor: "somatization" },
  { id: "q28", text: "感到难以完成任务", factor: "obsessive_compulsive" },
  { id: "q29", text: "感到寂寞", factor: "depression" },
  { id: "q30", text: "感到忧郁", factor: "depression" },

  // 31-40
  { id: "q31", text: "过分担忧", factor: "depression" },
  { id: "q32", text: "对事物不感兴趣", factor: "depression" },
  { id: "q33", text: "感到害怕", factor: "anxiety" },
  { id: "q34", text: "感到自己不受人欢迎", factor: "interpersonal_sensitivity" },
  { id: "q35", text: "别人知道你的私人想法", factor: "psychoticism" },
  { id: "q36", text: "感到人们对你不友善，不喜欢你", factor: "interpersonal_sensitivity" },
  { id: "q37", text: "感到比不上他人", factor: "interpersonal_sensitivity" },
  { id: "q38", text: "做事必须做得很慢以保证做得正确", factor: "obsessive_compulsive" },
  { id: "q39", text: "心跳得很厉害", factor: "anxiety" },
  { id: "q40", text: "恶心或胃部不舒服", factor: "somatization" },

  // 41-50
  { id: "q41", text: "感到人们不理解你、不同情你", factor: "interpersonal_sensitivity" },
  { id: "q42", text: "肌肉酸痛", factor: "somatization" },
  { id: "q43", text: "感到有人在监视你、谈论你", factor: "paranoid_ideation" },
  { id: "q44", text: "入睡困难", factor: "additional" },
  { id: "q45", text: "必须反复检查所做的事", factor: "obsessive_compulsive" },
  { id: "q46", text: "难以做出决定", factor: "obsessive_compulsive" },
  { id: "q47", text: "害怕乘电车、公共汽车", factor: "phobic_anxiety" },
  { id: "q48", text: "呼吸有困难", factor: "somatization" },
  { id: "q49", text: "身体发热或发冷", factor: "somatization" },
  { id: "q50", text: "必须避开某些东西、场所或活动，因为会使你害怕", factor: "phobic_anxiety" },

  // 51-60
  { id: "q51", text: "脑子里有不必要的想法", factor: "obsessive_compulsive" },
  { id: "q52", text: "手、足发麻或刺痛", factor: "somatization" },
  { id: "q53", text: "喉咙有梗塞感", factor: "somatization" },
  { id: "q54", text: "感到绝望或捕捉不到未来", factor: "depression" },
  { id: "q55", text: "注意力难以集中", factor: "obsessive_compulsive" },
  { id: "q56", text: "身体的某些部位软弱无力", factor: "somatization" },
  { id: "q57", text: "感到紧张或容易紧张", factor: "anxiety" },
  { id: "q58", text: "手或腿颤抖", factor: "somatization" },
  { id: "q59", text: "对异性的兴趣减退", factor: "additional" },
  { id: "q60", text: "睡眠不深", factor: "additional" },

  // 61-70
  { id: "q61", text: "感到对人疑心重", factor: "interpersonal_sensitivity" },
  { id: "q62", text: "有一些别人没有的想法", factor: "psychoticism" },
  { id: "q63", text: "想要打坏或伤害某些东西", factor: "hostility" },
  { id: "q64", text: "早醒", factor: "additional" },
  { id: "q65", text: "必须反复洗手、点数", factor: "obsessive_compulsive" },
  { id: "q66", text: "睡得太多", factor: "additional" },
  { id: "q67", text: "大叫或摔东西", factor: "hostility" },
  { id: "q68", text: "别人对你的成绩没有做出恰当的评价", factor: "paranoid_ideation" },
  { id: "q69", text: "感到自己的个性不讨人喜欢", factor: "interpersonal_sensitivity" },
  { id: "q70", text: "感到对食物、饮料或药物过敏", factor: "phobic_anxiety" },

  // 71-80
  { id: "q71", text: "感到事事都很困难重重", factor: "depression" },
  { id: "q72", text: "惊恐发作", factor: "anxiety" },
  { id: "q73", text: "与异性相处时感到不自在", factor: "interpersonal_sensitivity" },
  { id: "q74", text: "常与人争论", factor: "hostility" },
  { id: "q75", text: "在人群中感到不自在", factor: "phobic_anxiety" },
  { id: "q76", text: "感到别人想占你的便宜", factor: "paranoid_ideation" },
  { id: "q77", text: "感到孤单", factor: "psychoticism" },
  { id: "q78", text: "感到不安", factor: "anxiety" },
  { id: "q79", text: "感到自己没有什么价值", factor: "depression" },
  { id: "q80", text: "感到坐立不安或不安宁", factor: "anxiety" },

  // 81-90
  { id: "q81", text: "容易被人惹恼", factor: "hostility" },
  { id: "q82", text: "害怕独自出门", factor: "phobic_anxiety" },
  { id: "q83", text: "别人对你的想法和感情不理解", factor: "paranoid_ideation" },
  { id: "q84", text: "感到别人对你不怀好意", factor: "psychoticism" },
  { id: "q85", text: "感到人们对你不友善", factor: "psychoticism" },
  { id: "q86", text: "感到罪恶感", factor: "anxiety" },
  { id: "q87", text: "感到心烦意乱", factor: "psychoticism" },
  { id: "q88", text: "感到孤独即使和人在一起", factor: "psychoticism" },
  { id: "q89", text: "有罪恶感", factor: "additional" },
  { id: "q90", text: "从未感到和其他人很亲近", factor: "psychoticism" }
];

// 症状因子定义
export const SCL90_FACTORS: SCL90Factor[] = [
  {
    name: "somatization",
    label: "躯体化",
    description: "反映主观的身体不适感",
    questions: ["q1", "q4", "q12", "q27", "q40", "q42", "q48", "q49", "q52", "q53", "q56", "q58"]
  },
  {
    name: "obsessive_compulsive",
    label: "强迫症状",
    description: "强迫思维和强迫行为",
    questions: ["q3", "q9", "q10", "q28", "q38", "q45", "q46", "q51", "q55", "q65"]
  },
  {
    name: "interpersonal_sensitivity",
    label: "人际关系敏感",
    description: "人际交往中的自卑感、心神不安和消极期待",
    questions: ["q6", "q21", "q34", "q36", "q37", "q41", "q61", "q69", "q73"]
  },
  {
    name: "depression",
    label: "抑郁",
    description: "与临床上抑郁症状群相联系",
    questions: ["q5", "q14", "q15", "q20", "q22", "q26", "q29", "q30", "q31", "q32", "q54", "q71", "q79"]
  },
  {
    name: "anxiety",
    label: "焦虑",
    description: "焦虑情绪和体验",
    questions: ["q2", "q17", "q23", "q33", "q39", "q57", "q72", "q78", "q80", "q86"]
  },
  {
    name: "hostility",
    label: "敌对性",
    description: "愤怒、攻击、烦躁等思想感情和行为",
    questions: ["q11", "q24", "q63", "q67", "q74", "q81"]
  },
  {
    name: "phobic_anxiety",
    label: "恐怖",
    description: "与广场恐怖症类似的行为",
    questions: ["q13", "q25", "q47", "q50", "q70", "q75", "q82"]
  },
  {
    name: "paranoid_ideation",
    label: "偏执",
    description: "偏执性思维，如猜疑、关系观念等",
    questions: ["q8", "q18", "q43", "q68", "q76", "q83"]
  },
  {
    name: "psychoticism",
    label: "精神病性",
    description: "反映各式各样的急性症状和行为",
    questions: ["q7", "q16", "q35", "q62", "q77", "q84", "q85", "q87", "q88", "q90"]
  }
];

// 评分标准
export const SCL90_SCORING = {
  // 因子分计算：该因子各项目分数之和 / 该因子的项目数
  // 总分：90个项目分数之和
  // 阳性项目数：单项分 ≥ 2 分的项目数
  // 阴性项目数：单项分 = 1 分的项目数  
  // 阳性症状痛苦水平：阳性项目分数之和 / 阳性项目数

  // 中国常模参考值
  norms: {
    total: { mean: 129.96, sd: 38.76 },
    positive: { mean: 36.64, sd: 15.73 },
    negative: { mean: 53.36, sd: 15.73 },
    average: { mean: 1.44, sd: 0.43 },
    psi: { mean: 1.93, sd: 0.31 },
    factors: {
      somatization: { mean: 1.34, sd: 0.45 },
      obsessive_compulsive: { mean: 1.68, sd: 0.58 },
      interpersonal_sensitivity: { mean: 1.48, sd: 0.56 },
      depression: { mean: 1.49, sd: 0.59 },
      anxiety: { mean: 1.42, sd: 0.43 },
      hostility: { mean: 1.48, sd: 0.56 },
      phobic_anxiety: { mean: 1.23, sd: 0.41 },
      paranoid_ideation: { mean: 1.40, sd: 0.57 },
      psychoticism: { mean: 1.29, sd: 0.42 }
    }
  },

  // 严重程度判断标准
  severity: {
    normal: { min: 1, max: 1.9 },
    mild: { min: 2, max: 2.9 },
    moderate: { min: 3, max: 3.9 },
    severe: { min: 4, max: 5 }
  }
};
