type DeepSeekResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function generateDailySentence(params: {
  zodiac: string;
  weather: string;
  locationName: string;
}): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const prompt = `你是一位温柔而专业的心理咨询师，请根据用户的星座（${params.zodiac}）与当地天气（${params.weather}，地点：${params.locationName}），生成一句不超过50字的中文每日鼓励语，风格简约温柔，避免陈词滥调。`;

  if (!apiKey) {
    // 本地无密钥时返回占位内容，避免阻塞流程
    return `今日在${params.locationName}（${params.weather}），愿${params.zodiac}的你被温柔以待。`;
  }

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是温柔的心理咨询师，擅长简洁疗愈表达。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 120,
    }),
  });

  if (!res.ok) {
    return `今日在${params.locationName}（${params.weather}），愿${params.zodiac}的你被温柔以待。`;
  }
  const data = (await res.json()) as DeepSeekResponse;
  let content = data.choices?.[0]?.message?.content?.trim();
  
  // 移除可能存在的引号
  if (content) {
    content = content.replace(/^["'"'""]|["'"'""]$/g, '').trim();
  }
  
  return content && content.length > 0
    ? content
    : `今日在${params.locationName}（${params.weather}），愿${params.zodiac}的你被温柔以待。`;
}


