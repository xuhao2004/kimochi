"use client";
import React, { useState, useEffect, Suspense } from "react";
import { getDomAuxCrystalPath } from "@/lib/mbtiAssets";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Assessment {
  id: string;
  type: string;
  status: string;
  startedAt: string;
  completedAt: string;
  analysisResult: any; // 暂时使用any来避免类型错误
  recommendations: string;
}

function MBTIResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id');
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [fallbackTried, setFallbackTried] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      router.push('/assessments');
      return;
    }

    fetchAssessmentResult();
  }, [assessmentId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAssessmentResult = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取测评结果失败');
      }

      const data = await response.json();
      
      // 检查数据结构
      if (!data.assessment) {
        console.error('No assessment data');
        throw new Error('没有找到测评数据');
      }
      
      if (!data.assessment.analysisResult) {
        console.error('No analysis result');
        throw new Error('测评分析结果未完成，请稍后重试');
      }
      
      // 尝试解析 analysisResult 如果它是字符串
      let analysisResult = data.assessment.analysisResult;
      if (typeof analysisResult === 'string') {
        try {
          analysisResult = JSON.parse(analysisResult);
          data.assessment.analysisResult = analysisResult;
        } catch (e) {
          console.error('Failed to parse analysisResult:', e);
          throw new Error('测评结果格式异常');
        }
      }
      

      
      setAssessment(data.assessment);
    } catch (error) {
      console.error('获取测评结果失败:', error);
      // 使用友好的错误信息，避免暴露技术细节
      let errorMessage = '获取测评结果失败，请重试';
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('not found') || msg.includes('不存在')) {
          errorMessage = '测评结果不存在或已被删除';
        } else if (msg.includes('database') || msg.includes('prisma') || msg.includes('table')) {
          errorMessage = '系统暂时无法处理请求，请稍后重试';
        } else if (msg.includes('network') || msg.includes('fetch')) {
          errorMessage = '网络连接异常，请检查网络后重试';
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 读取当前用户性别
  useEffect(() => {
    const fetchUserGender = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const g = data?.user?.gender || null;
        setUserGender(g);
      } catch (_) {}
    };
    fetchUserGender();
  }, []);

  const mapGenderToDir = (g: string | null): 'male' | 'female' | 'nb' => {
    if (g === '男') return 'male';
    if (g === '女') return 'female';
    return 'nb';
  };

  // 根据用户性别与测评类型，决定首选与回退图片路径
  useEffect(() => {
    const t = String(assessment?.analysisResult?.personalityType || '').toUpperCase();
    if (!t) return;
    const dir = mapGenderToDir(userGender);
    const primary = dir ? `/mbti/${dir}/${t}.png` : `/mbti/${t}.png`;
    setImageSrc(primary);
    setImageError(false);
    setFallbackTried(false);
  }, [assessment, userGender]);

  const getDimensionColor = (type: string, dimension: string) => {
    const colors: Record<string, Record<string, string>> = {
      EI: { E: 'text-orange-600', I: 'text-purple-600' },
      SN: { S: 'text-green-600', N: 'text-blue-600' },
      TF: { T: 'text-red-600', F: 'text-pink-600' },
      JP: { J: 'text-indigo-600', P: 'text-yellow-600' }
    };
    return colors[dimension]?.[type] || 'text-gray-600';
  };

  const getDimensionName = (dimension: string, type: string) => {
    const names: Record<string, Record<string, string>> = {
      EI: { E: '外向型', I: '内向型' },
      SN: { S: '感觉型', N: '直觉型' },
      TF: { T: '思考型', F: '情感型' },
      JP: { J: '判断型', P: '知觉型' }
    };
    return names[dimension]?.[type] || type;
  };

  // 16型中文名与本地图像路径（/public/mbti/<TYPE>.png）。若图像不存在，将优雅降级为字母方块。
  const MBTI_META: Record<string, { label: string; image: string }> = {
    ISTJ: { label: '物流师', image: '/mbti/ISTJ.png' },
    ISFJ: { label: '守卫者', image: '/mbti/ISFJ.png' },
    INFJ: { label: '提倡者', image: '/mbti/INFJ.png' },
    INTJ: { label: '建筑师', image: '/mbti/INTJ.png' },
    ISTP: { label: '鉴赏家', image: '/mbti/ISTP.png' },
    ISFP: { label: '探险家', image: '/mbti/ISFP.png' },
    INFP: { label: '调停者', image: '/mbti/INFP.png' },
    INTP: { label: '逻辑学家', image: '/mbti/INTP.png' },
    ESTP: { label: '企业家', image: '/mbti/ESTP.png' },
    ESFP: { label: '表演者', image: '/mbti/ESFP.png' },
    ENFP: { label: '竞选者', image: '/mbti/ENFP.png' },
    ENTP: { label: '辩论家', image: '/mbti/ENTP.png' },
    ESTJ: { label: '总经理', image: '/mbti/ESTJ.png' },
    ESFJ: { label: '执政官', image: '/mbti/ESFJ.png' },
    ENFJ: { label: '主人公', image: '/mbti/ENFJ.png' },
    ENTJ: { label: '指挥官', image: '/mbti/ENTJ.png' },
  };

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

  if (error || !assessment) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '测评结果不存在'}</p>
          <Link
            href="/assessments"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            返回测评中心
          </Link>
        </div>
      </div>
    );
  }

  const analysisResult = assessment.analysisResult;
  const personalityType: string = String(analysisResult?.personalityType || '').toUpperCase();
  const meta = MBTI_META[personalityType] || { label: '', image: '' };
  const domAuxPathPng = personalityType ? getDomAuxCrystalPath(personalityType, 'png') : '';
  
  const extractTextFromPossiblyJSON = (input: any): string => {
    if (!input) return '';
    if (typeof input === 'string') {
      let text = input.trim();
      // 去除 ```json 包裹及其他代码围栏
      const fence = text.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
      if (fence && fence[1]) text = fence[1];
      // 尝试提取 JSON 中的 recommendations 字段
      try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const obj = JSON.parse(text.slice(start, end + 1));
          if (obj && typeof obj.recommendations === 'string') return obj.recommendations;
        }
      } catch {}
      return text;
    }
    return String(input || '');
  };
  
  const safeRecommendations = extractTextFromPossiblyJSON(analysisResult?.recommendations || assessment.recommendations);
  
  // 安全检查
  if (!analysisResult) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4">测评分析结果不完整</p>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-600">查看原始数据</summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(assessment, null, 2)}
            </pre>
          </details>
          <Link
            href="/assessments"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mt-4 inline-block"
          >
            返回测评中心
          </Link>
        </div>
      </div>
    );
  }
  


  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      {/* 苹果风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_50%)]" />

      <div className="min-h-[calc(100dvh-var(--nav-offset))] relative z-10 py-8 overflow-y-auto apple-scrollbar touch-scroll">
        <div className="max-w-4xl mx-auto px-6">
          

          
          {/* 头部卡片 */}
          <div className="rounded-3xl border border-black/[0.08] bg-white/80 backdrop-blur-xl p-8 shadow-[0_8px_32px_rgb(0,0,0,0.12)] mb-8">
            <div className="text-center">
              {imageSrc && !imageError ? (
                <img
                  src={imageSrc}
                  alt={personalityType}
                  className="inline-block w-28 h-28 rounded-3xl object-contain bg-white shadow-sm mb-6 border border-black/[0.06]"
                  onError={() => {
                    if (!fallbackTried) {
                      const neutral = `/mbti/${personalityType}.png`;
                      if (imageSrc !== neutral) {
                        setImageSrc(neutral);
                        setFallbackTried(true);
                        return;
                      }
                    }
                    setImageError(true);
                  }}
                />
              ) : (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-2xl font-bold mb-6">
                  {personalityType || '未知'}
                </div>
              )}

              {/* 认知功能水晶（主-辅） */}
              {domAuxPathPng && (
                <div className="mt-2">
                  <img
                    src={domAuxPathPng}
                    alt={`${personalityType} dom-aux crystal`}
                    className="inline-block w-24 h-24 object-contain opacity-90"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {personalityType ? `${personalityType}${meta.label ? ' - ' + meta.label : ''}` : '人格类型分析'}
              </h1>
              
              <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
                {analysisResult.summary || 'AI 正在生成您的人格类型分析'}
              </p>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>完成时间: {new Date(assessment.completedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 四个维度分析 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {analysisResult.dimensions && Object.keys(analysisResult.dimensions).length > 0 ? 
              Object.entries(analysisResult.dimensions).map(([dimension, data]: [string, any]) => (
                <div key={dimension} className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {dimension === 'EI' ? '能量倾向' : 
                     dimension === 'SN' ? '信息收集' :
                     dimension === 'TF' ? '决策方式' : '生活方式'}
                  </h3>
                  <span className={`text-2xl font-bold ${getDimensionColor(data?.type || '', dimension)}`}>
                    {data?.type || ''}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {getDimensionName(dimension, data?.type || '')}
                    </span>
                    <span className="text-sm text-gray-500">{data?.percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${data?.percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  {dimension === 'EI' ? 
                    (data?.type === 'E' ? '您更倾向于从外部世界获得能量，喜欢与人互动' : '您更倾向于从内心世界获得能量，偏好独处思考') :
                   dimension === 'SN' ?
                    (data?.type === 'S' ? '您更关注具体事实和细节，相信经验' : '您更关注可能性和整体概念，相信直觉') :
                   dimension === 'TF' ?
                    (data?.type === 'T' ? '您倾向于基于逻辑和客观分析做决定' : '您倾向于基于价值观和他人感受做决定') :
                    (data?.type === 'J' ? '您喜欢计划和结构化的生活方式' : '您喜欢灵活和适应性强的生活方式')
                  }
                </p>
                </div>
              )) : (
              <div className="col-span-full rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_4px_20px_rgb(0,0,0,0.08)] text-center">
                <p className="text-gray-500">维度分析数据正在处理中...</p>
              </div>
            )}
          </div>

          {/* 优势与劣势 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 优势 */}
            <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-green-500 mr-2">✨</span>
                核心优势
              </h3>
              <div className="space-y-2">
                {(analysisResult.strengthsWeaknesses?.strengths || []).length > 0 ? 
                  (analysisResult.strengthsWeaknesses.strengths).map((strength: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">{strength}</span>
                    </div>
                  )) : (
                    <div className="text-gray-500 text-sm">分析数据正在处理中...</div>
                  )
                }
              </div>
            </div>

            {/* 发展空间 */}
            <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-amber-500 mr-2">🎯</span>
                发展空间
              </h3>
              <div className="space-y-2">
                {(analysisResult.strengthsWeaknesses?.weaknesses || []).length > 0 ? 
                  (analysisResult.strengthsWeaknesses.weaknesses).map((weakness: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-gray-700">{weakness}</span>
                    </div>
                  )) : (
                    <div className="text-gray-500 text-sm">分析数据正在处理中...</div>
                  )
                }
              </div>
            </div>
          </div>

          {/* 适合的职业 */}
          <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-blue-500 mr-2">💼</span>
              适合的职业方向
            </h3>
            <div className="flex flex-wrap gap-2">
              {(analysisResult.careerSuggestions || []).length > 0 ? 
                (analysisResult.careerSuggestions).map((career: any, index: number) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl border border-blue-200 text-sm font-medium"
                  >
                    {career}
                  </span>
                )) : (
                  <div className="text-gray-500 text-sm">职业建议正在分析中...</div>
                )
              }
            </div>
          </div>

          {/* 专业建议 */}
          {safeRecommendations && (
            <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-purple-500 mr-2">💡</span>
                专业建议
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{safeRecommendations}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/assessments"
              className="flex-1 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 py-4 hover:from-gray-200 hover:to-gray-300 transition-all duration-300 hover:scale-[1.02] text-center font-medium border border-gray-300"
            >
              返回测评中心
            </Link>
            
            <Link 
              href="/assessments/history"
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 py-4 hover:from-blue-200 hover:to-indigo-200 transition-all duration-300 hover:scale-[1.02] text-center font-medium border border-blue-300"
            >
              查看测评历史
            </Link>
            
            <Link 
              href="/assessments/scl90"
              className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 hover:from-rose-600 hover:to-pink-600 transition-all duration-300 hover:scale-[1.02] text-center font-medium shadow-sm"
            >
              进行SCL-90测试
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MBTIResult() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">加载测试结果...</p>
        </div>
      </div>
    }>
      <MBTIResultContent />
    </Suspense>
  );
}
