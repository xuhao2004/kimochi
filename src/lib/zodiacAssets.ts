const zodiacOrder = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
];

// 将中文星座映射为英文文件名用词
const zhToEn: Record<string, string> = {
  '白羊座': 'Aries',
  '金牛座': 'Taurus',
  '双子座': 'Gemini',
  '巨蟹座': 'Cancer',
  '狮子座': 'Leo',
  '处女座': 'Virgo',
  '天秤座': 'Libra',
  '天蝎座': 'Scorpio',
  '射手座': 'Sagittarius',
  '摩羯座': 'Capricorn',
  '水瓶座': 'Aquarius',
  '双鱼座': 'Pisces'
};

export function getZodiacEnglishName(zodiacZh?: string | null): string | null {
  if (!zodiacZh) return null;
  return zhToEn[zodiacZh] || null;
}

export function getZodiacIconPath(zodiacZh?: string | null, ext: 'png' | 'svg' = 'png'): string {
  const en = getZodiacEnglishName(zodiacZh);
  if (!en) return '';
  // 资源为 `public/zodiac/{ext}/<index> <Name>.<ext>`。已知 Aries=1, Taurus=2, ...
  const index = zodiacOrder.indexOf(en) + 1;
  if (index <= 0) return '';
  return `/zodiac/${ext}/${index} ${en}.${ext}`;
}


