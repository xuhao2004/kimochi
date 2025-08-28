// 优先加载已去重题库；如果不存在则退回到原始200题并在运行时去重
import deduped from '@/lib/assessments/mbti_bank_200_deduped.json';
import bank200 from '@/lib/assessments/mbti_bank_200.json';

export type MBTIABQuestion = {
  id: string;
  text: string;
  options: { A: string; B: string };
};

export type MBTIMode = 'quick' | 'pro';

let cached200: MBTIABQuestion[] | null = null;

function stripBoilerplate(input: string): string {
  // 去除常见模板/虚词，保留语义核心，增强相似度检测的敏感度
  return String(input || '')
    .replace(/^(当你|在|如果|是否|你是否|你觉得|你认为|通常|一般|平时|经常)/g, '')
    .replace(/(你更喜欢|你更倾向于|你倾向于|你认为自己是一个|你会更|你会更愿意|你会|你更)/g, '')
    .replace(/(倾向于|更喜欢|更愿意|通常|一般|经常|是否)/g, '')
    .replace(/(你|自己|他人|别人|大多数人)/g, '');
}

function normalize(text: string): string {
  return stripBoilerplate(String(text || ''))
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，。！？；：“”‘’（）【】、《》—…·、,.!?;:"'()\[\]{}<>\-_/\\`~@#$%^&*+=|]+/g, '');
}

function shingles(text: string, k = 3): Set<string> {
  const s = normalize(text);
  const out = new Set<string>();
  if (s.length <= k) { out.add(s); return out; }
  for (let i = 0; i <= s.length - k; i++) out.add(s.slice(i, i + k));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

function signatureForQuestion(q: MBTIABQuestion): Set<string> {
  // 使用题干+选项共同构建语义签名，捕捉模板化改写
  const combined = `${q.text} | ${q.options?.A || ''} | ${q.options?.B || ''}`;
  return shingles(combined, 3);
}

function stemSignature(q: MBTIABQuestion): string {
  return normalize(q.text);
}

function dedupeSemantically(questions: MBTIABQuestion[], threshold = 0.88): MBTIABQuestion[] {
  const kept: MBTIABQuestion[] = [];
  const sigs: Set<string>[] = [];
  const seenStem = new Set<string>();
  for (const q of questions) {
    // 第一步：按题干去重（完全相同或仅差虚词视为重复）
    const stem = stemSignature(q);
    if (stem && seenStem.has(stem)) continue;

    const sig = signatureForQuestion(q);
    let duplicate = false;
    for (let i = 0; i < sigs.length; i++) {
      const sim = jaccard(sig, sigs[i]);
      if (sim >= threshold) { duplicate = true; break; }
    }
    if (!duplicate) { kept.push(q); sigs.push(sig); seenStem.add(stem); }
  }
  return kept;
}

function loadMBTI200(): MBTIABQuestion[] {
  if (cached200) return cached200;
  try {
    const src = (deduped as any)?.questions && Array.isArray((deduped as any).questions) && (deduped as any).questions.length > 0
      ? (deduped as any).questions
      : (bank200 as any)?.questions;
    const questions = Array.isArray(src) ? src : [];
    const mapped = questions.map((q: any) => ({
      id: String(q.id),
      text: String(q.text || ''),
      options: {
        A: String(q.options?.A || 'A'),
        B: String(q.options?.B || 'B')
      }
    })) as MBTIABQuestion[];
    // 在运行时再做一次严格去重，避免文件缺失或未更新造成重复
    cached200 = dedupeSemantically(mapped, 0.88);
    return cached200;
  } catch (e) {
    cached200 = [];
    return cached200;
  }
}

// 新版：统一使用去重后的完整题库
export function getMBTIDedupedBank(): MBTIABQuestion[] {
  return loadMBTI200();
}

export function getMBTIModeInstruction(mode: MBTIMode) {
  if (mode === 'quick') {
    return '快速模式：从题库中随机抽取60题，约8-12分钟，适合快速了解人格倾向。';
  }
  return '专业模式：使用完整题库（109题），刻画更精细，结果更具个性化。请诚实作答。';
}


