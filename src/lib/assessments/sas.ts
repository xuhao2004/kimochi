// SAS 焦虑自评量表（Zung Self-Rating Anxiety Scale）
// 标准版20题，四级评分（1-4），其中5、9、13、17、19为反向计分

export interface SASQuestion {
  id: string;
  text: string;
  reverse?: boolean;
}

export const SAS_OPTIONS = [
  { value: 1, label: '从不或很少时间' },
  { value: 2, label: '少部分时间' },
  { value: 3, label: '相当多时间' },
  { value: 4, label: '绝大部分或全部时间' }
] as const;

// 参照常用中文条目表述（简洁且不改变量表含义）
// 反向计分：第5、9、13、17、19题
export const SAS_QUESTIONS: SASQuestion[] = [
  { id: 'a1', text: '我觉得比平时更容易紧张或着急' },
  { id: 'a2', text: '我无缘无故地感到害怕' },
  { id: 'a3', text: '我容易心里烦乱或惊恐' },
  { id: 'a4', text: '我有种将要失去控制或发疯的感觉' },
  { id: 'a5', text: '我觉得一切都很好，也不会发生什么不幸', reverse: true },
  { id: 'a6', text: '我会手脚发抖（打颤）' },
  { id: 'a7', text: '我因为头痛、颈痛或背痛而苦恼' },
  { id: 'a8', text: '我感到容易衰弱和疲乏' },
  { id: 'a9', text: '我觉得心平气和，并容易安静坐着', reverse: true },
  { id: 'a10', text: '我觉得心跳得很快' },
  { id: 'a11', text: '我因为一阵阵头晕而苦恼' },
  { id: 'a12', text: '我有晕厥感或觉得要晕倒' },
  { id: 'a13', text: '我呼吸通畅，不会感到窒息', reverse: true },
  { id: 'a14', text: '我的手脚会麻木或刺痛' },
  { id: 'a15', text: '我因为胃痛或消化不良而苦恼' },
  { id: 'a16', text: '我常常需要小便' },
  { id: 'a17', text: '我的手脚通常是干燥温暖的', reverse: true },
  { id: 'a18', text: '我会面部潮红发热' },
  { id: 'a19', text: '我容易入睡并且一夜睡得很好', reverse: true },
  { id: 'a20', text: '我会做恶梦' }
];

export type SASSeverity = 'normal' | 'mild' | 'moderate' | 'severe';

export function calculateSASIndex(answers: Record<string, number>) {
  let raw = 0;
  SAS_QUESTIONS.forEach(q => {
    const v = answers[q.id] ?? 1;
    raw += q.reverse ? (5 - v) : v;
  });
  const index = Math.round(raw * 1.25);
  let severity: SASSeverity = 'normal';
  if (index >= 70) severity = 'severe';
  else if (index >= 60) severity = 'moderate';
  else if (index >= 50) severity = 'mild';
  return { raw, index, severity };
}

export function sasSeverityInfo(severity: SASSeverity) {
  switch (severity) {
    case 'severe':
      return { label: '重度焦虑倾向', risk: 'high' as const };
    case 'moderate':
      return { label: '中度焦虑倾向', risk: 'medium' as const };
    case 'mild':
      return { label: '轻度焦虑倾向', risk: 'medium' as const };
    default:
      return { label: '无明显焦虑', risk: 'low' as const };
  }
}


