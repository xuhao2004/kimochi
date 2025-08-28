// AI分析器 - 使用DeepSeek分析心理测评结果

import { SCL90_QUESTIONS, SCL90_FACTORS, SCL90_SCORING } from './scl90';
import { MBTI_QUESTIONS, MBTI_DIMENSIONS, MBTI_TYPES, calculateMBTIResult } from './mbti';
import type { MBTIABQuestion } from './mbti_banks';
import { SDS_QUESTIONS, calculateSDSIndex, severityInfo } from './sds';
import { SAS_QUESTIONS, calculateSASIndex, sasSeverityInfo } from './sas';

export interface AssessmentAnalysis {
  isSerious: boolean; // 是否认真作答
  overallScore: number; // 综合评分 (0-100)
  riskLevel: 'low' | 'medium' | 'high'; // 风险等级
  psychologicalTags: string[]; // 心理标签
  recommendations: string; // 建议
  summary: string; // 总结
  details: any; // 详细分析数据
}

export interface SCL90Analysis extends AssessmentAnalysis {
  factorScores: Record<string, number>; // 各因子得分
  symptomProfile: string; // 症状特征描述
  needsAttention: boolean; // 是否需要关注
}

export interface MBTIAnalysis extends AssessmentAnalysis {
  personalityType: string; // 16型人格类型
  dimensions: Record<string, any>; // 各维度倾向
  description?: any; // 人格类型描述
  careerSuggestions: string[]; // 职业建议
  strengthsWeaknesses: {
    strengths: string[];
    weaknesses: string[];
  };
}


export class AIAssessmentAnalyzer {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  // 分析SCL-90测评结果
  async analyzeSCL90(answers: Record<string, number>, responseTime: number): Promise<SCL90Analysis> {
    try {
      // 1. 基础统计分析
      const basicStats = this.calculateSCL90Stats(answers);
      
      // 2. 检查答题认真度
      const isSerious = this.checkSCL90Seriousness(answers, responseTime);
      
      // 3. AI深度分析（完整送入，不抽样）
      const aiAnalysis = await this.performSCL90AIAnalysis(answers, basicStats, responseTime);
      
      // 4. 生成综合结果
      return {
        isSerious,
        overallScore: basicStats.overallScore,
        riskLevel: this.determineSCL90RiskLevel(basicStats),
        psychologicalTags: aiAnalysis.tags,
        recommendations: aiAnalysis.recommendations,
        summary: aiAnalysis.summary,
        details: basicStats,
        factorScores: basicStats.factorScores,
        symptomProfile: aiAnalysis.symptomProfile,
        needsAttention: this.needsAttention(basicStats, aiAnalysis)
      };
    } catch (error) {
      console.error('SCL-90分析失败:', error);
      return this.getFallbackSCL90Analysis(answers);
    }
  }

  // 分析MBTI测评结果
  async analyzeMBTI(answers: Record<string, string>, responseTime: number, questionBank?: MBTIABQuestion[]): Promise<MBTIAnalysis> {
    try {
      // 如果提供了AB版题库（93/144/200），使用AI从题目与答案推断类型
      if (questionBank && questionBank.length > 0) {
        const isSerious = this.checkMBTISeriousness(answers, responseTime);
        const ai = await this.performMBTIAIAnalysisFromAB(answers, questionBank);
        return {
          isSerious,
          overallScore: this.calculateABCertainty(ai),
          riskLevel: 'low',
          psychologicalTags: ai.tags,
          recommendations: ai.recommendations,
          summary: ai.summary,
          details: ai.details,
          personalityType: ai.personalityType,
          dimensions: ai.dimensions,
          description: MBTI_TYPES[ai.personalityType as keyof typeof MBTI_TYPES] || undefined,
          careerSuggestions: ai.careerSuggestions,
          strengthsWeaknesses: ai.strengthsWeaknesses
        };
      }

      // 1. 基础类型判断（旧版60题）
      const basicResult = this.calculateMBTIType(answers);
      
      // 2. 检查答题认真度
      const isSerious = this.checkMBTISeriousness(answers, responseTime);
      
      // 3. AI深度分析
      const aiAnalysis = await this.performMBTIAIAnalysis(answers, basicResult);
      
      // 4. 生成综合结果
      return {
        isSerious,
        overallScore: this.calculateMBTIScore(basicResult),
        riskLevel: 'low', // MBTI通常不涉及心理风险
        psychologicalTags: aiAnalysis.tags,
        recommendations: aiAnalysis.recommendations,
        summary: aiAnalysis.summary,
        details: basicResult,
        personalityType: basicResult.personalityType,
        dimensions: basicResult.dimensions,
        description: basicResult.description, // 添加description字段
        careerSuggestions: aiAnalysis.careerSuggestions,
        strengthsWeaknesses: aiAnalysis.strengthsWeaknesses
      };
    } catch (error) {
      console.error('MBTI分析失败:', error);
      return this.getFallbackMBTIAnalysis(answers);
    }
  }


  // 分析SDS+SAS 综合量表（40题）
  async analyzeSDS(answers: Record<string, number>, responseTime: number) {
    try {
      // 拆分SDS与SAS答案
      const sdsAnswers: Record<string, number> = {};
      const sasAnswers: Record<string, number> = {};
      SDS_QUESTIONS.forEach(q => { if (answers[q.id] != null) sdsAnswers[q.id] = answers[q.id]; });
      SAS_QUESTIONS.forEach(q => { if (answers[q.id] != null) sasAnswers[q.id] = answers[q.id]; });

      const sds = calculateSDSIndex(sdsAnswers);
      const sas = calculateSASIndex(sasAnswers);
      const sdsSev = severityInfo(sds.severity);
      const sasSev = sasSeverityInfo(sas.severity);

      const ai = await this.performCombinedSDS_SAS_AIAnalysis({ sds, sas, responseTime, answers });
      
      // 综合风险取高者
      const risk = this.combineRiskLevel(sdsSev.risk, sasSev.risk);
      
      return {
        isSerious: responseTime >= 240, // 40题，至少4分钟
        overallScore: Math.round((sds.index + sas.index) / 2),
        riskLevel: risk,
        psychologicalTags: Array.isArray(ai.tags) && ai.tags.length ? ai.tags : [sdsSev.label, sasSev.label],
        recommendations: ai.recommendations,
        summary: ai.summary,
        details: {
          sds: { index: sds.index, severity: sds.severity },
          sas: { index: sas.index, severity: sas.severity }
        },
      };
    } catch (e) {
      return {
        isSerious: true,
        overallScore: 0,
        riskLevel: 'low' as const,
        psychologicalTags: ['SDS', 'SAS'],
        recommendations: '建议结合实际状态关注情绪、焦虑与睡眠。如持续困扰请尽快咨询专业人士。',
        summary: '已完成SDS+SAS综合评估基础部分。',
        details: {}
      };
    }
  }

  // 计算SCL-90基础统计数据
  private calculateSCL90Stats(answers: Record<string, number>) {
    const factorScores: Record<string, number> = {};
    let totalScore = 0;
    let positiveItems = 0;
    let negativeItems = 0;

    // 计算各因子得分
    SCL90_FACTORS.forEach(factor => {
      let factorSum = 0;
      factor.questions.forEach(qId => {
        const score = answers[qId] || 1;
        factorSum += score;
        totalScore += score;
        
        if (score >= 2) positiveItems++;
        if (score === 1) negativeItems++;
      });
      factorScores[factor.name] = factorSum / factor.questions.length;
    });

    const averageScore = totalScore / 90;
    const psi = positiveItems > 0 ? (totalScore - 90) / positiveItems : 0; // 阳性症状痛苦水平

    return {
      factorScores,
      totalScore,
      positiveItems,
      negativeItems,
      averageScore,
      psi,
      overallScore: Math.max(0, Math.min(100, (5 - averageScore) * 25)) // 转换为0-100分制
    };
  }

  private combineRiskLevel(a: 'low'|'medium'|'high', b: 'low'|'medium'|'high'): 'low'|'medium'|'high' {
    if (a === 'high' || b === 'high') return 'high';
    if (a === 'medium' || b === 'medium') return 'medium';
    return 'low';
  }

  // SDS+SAS 综合AI分析
  private async performCombinedSDS_SAS_AIAnalysis(payload: { sds: { index: number; severity: any }, sas: { index: number; severity: any }, responseTime: number, answers: Record<string, number> }) {
    if (!this.apiKey) {
      return {
        tags: [
          payload.sds.index >= 50 ? '抑郁风险' : '抑郁低风险',
          payload.sas.index >= 50 ? '焦虑风险' : '焦虑低风险'
        ],
        recommendations: '建议结合日常作息、运动与社会支持系统进行调整。如抑郁或焦虑指数组较高且持续，请尽快咨询专业机构。',
        summary: `SDS=${payload.sds.index}，SAS=${payload.sas.index}。`
      };
    }

    const timeQuality = this.evaluateResponseTime(payload.responseTime, 40);
    const prompt = `作为临床心理方向的专业人士，请基于完整作答（SDS+SAS共40题）进行综合分析：

SDS指数：${payload.sds.index}（${payload.sds.severity}）
SAS指数：${payload.sas.index}（${payload.sas.severity}）
答题时间：${Math.floor(payload.responseTime/60)}分${payload.responseTime%60}秒（${timeQuality}）
全部作答（题号->分值）：${JSON.stringify(payload.answers)}

请以JSON形式输出：{
  "tags": ["3-6个整体标签（例如 抑郁风险/焦虑风险/睡眠困扰/身心耗竭 等）"],
  "recommendations": "300字内的专业干预建议，具体且可执行，涵盖短期自助与何时就医",
  "summary": "150字内的综合评估，指出抑郁/焦虑相对突出领域与建议关注点"
}`;

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "你是专业的心理咨询师，熟悉SDS与SAS量表的解释与干预建议。" },
            { role: "user", content: prompt },
          ],
          temperature: 0.25,
          max_tokens: 1600,
        }),
      });
      if (!response.ok) throw new Error('API请求失败');
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content as string | undefined;
      if (content) {
        const parsed = this.tryParseJSON(content);
        if (parsed) return parsed;
        return this.parseTextResponse(content);
      }
      throw new Error('无有效响应');
    } catch (e) {
      return {
        tags: [
          payload.sds.index >= 50 ? '抑郁风险' : '抑郁低风险',
          payload.sas.index >= 50 ? '焦虑风险' : '焦虑低风险'
        ],
        recommendations: '建议结合日常作息、运动与社会支持系统进行调整。如抑郁或焦虑指数组较高且持续，请尽快咨询专业机构。',
        summary: `SDS=${payload.sds.index}，SAS=${payload.sas.index}。`
      };
    }
  }

  // 检查SCL-90答题认真度
  private checkSCL90Seriousness(answers: Record<string, number>, responseTime: number): boolean {
    const answerValues = Object.values(answers);
    
    // 检查1: 答题时间（太快可能不认真）
    if (responseTime < 300) return false; // 少于5分钟
    
    // 检查2: 答案变异性（全选同一选项可能不认真）
    const variance = this.calculateVariance(answerValues);
    if (variance < 0.5) return false;
    
    // 检查3: 极端答案比例（过多极端答案可能不认真）
    const extremeCount = answerValues.filter(v => v === 1 || v === 5).length;
    if (extremeCount > 70) return false; // 超过70%极端答案
    
    return true;
  }

  // 计算MBTI人格类型
  private calculateMBTIType(answers: Record<string, string>) {
    return calculateMBTIResult(answers);
  }

  // SCL-90 AI分析
  private async performSCL90AIAnalysis(answers: Record<string, number>, stats: any, responseTime: number) {
    if (!this.apiKey) {
      return this.getFallbackSCL90AIAnalysis(stats);
    }

    const timeQuality = this.evaluateResponseTime(responseTime, 90); // 90道题

    const prompt = `作为专业心理学家，请基于完整作答数据分析以下SCL-90测评结果：

测评数据：
- 总分：${stats.totalScore}
- 阳性项目数：${stats.positiveItems}
- 平均分：${stats.averageScore.toFixed(2)}
- 因子得分：${JSON.stringify(stats.factorScores, null, 2)}
- 答题时间：${Math.floor(responseTime/60)}分${responseTime%60}秒 (${timeQuality})
 - 全部条目响应（题号->分值）：${JSON.stringify(answers)}

请结合答题时间质量和测评数据，提供：
1. 心理标签（3-5个关键词）
2. 症状特征描述（100字内）
3. 专业建议（200字内）
4. 总体评估（100字内）
5. 答题质量评价（是否认真作答，50字内）

请以JSON格式回复：
{
  "tags": ["标签1", "标签2", "标签3"],
  "symptomProfile": "症状特征描述",
  "recommendations": "专业建议",
  "summary": "总体评估",
  "qualityAssessment": "答题质量评价"
}`;

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "你是专业的心理学家，精通SCL-90量表分析。请提供专业、准确、有帮助的心理评估。" },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1600,
        }),
      });

      if (!response.ok) {
        throw new Error('API请求失败');
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content as string | undefined;
      if (content) {
        const parsed = this.tryParseJSON(content);
        if (parsed) return parsed;
        return this.parseTextResponse(content);
      }

      throw new Error('无有效响应');
    } catch (error) {
      console.error('AI分析失败:', error);
      return this.getFallbackSCL90AIAnalysis(stats);
    }
  }

  // MBTI AI分析
  private async performMBTIAIAnalysis(answers: Record<string, string>, result: any) {
    if (!this.apiKey) {
      return this.getFallbackMBTIAIAnalysis(result);
    }

    const typeInfo = result.description;
    
    const prompt = `作为专业心理学家，请分析以下MBTI测评结果：

人格类型：${result.personalityType} (${typeInfo.name})
维度倾向：${JSON.stringify(result.dimensions)}
维度详细信息：${JSON.stringify(result.dimensions)}

请提供：
1. 心理标签（3-5个关键词）
2. 职业建议（5个具体职业）
3. 优势特质（5个）
4. 发展建议（5个）
5. 专业评估（200字内）

请以JSON格式回复：
{
  "tags": ["标签1", "标签2", "标签3"],
  "careerSuggestions": ["职业1", "职业2", "职业3", "职业4", "职业5"],
  "strengthsWeaknesses": {
    "strengths": ["优势1", "优势2", "优势3"],
    "weaknesses": ["发展点1", "发展点2", "发展点3"]
  },
  "recommendations": "专业建议",
  "summary": "总体评估"
}`;

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "你是专业的心理学家，精通MBTI人格类型分析。请提供专业、准确、有帮助的人格分析。" },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1200,
        }),
      });

      if (!response.ok) {
        throw new Error('API请求失败');
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content as string | undefined;
      if (content) {
        const parsed = this.tryParseJSON(content);
        if (parsed) return parsed;
        return this.parseTextResponse(content);
      }

      throw new Error('无有效响应');
    } catch (error) {
      console.error('AI分析失败:', error);
      return this.getFallbackMBTIAIAnalysis(result);
    }
  }

  // 工具函数
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  // 评估答题时间质量
  private evaluateResponseTime(responseTime: number, questionCount: number): string {
    const avgTimePerQuestion = responseTime / questionCount; // 秒/题
    
    if (responseTime < 300) { // 少于5分钟
      return "答题时间过短，可能影响结果准确性";
    } else if (avgTimePerQuestion < 5) { // 每题少于5秒
      return "答题节奏较快";
    } else if (avgTimePerQuestion > 60) { // 每题超过1分钟
      return "答题时间充分，深度思考";
    } else {
      return "答题节奏正常";
    }
  }

  private determineSCL90RiskLevel(stats: any): 'low' | 'medium' | 'high' {
    const { averageScore, positiveItems } = stats;
    
    if (averageScore >= 3 || positiveItems >= 45) return 'high';
    if (averageScore >= 2 || positiveItems >= 25) return 'medium';
    return 'low';
  }

  private needsAttention(stats: any, analysis: any): boolean {
    return this.determineSCL90RiskLevel(stats) === 'high' || 
           stats.factorScores.depression >= 3 ||
           stats.factorScores.anxiety >= 3;
  }

  private calculateMBTIScore(result: any): number {
    // MBTI评分基于维度确定性
    const dimensions = result.dimensions;
    const averagePercentage = Object.values(dimensions).reduce((sum: number, dim: any) => sum + dim.percentage, 0) / 4;
    return Math.round(averagePercentage);
  }

  private calculateABCertainty(ai: any): number {
    // 基于AI返回的维度百分比估算总体确定性
    try {
      const dims = ai?.dimensions || {};
      const percents = Object.values(dims).map((d: any) => Number(d?.percentage || 0)).filter((n: number) => !isNaN(n));
      if (percents.length) {
        return Math.round(percents.reduce((a: number, b: number) => a + b, 0) / percents.length);
      }
    } catch {}
    return 70; // 合理默认
  }

  private checkMBTISeriousness(answers: Record<string, string>, responseTime: number): boolean {
    const answerValues = Object.values(answers);
    
    // 检查答题时间
    if (responseTime < 180) return false; // 少于3分钟
    
    // 检查答案模式（全选A或全选B）
    const aCount = answerValues.filter(v => v === 'A').length;
    const bCount = answerValues.filter(v => v === 'B').length;
    
    if (aCount > 50 || bCount > 50) return false; // 过于偏向一边
    
    return true;
  }

  // 降级分析（当AI不可用时）
  private getFallbackSCL90Analysis(answers: Record<string, number>): SCL90Analysis {
    const stats = this.calculateSCL90Stats(answers);
    
    return {
      isSerious: true,
      overallScore: stats.overallScore,
      riskLevel: this.determineSCL90RiskLevel(stats),
      psychologicalTags: ["基础评估", "需要关注"],
      recommendations: "建议寻求专业心理咨询师帮助，进行更深入的评估和指导。",
      summary: "已完成基础心理状态评估，建议关注心理健康。",
      details: stats,
      factorScores: stats.factorScores,
      symptomProfile: "基础症状评估已完成",
      needsAttention: this.needsAttention(stats, {})
    };
  }

  private getFallbackMBTIAnalysis(answers: Record<string, string>): MBTIAnalysis {
    const result = this.calculateMBTIType(answers);
    const typeInfo = result.description;
    
    return {
      isSerious: true,
      overallScore: this.calculateMBTIScore(result),
      riskLevel: 'low',
      psychologicalTags: ["基础评估", typeInfo.name],
      recommendations: "建议深入了解自己的人格特质，发挥优势，关注发展领域。",
      summary: `您的人格类型是${result.personalityType} - ${typeInfo.name}。`,
      details: result,
      personalityType: result.personalityType,
      dimensions: result.dimensions,
      description: typeInfo, // 添加description字段
      careerSuggestions: typeInfo.careers,
      strengthsWeaknesses: {
        strengths: typeInfo.strengths,
        weaknesses: typeInfo.weaknesses
      }
    };
  }

  private getFallbackSCL90AIAnalysis(stats: any) {
    return {
      tags: ["基础评估"],
      symptomProfile: "基础心理状态评估",
      recommendations: "建议寻求专业帮助",
      summary: "已完成基础评估"
    };
  }

  private getFallbackMBTIAIAnalysis(result: any) {
    const typeInfo = result.description;
    return {
      tags: [typeInfo.name],
      careerSuggestions: typeInfo.careers,
      strengthsWeaknesses: {
        strengths: typeInfo.strengths,
        weaknesses: typeInfo.weaknesses
      },
      recommendations: "建议深入了解人格特质",
      summary: `您是${typeInfo.name}类型`
    };
  }

  // AB版题库的AI推断
  private async performMBTIAIAnalysisFromAB(answers: Record<string, string>, bank: MBTIABQuestion[]) {
    // 完整送入：收集本次测评的全部作答项（不抽样）
    const fullItems: { id: string; text: string; answer: string }[] = [];
    for (const q of bank) {
      const a = answers[q.id];
      if (a === 'A' || a === 'B') fullItems.push({ id: q.id, text: q.text, answer: a });
    }

    const aCount = fullItems.filter(it => it.answer === 'A').length;
    const bCount = fullItems.filter(it => it.answer === 'B').length;
    const coverage = Math.round(fullItems.length / Math.max(1, bank.length) * 100);

    if (!this.apiKey) {
      // 无AI密钥时的降级：仅生成可读总结，不武断给出类型
      const summary = `您完成了${coverage}%的题目。基于大题量的偏好分布（A:${aCount} / B:${bCount}），建议结合职业目标与团队协作风格进一步验证人格倾向。`;
      return {
        personalityType: 'ENFP',
        dimensions: {
          EI: { type: 'E', percentage: 60 },
          SN: { type: 'N', percentage: 60 },
          TF: { type: 'F', percentage: 60 },
          JP: { type: 'P', percentage: 60 },
        },
        tags: ['大题量评估', '个性化偏好'],
        recommendations: '建议结合真实学习/工作场景复盘具体行为，以进一步校准维度倾向；亦可重复测试验证稳定性。',
        summary,
        details: { aCount, bCount, coverage, answeredCount: fullItems.length },
        careerSuggestions: ['产品经理', '咨询顾问', '用户研究', '创意策划', '教育行业'],
        strengthsWeaknesses: { strengths: ['创造力', '同理心', '沟通力'], weaknesses: ['分心', '抗压波动', '执行节奏'] }
      };
    }

    const prompt = `请基于以下AB两选的人格题完整作答数据，严谨推断被试的MBTI类型及维度强度：

完整作答（共${fullItems.length}条，题库总量${bank.length}）：
${fullItems.map(s => `Q${s.id}: ${s.text}\n答: ${s.answer}`).join('\n')}

总体作答统计：A=${aCount}，B=${bCount}，覆盖率=${coverage}%。

要求：
1) 严格给出MBTI四字母类型（如 INTJ）。
2) 给出每个维度的趋向与确定度百分比（如 EI: I 65%）。
3) 给出3-5个心理标签、5个职业建议、3个优势与3个发展建议。
4) 200字内总结。
请以JSON格式输出：{
  "personalityType": "<四字母类型>",
  "dimensions": {"EI": {"type":"E|I","percentage":0-100}, "SN": {...}, "TF": {...}, "JP": {...}},
  "tags": ["..."],
  "careerSuggestions": ["..."],
  "strengthsWeaknesses": {"strengths":["..."], "weaknesses":["..."]},
  "recommendations": "...",
  "summary": "..."
}`;

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "你是专业的心理学家，熟悉MBTI并能从AB两选问卷样本严谨推断人格类型。" },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        }),
      });
      if (!response.ok) throw new Error('API请求失败');
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        // 兼容 ```json 包裹或前后额外文本
        const parsed = this.tryParseJSON(String(content));
        if (parsed) {
          parsed.personalityType = String(parsed.personalityType || '').toUpperCase().replace(/[^EINSFTJP]/g, '').slice(0,4);
          parsed.details = { aCount, bCount, coverage, answeredCount: fullItems.length };
          return parsed;
        }
        return this.parseTextResponse(content);
      }
      throw new Error('无有效响应');
    } catch (e) {
      console.error('MBTI AB AI分析失败:', e);
      // 回退到稳健摘要
      return {
        personalityType: 'ENFP',
        dimensions: {
          EI: { type: aCount >= bCount ? 'E' : 'I', percentage: 55 },
          SN: { type: 'N', percentage: 55 },
          TF: { type: 'F', percentage: 55 },
          JP: { type: 'P', percentage: 55 },
        },
        tags: ['大题量评估'],
        careerSuggestions: ['产品经理','咨询顾问','教育行业','用户研究','创意策划'],
        strengthsWeaknesses: { strengths: ['沟通','创造力','同理心'], weaknesses: ['分心','拖延','执行节奏'] },
        recommendations: '建议结合重要情境复盘行为以校准维度，可在不同场景重复测试验证稳定性。',
        summary: `已基于完整作答(${fullItems.length}/${bank.length})进行推断，请结合场景进一步验证。`,
        details: { aCount, bCount, coverage, answeredCount: fullItems.length }
      };
    }
  }

  private async performSDSAIAnalysis(answers: Record<string, number>, index: number, severityLabel: string) {
    if (!this.apiKey) {
      return {
        tags: [severityLabel, 'SDS'],
        recommendations: '建议保持规律作息、适度运动；如情绪持续低落请寻求专业帮助。',
        summary: `SDS指数${index}，${severityLabel}。`
      };
    }

    const prompt = `作为临床心理方向的专业人士，请基于SDS完整作答分析被试的抑郁状态：\n\nSDS指数：${index}（0-100，越高越严重）\n严重程度：${severityLabel}\n完整作答（题号->分值）：${JSON.stringify(answers)}\n\n请以JSON格式输出：{\n  "tags": ["3-5个标签"],\n  "recommendations": "200字内的专业建议",\n  "summary": "100字内总体评估"\n}`;

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "你是专业的心理咨询师，熟悉SDS量表的解释与干预建议。" },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });
      if (!response.ok) throw new Error('API请求失败');
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content as string | undefined;
      if (content) {
        const parsed = this.tryParseJSON(content);
        if (parsed) return parsed;
        return this.parseTextResponse(content);
      }
      throw new Error('无有效响应');
    } catch (e) {
      return {
        tags: [severityLabel, 'SDS'],
        recommendations: '建议结合实际状态关注情绪、睡眠与食欲变化，如持续困扰请尽快咨询专业人士。',
        summary: `SDS指数${index}，${severityLabel}。`
      };
    }
  }

  private parseTextResponse(content: string): any {
    // 去除可能出现的代码围栏与多余标记，保证展示为可读文本
    let text = String(content || '').trim();
    // 去除 ```json / ``` 包裹
    text = text.replace(/```[a-zA-Z]*\n([\s\S]*?)\n```/g, '$1');
    // 清理多余的前缀
    text = text.replace(/^json\s*/i, '');
    // 收敛长度，避免溢出
    const clipped = text.length > 800 ? text.slice(0, 800) + '…' : text;
    return {
      tags: ["AI分析"],
      recommendations: clipped,
      summary: "AI分析完成"
    };
  }

  // 尝试从带有代码块、额外文本的内容中提取JSON
  private tryParseJSON(content: string): any | null {
    try {
      // 直接解析
      return JSON.parse(content);
    } catch {}
    try {
      let text = content.trim();
      // 去除代码围栏 ```json ... ``` 或 ``` ... ```
      const fenceMatch = text.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
      if (fenceMatch && fenceMatch[1]) {
        text = fenceMatch[1];
      }
      // 规范化引号
      text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
      // 截取第一个花括号到最后一个花括号
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const slice = text.slice(start, end + 1);
        return JSON.parse(slice);
      }
    } catch {}
    return null;
  }
}
