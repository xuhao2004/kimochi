// SDS 抑郁自评量表（Zung Self-Rating Depression Scale）
// 标准版 20 题，四级评分（1-4），其中 10 题为反向计分

export interface SDSQuestion {
  id: string;
  text: string;
  reverse?: boolean; // 反向计分题
}

export const SDS_OPTIONS = [
  { value: 1, label: '从不或很少时间' },
  { value: 2, label: '少部分时间' },
  { value: 3, label: '相当多时间' },
  { value: 4, label: '绝大部分或全部时间' }
] as const;

// 参照国内通行中文条目（简洁表述，保留量表含义）
export const SDS_QUESTIONS: SDSQuestion[] = [
  { id: 's1', text: '我感到情绪低落、郁闷' },
  { id: 's2', text: '早晨我感觉最好', reverse: true },
  { id: 's3', text: '我容易哭或想哭' },
  { id: 's4', text: '我晚上睡眠不佳' },
  { id: 's5', text: '我吃饭味道差' },
  { id: 's6', text: '我对异性兴趣减少' },
  { id: 's7', text: '我感到体重减轻' },
  { id: 's8', text: '我为便秘所困扰' },
  { id: 's9', text: '心跳比平时快' },
  { id: 's10', text: '我白天容易疲乏' },
  { id: 's11', text: '我的思考像往常一样清楚', reverse: true },
  { id: 's12', text: '我感到做事情不顺利' },
  { id: 's13', text: '我坐立不安、难以平静' },
  { id: 's14', text: '我对未来仍充满希望', reverse: true },
  { id: 's15', text: '我对以往感兴趣的事仍有兴趣', reverse: true },
  { id: 's16', text: '我容易做决定', reverse: true },
  { id: 's17', text: '我感到自己有用、有价值', reverse: true },
  { id: 's18', text: '我生活得很有意义、满足', reverse: true },
  { id: 's19', text: '我比平时更容易激怒' },
  { id: 's20', text: '我觉得最好把自己了结' }
];

export type SDSSeverity = 'normal' | 'mild' | 'moderate' | 'severe';

export function calculateSDSIndex(answers: Record<string, number>) {
  // 原始分：将反向条目转换为 5 - 选项值
  let raw = 0;
  SDS_QUESTIONS.forEach(q => {
    const v = answers[q.id] ?? 1;
    raw += q.reverse ? (5 - v) : v;
  });
  // SDS 指数（标准分）= 原始分 × 1.25（0-100）
  const index = Math.round(raw * 1.25);
  let severity: SDSSeverity = 'normal';
  if (index >= 70) severity = 'severe';
  else if (index >= 60) severity = 'moderate';
  else if (index >= 50) severity = 'mild';
  return { raw, index, severity };
}

export function severityInfo(severity: SDSSeverity) {
  switch (severity) {
    case 'severe':
      return { label: '重度抑郁倾向', risk: 'high' as const };
    case 'moderate':
      return { label: '中度抑郁倾向', risk: 'medium' as const };
    case 'mild':
      return { label: '轻度抑郁倾向', risk: 'medium' as const };
    default:
      return { label: '无明显抑郁', risk: 'low' as const };
  }
}




