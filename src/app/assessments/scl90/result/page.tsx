"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface AnalysisResult {
  isSerious: boolean;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  psychologicalTags: string[];
  recommendations: string;
  summary: string;
  factorScores: Record<string, number>;
  symptomProfile: string;
  needsAttention: boolean;
}

interface Assessment {
  id: string;
  type: string;
  status: string;
  completedAt: string;
  analysisResult: AnalysisResult;
  overallScore: number;
  riskLevel: string;
  completionTime: number;
}

function SCL90ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams?.get('id');
  
  const [mounted, setMounted] = useState(false);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("token");
    
    if (t && assessmentId) {
      fetchResult(t, assessmentId);
    } else {
      router.push("/assessments");
    }
  }, [router, assessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchResult = async (authToken: string, id: string) => {
    try {
      const response = await fetch(`/api/assessments/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) {
        throw new Error("获取结果失败");
      }

      const data = await response.json();
      setAssessment(data.assessment);
    } catch (error) {
      console.error("获取测评结果失败:", error);
      alert("获取结果失败，请重试");
      router.push("/assessments");
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelInfo = (level: string) => {
    switch (level) {
      case 'high':
        return { label: '需要关注', color: 'text-red-600 bg-red-50 border-red-200', icon: '🚨' };
      case 'medium':
        return { label: '轻度关注', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: '⚠️' };
      default:
        return { label: '状态良好', color: 'text-green-600 bg-green-50 border-green-200', icon: '✅' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  const getFactorName = (factor: string) => {
    const factorNames: Record<string, string> = {
      somatization: '躯体化',
      obsessive_compulsive: '强迫症状',
      interpersonal_sensitivity: '人际关系敏感',
      depression: '抑郁',
      anxiety: '焦虑',
      hostility: '敌对性',
      phobic_anxiety: '恐怖',
      paranoid_ideation: '偏执',
      psychoticism: '精神病性'
    };
    return factorNames[factor] || factor;
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载测评结果...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <p className="text-gray-600">未找到测评结果</p>
          <Link
            href="/assessments"
            className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            返回测评中心
          </Link>
        </div>
      </div>
    );
  }

  const result = assessment.analysisResult;
  const riskInfo = getRiskLevelInfo(assessment.riskLevel);

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      {/* 苹果风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.05),transparent_50%)]" />

      <div className="min-h-[calc(100dvh-var(--nav-offset))] py-12 relative z-10 overflow-y-auto apple-scrollbar touch-scroll">
        <div className="max-w-4xl mx-auto px-6">
          
          {/* 标题区域 */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full mx-auto mb-6 flex items-center justify-center border border-black/[0.06] shadow-sm">
              <span className="text-rose-600 text-3xl">📊</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">
              SCL-90 测评结果
            </h1>
            <p className="text-gray-600">
              完成时间: {new Date(assessment.completedAt).toLocaleString('zh-CN')} · 
              用时: {formatTime(assessment.completionTime)}
            </p>
          </div>

          {/* 总体评估卡片 */}
          <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-8">
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* 综合评分 */}
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">综合评分</div>
                <div className={`text-4xl font-bold ${getScoreColor(assessment.overallScore)}`}>
                  {assessment.overallScore.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">满分100分</div>
              </div>

              {/* 风险等级 */}
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">风险等级</div>
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl border ${riskInfo.color}`}>
                  <span>{riskInfo.icon}</span>
                  <span className="font-medium">{riskInfo.label}</span>
                </div>
              </div>

              {/* 答题质量 */}
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">答题质量</div>
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl border ${
                  result.isSerious 
                    ? 'text-green-600 bg-green-50 border-green-200' 
                    : 'text-red-600 bg-red-50 border-red-200'
                }`}>
                  <span>{result.isSerious ? '✅' : '❌'}</span>
                  <span className="font-medium">{result.isSerious ? '认真作答' : '答题异常'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 心理标签 */}
          {result.psychologicalTags && result.psychologicalTags.length > 0 && (
            <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-blue-500 mr-2">🏷️</span>
                心理特征标签
              </h2>
              <div className="flex flex-wrap gap-3">
                {result.psychologicalTags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl border border-blue-200 text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 症状因子得分 */}
          {result.factorScores && (
            <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="text-purple-500 mr-2">📈</span>
                各症状因子得分
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(result.factorScores).map(([factor, score]) => (
                  <div key={factor} className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-black/[0.06]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {getFactorName(factor)}
                      </span>
                      <span className={`text-lg font-bold ${score >= 3 ? 'text-red-600' : score >= 2 ? 'text-amber-600' : 'text-green-600'}`}>
                        {score.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${score >= 3 ? 'bg-red-500' : score >= 2 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(score / 5 * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-500">
                评分说明：1.0-1.9 正常，2.0-2.9 轻度，3.0-3.9 中度，4.0-5.0 重度
              </div>
            </div>
          )}

          {/* AI分析与建议 */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            
            {/* 症状特征 */}
            {result.symptomProfile && (
              <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)]">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="text-green-500 mr-2">🔍</span>
                  症状特征分析
                </h3>
                <p className="text-gray-700 leading-relaxed">{result.symptomProfile}</p>
              </div>
            )}

            {/* 专业建议 */}
            <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-amber-500 mr-2">💡</span>
                专业建议
              </h3>
              <p className="text-gray-700 leading-relaxed">{result.recommendations}</p>
            </div>
          </div>

          {/* 总结 */}
          {result.summary && (
            <div className="rounded-2xl border border-black/[0.08] bg-gradient-to-r from-slate-50/80 to-gray-50/80 p-6 backdrop-blur-sm mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-slate-600 mr-2">📝</span>
                AI 总体评估
              </h3>
              <p className="text-gray-700 leading-relaxed">{result.summary}</p>
            </div>
          )}

          {/* 注意事项与操作按钮 */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* 注意事项 */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-50/80 to-yellow-50/80 p-6 border border-black/[0.06] backdrop-blur-sm">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="text-amber-500 mr-2">⚠️</span>
                重要提醒
              </h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• 本测评结果仅供参考，不能替代专业医学诊断</li>
                <li>• 如有持续的心理困扰，建议寻求专业心理咨询</li>
                <li>• 测评结果会保密存储，仅用于学术研究和个人记录</li>
                <li>• 心理状态会随时间变化，建议定期进行评估</li>
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-4">
              <Link 
                href="/assessments"
                className="block w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 hover:scale-[1.02] text-center font-medium shadow-sm"
              >
                返回测评中心
              </Link>
              
              <Link 
                href="/assessments/history"
                className="block w-full rounded-xl bg-white border border-black/[0.06] text-gray-700 py-4 hover:bg-gray-50 hover:scale-[1.02] transition-all duration-300 text-center font-medium shadow-sm"
              >
                查看测评历史
              </Link>

              <Link 
                href="/assessments/mbti"
                className="block w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 hover:scale-[1.02] text-center font-medium shadow-sm"
              >
                进行MBTI测试
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SCL90ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">加载测试结果...</p>
        </div>
      </div>
    }>
      <SCL90ResultContent />
    </Suspense>
  );
}
