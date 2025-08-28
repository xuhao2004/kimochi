// 星座计算工具函数
export function calculateZodiac(birthDate: Date): string {
  const month = birthDate.getMonth() + 1; // getMonth() 返回 0-11，需要加1
  const day = birthDate.getDate();

  // 星座日期范围
  const zodiacRanges = [
    { name: '水瓶座', start: [1, 20], end: [2, 18] },
    { name: '双鱼座', start: [2, 19], end: [3, 20] },
    { name: '白羊座', start: [3, 21], end: [4, 19] },
    { name: '金牛座', start: [4, 20], end: [5, 20] },
    { name: '双子座', start: [5, 21], end: [6, 21] },
    { name: '巨蟹座', start: [6, 22], end: [7, 22] },
    { name: '狮子座', start: [7, 23], end: [8, 22] },
    { name: '处女座', start: [8, 23], end: [9, 22] },
    { name: '天秤座', start: [9, 23], end: [10, 23] },
    { name: '天蝎座', start: [10, 24], end: [11, 22] },
    { name: '射手座', start: [11, 23], end: [12, 21] },
    { name: '摩羯座', start: [12, 22], end: [1, 19] }
  ];

  for (const zodiac of zodiacRanges) {
    const [startMonth, startDay] = zodiac.start;
    const [endMonth, endDay] = zodiac.end;

    // 处理跨年的星座（摩羯座和水瓶座）
    if (startMonth > endMonth) {
      if ((month === startMonth && day >= startDay) || 
          (month === endMonth && day <= endDay)) {
        return zodiac.name;
      }
    } else {
      // 普通星座
      if ((month === startMonth && day >= startDay) || 
          (month === endMonth && day <= endDay) ||
          (month > startMonth && month < endMonth)) {
        return zodiac.name;
      }
    }
  }

  return '未知';
}
