'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirmDialog } from '@/components/ConfirmDialog';

interface Assessment {
  id: string;
  type: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  overallScore: number | null;
  riskLevel: string | null;
  psychologicalTags: string | null;
  recommendations: string | null;
  personalityType: string | null;
}

export default function AssessmentHistory() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'SCL90' | 'MBTI' | 'SDS' | 'SDS/SAS'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  
  // 确认对话框
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    fetchAssessments();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAssessments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const url = filter === 'all' 
        ? '/api/assessments' 
        : `/api/assessments?type=${filter === 'SDS' ? 'SDS/SAS' : filter}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === "USER_NOT_FOUND") {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        throw new Error(errorData.error || '获取历史记录失败');
      }

      const data = await response.json();
      setAssessments(data.assessments);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SCL90': return 'SCL-90 心理症状自评';
      case 'MBTI': return 'MBTI 职业性格测试';
      case 'SDS':
      case 'SDS/SAS': return 'SDS/SAS 抑郁/焦虑自评';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'analyzed': return '已分析';
      default: return status;
    }
  };

  const getRiskLevelColor = (level: string | null) => {
    switch (level) {
      case 'low': return 'text-gray-700 bg-gray-100';
      case 'medium': return 'text-gray-700 bg-orange-100';
      case 'high': return 'text-gray-800 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskLevelLabel = (level: string | null) => {
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中风险';
      case 'high': return '高风险';
      default: return '未评估';
    }
  };

  const viewResult = (assessment: Assessment) => {
    if (assessment.status === 'in_progress') {
      router.push(`/assessments/${assessment.type.toLowerCase()}`);
    } else {
      router.push(`/assessments/${assessment.type.toLowerCase()}/result?id=${assessment.id}`);
    }
  };

  const deleteAssessment = (assessmentId: string, assessmentType: string) => {
    showConfirm({
      title: '删除测评记录',
      message: '确定要删除这条测评记录吗？',
      type: 'warning',
      confirmText: '删除',
      cancelText: '取消',
      details: [
        '测评数据和结果',
        '分析报告和建议',
        '历史记录'
      ],
      onConfirm: async () => {
        try {
          setDeletingId(assessmentId);
          const token = localStorage.getItem('token');
          if (!token) {
            router.push('/login');
            return;
          }

          const response = await fetch(`/api/assessments/${assessmentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '删除失败');
          }

          // 重新获取测评列表
          fetchAssessments();
        } catch (error) {
          console.error('删除测评失败:', error);
          setError(error instanceof Error ? error.message : '删除失败');
          throw error;
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
        {/* 苹果风格背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.05),transparent_50%)]" />

        <div className="min-h-[calc(100dvh-var(--nav-offset))] flex items-center justify-center p-6 relative z-10">
          <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-12 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-4 text-gray-700 font-medium">加载中...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      {/* 苹果风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.05),transparent_50%)]" />

      <div className="min-h-[calc(100dvh-var(--nav-offset))] p-6 relative z-10 flex flex-col">
        <div className="mx-auto w-full max-w-7xl px-2 sm:px-4 flex-1 flex flex-col">
          <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex-1 flex flex-col">
            {/* 头部 - 固定 */}
            <div className="bg-gradient-to-r from-gray-900 to-slate-800 px-8 py-8 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white">测评历史</h1>
                  <p className="text-gray-300 mt-2">查看您的所有心理测评记录和结果</p>
                </div>
                <button
                  onClick={() => router.push('/assessments')}
                  className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white px-6 py-3 hover:bg-white/20 hover:scale-[1.02] transition-all duration-300 font-medium shadow-sm"
                >
                  返回测评中心
                </button>
              </div>
            </div>

            {/* 过滤器 - 固定 */}
            <div className="px-8 py-6 border-b border-black/[0.08] bg-gradient-to-r from-gray-50/80 to-slate-50/80 flex-shrink-0">
              <div className="flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar touch-scroll snap-x snap-mandatory h-12">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-none snap-start px-6 py-2.5 rounded-xl transition-all duration-300 font-medium border ${
                    filter === 'all'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25 border-blue-400 ring-2 ring-blue-400/30'
                      : 'text-gray-700 bg-white hover:bg-gray-50 hover:scale-[1.02] border-gray-200'
                  }`}
                >
                  全部测评
                </button>
                <button
                  onClick={() => setFilter('SCL90')}
                  className={`flex-none snap-start px-6 py-2.5 rounded-xl transition-all duration-300 font-medium border ${
                    filter === 'SCL90'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 border-rose-400 ring-2 ring-rose-400/30'
                      : 'text-gray-700 bg-white hover:bg-gray-50 hover:scale-[1.02] border-gray-200'
                  }`}
                >
                  SCL-90
                </button>
                <button
                  onClick={() => setFilter('MBTI')}
                  className={`flex-none snap-start px-6 py-2.5 rounded-xl transition-all duration-300 font-medium border ${
                    filter === 'MBTI'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 border-green-400 ring-2 ring-green-400/30'
                      : 'text-gray-700 bg-white hover:bg-gray-50 hover:scale-[1.02] border-gray-200'
                  }`}
                >
                  MBTI
                </button>

                <button
                  onClick={() => setFilter('SDS/SAS')}
                  className={`flex-none snap-start px-6 py-2.5 rounded-xl transition-all duration-300 font-medium border ${
                    filter === 'SDS/SAS'
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25 border-violet-400 ring-2 ring-violet-400/30'
                      : 'text-gray-700 bg-white hover:bg-gray-50 hover:scale-[1.02] border-gray-200'
                  }`}
                >
                  SDS/SAS
                </button>
              </div>
            </div>

            {/* 错误提示 - 固定 */}
            {error && (
              <div className="px-8 py-4 flex-shrink-0">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* 测评列表 - 可滚动区域 */}
            <div className="flex-1 overflow-y-auto apple-scrollbar touch-scroll">
              <div className="px-4 sm:px-6 lg:px-8 py-6">
              {assessments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-slate-100 rounded-full flex items-center justify-center border border-black/[0.06] shadow-sm">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">暂无测评记录</h3>
                  <p className="text-gray-600 mb-6">您还没有进行过任何心理测评</p>
                  <button
                    onClick={() => router.push('/assessments')}
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-8 py-3 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 hover:scale-[1.02] font-medium shadow-sm"
                  >
                    开始测评
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.12)] transition-all duration-300 cursor-pointer hover:scale-[1.01]"
                      onClick={() => viewResult(assessment)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {getTypeLabel(assessment.type)}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              assessment.status === 'analyzed' 
                                ? 'bg-green-100 text-green-800'
                                : assessment.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {getStatusLabel(assessment.status)}
                            </span>
                            {assessment.riskLevel && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(assessment.riskLevel)}`}>
                                {getRiskLevelLabel(assessment.riskLevel)}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">开始时间：</span>
                              {new Date(assessment.startedAt).toLocaleString('zh-CN')}
                            </div>
                            {assessment.completedAt && (
                              <div>
                                <span className="font-medium">完成时间：</span>
                                {new Date(assessment.completedAt).toLocaleString('zh-CN')}
                              </div>
                            )}
                            {assessment.type === 'MBTI' && assessment.personalityType ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">人格类型：</span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="inline-flex w-5 h-5 rounded bg-white border items-center justify-center overflow-hidden">
                                    <img src={`/mbti/${String(assessment.personalityType).toUpperCase()}.png`} alt={assessment.personalityType || 'MBTI'} className="max-w-full max-h-full object-contain object-center" />
                                  </span>
                                  <span className="font-semibold text-blue-600">{assessment.personalityType}</span>
                                </span>
                              </div>
                            ) : assessment.type === 'SCL90' && assessment.overallScore ? (
                              <div>
                                <span className="font-medium">综合评分：</span>
                                <span className="font-semibold">{assessment.overallScore.toFixed(2)}</span>
                              </div>
                            ) : assessment.type === 'SDS' && assessment.overallScore ? (
                              <div>
                                <span className="font-medium">SDS/SAS 指数：</span>
                                <span className="font-semibold text-purple-600">{assessment.overallScore.toFixed(0)}</span>
                              </div>
                            ) : null}
                          </div>

                          {assessment.psychologicalTags && (
                            <div className="mt-3">
                              <span className="text-sm font-medium text-gray-700">心理标签：</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {(() => {
                                  try {
                                    // 如果是字符串，尝试解析JSON
                                    if (typeof assessment.psychologicalTags === 'string') {
                                      const tags = JSON.parse(assessment.psychologicalTags);
                                      if (Array.isArray(tags)) {
                                        return tags.map((tag: string, index: number) => (
                                          <span
                                            key={index}
                                            className="px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl border border-blue-200 text-xs font-medium"
                                          >
                                            {tag}
                                          </span>
                                        ));
                                      }
                                    }
                                    // 如果是数组，直接使用
                                    else if (Array.isArray(assessment.psychologicalTags)) {
                                      return (assessment.psychologicalTags as string[]).map((tag: string, index: number) => (
                                        <span
                                          key={index}
                                          className="px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl border border-blue-200 text-xs font-medium"
                                        >
                                          {tag}
                                        </span>
                                      ));
                                    }
                                    return <span className="text-xs text-gray-500">暂无标签</span>;
                                  } catch (error) {
                                    console.error('解析心理标签失败:', error, assessment.psychologicalTags);
                                    return <span className="text-xs text-gray-500">标签格式错误</span>;
                                  }
                                })()}
                              </div>
                            </div>
                          )}

                          {assessment.recommendations && assessment.status === 'analyzed' && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-600 line-clamp-2">
                                <span className="font-medium">AI建议：</span>
                                {assessment.recommendations.substring(0, 120)}
                                {assessment.recommendations.length > 120 && '...'}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex items-center space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAssessment(assessment.id, assessment.type);
                            }}
                            disabled={deletingId === assessment.id}
                            className={`p-2 rounded-full transition-all duration-300 ${
                              deletingId === assessment.id
                                ? 'bg-gray-200 cursor-not-allowed'
                                : 'hover:bg-red-50 hover:scale-110'
                            }`}
                            title="删除测评记录"
                          >
                            {deletingId === assessment.id ? (
                              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4 text-red-500 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                          
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog />
    </div>
  );
}
