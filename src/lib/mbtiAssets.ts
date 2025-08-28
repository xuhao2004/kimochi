export type GenderDir = 'male' | 'female' | 'nb';

export function mapGenderToDir(gender?: string | null): GenderDir {
  if (!gender) return 'nb';
  const g = String(gender).trim().toLowerCase();
  if (g === '男' || g === 'male' || g === 'm') return 'male';
  if (g === '女' || g === 'female' || g === 'f') return 'female';
  return 'nb';
}

export function normalizeMbtiType(type?: string | null): string {
  const raw = String(type || '').trim();
  if (!raw) return '';
  // 提取 4 位 MBTI 代码，兼容如 "ISTJ-物流师"、"INFP-T"、"ENTP | 辩论家" 等格式
  const match = raw.match(/[EI][SN][TF][JP]/i);
  return (match ? match[0] : raw).toUpperCase();
}

// 返回性别化或中性的人格类型图标路径（位于 public/mbti/...）
export function getMbtiIconPath(type?: string | null, gender?: string | null, preferNeutral: boolean = false): string {
  const t = normalizeMbtiType(type);
  if (!t) return '';
  if (!preferNeutral && gender) {
    const dir = mapGenderToDir(gender);
    return `/mbti/${dir}/${t}.png`;
  }
  return `/mbti/${t}.png`;
}

// 认知功能「主-辅」水晶（按 16 型），位于 public/cognitive-functions/dom-aux-crystals
export function getDomAuxCrystalPath(type?: string | null, ext: 'png' | 'svg' = 'png'): string {
  const t = normalizeMbtiType(type);
  if (!t) return '';
  return `/cognitive-functions/dom-aux-crystals/Boo ${t} cognitive function crystal.${ext}`;
}

// 认知功能水晶（按功能代码），位于 public/cognitive-functions/crystals
export function getFunctionCrystalPath(funcCode?: string | null, ext: 'png' | 'svg' = 'png'): string {
  const f = String(funcCode || '').trim();
  if (!f) return '';
  const norm = f[0]?.toUpperCase() + f.slice(1).toLowerCase(); // Ne, Ni, Se, Si, Te, Ti, Fe, Fi
  return `/cognitive-functions/crystals/Boo ${norm} cognitive function crystal.${ext}`;
}


