"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SDSResultInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get('id');
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) { router.replace('/assessments'); return; }
    (async () => {
      try {
        const res = await fetch(`/api/assessments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取结果失败');
        const data = await res.json();
        setAssessment(data.assessment);
      } catch (e:any) {
        setError(e.message || '加载失败');
      } finally { setLoading(false); }
    })();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}><div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" /></div>
  );
  if (error || !assessment) return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}><div className="text-center"><p className="text-red-600 mb-4">{error || '结果不存在'}</p><Link href="/assessments" className="px-4 py-2 bg-purple-500 text-white rounded-lg">返回测评中心</Link></div></div>
  );

  const result = assessment.analysisResult || {};
  // 兼容 whenToSeekHelp 字段（字符串或数组）
  const seekHelp: string[] = (() => {
    const raw = result.whenToSeekHelp ?? result.seekHelp ?? null;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {}
      return [raw];
    }
    return [];
  })();
  const getSevInfo = (sev: string) => {
    switch (sev) {
      case 'severe': return { label: '重度', color: 'text-red-700 bg-red-50 border-red-200' };
      case 'moderate': return { label: '中度', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'mild': return { label: '轻度', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
      default: return { label: '无明显', color: 'text-green-700 bg-green-50 border-green-200' };
    }
  };
  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50" />
      <div className="min-h-[calc(100dvh-var(--nav-offset))] py-12 relative z-10 overflow-y-auto apple-scrollbar touch-scroll">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center border border-black/[0.06] shadow-sm">
              <span className="text-purple-600 text-3xl">📊</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SDS+SAS 综合评估结果</h1>
            <p className="text-gray-600">完成时间：{new Date(assessment.completedAt).toLocaleString('zh-CN')} · 用时：{Math.floor((assessment.completionTime||0)/60)}分{(assessment.completionTime||0)%60}秒</p>
          </div>

          <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">综合指数（均值）</div>
                <div className="text-4xl font-bold text-purple-600">{assessment.overallScore?.toFixed(0)}</div>
                <div className="text-sm text-gray-500">SDS/SAS 标准分均值（0-100）</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">风险等级</div>
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl border ${assessment.riskLevel==='high' ? 'text-red-600 bg-red-50 border-red-200' : assessment.riskLevel==='medium' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                  <span>{assessment.riskLevel==='high'?'🚨':assessment.riskLevel==='medium'?'⚠️':'✅'}</span>
                  <span className="font-medium">{assessment.riskLevel==='high'?'需要关注':assessment.riskLevel==='medium'?'轻度关注':'状态良好'}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">答题质量</div>
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl border ${result.isSerious ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                  <span>{result.isSerious?'✅':'❌'}</span>
                  <span className="font-medium">{result.isSerious?'认真作答':'答题异常'}</span>
                </div>
              </div>
            </div>
          </div>

          {Array.isArray(result.psychologicalTags) && result.psychologicalTags.length>0 && (
            <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center"><span className="text-blue-500 mr-2">🏷️</span>心理特征标签</h2>
              <div className="flex flex-wrap gap-3">{result.psychologicalTags.map((t:string,i:number)=>(<span key={i} className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl border border-blue-200 text-sm font-medium">{t}</span>))}</div>
            </div>
          )}

          {result?.details?.sds && result?.details?.sas && (
            <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="text-purple-500 mr-2">📈</span>分量表指数</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
                  <div className="text-sm text-purple-700 mb-1">SDS 抑郁指数</div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-purple-700">{Number(result.details.sds.index).toFixed(0)}</div>
                    <span className={`ml-3 px-2 py-1 rounded-lg border text-xs ${getSevInfo(result.details.sds.severity).color}`}>
                      {getSevInfo(result.details.sds.severity).label}抑郁倾向
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <div className="text-sm text-blue-700 mb-1">SAS 焦虑指数</div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-blue-700">{Number(result.details.sas.index).toFixed(0)}</div>
                    <span className={`ml-3 px-2 py-1 rounded-lg border text-xs ${getSevInfo(result.details.sas.severity).color}`}>
                      {getSevInfo(result.details.sas.severity).label}焦虑倾向
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {result.summary && (
            <div className="rounded-2xl border border-black/[0.08] bg-gradient-to-r from-slate-50/80 to-gray-50/80 p-6 backdrop-blur-sm mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center"><span className="text-slate-600 mr-2">📝</span>总体评估</h3>
              <p className="text-gray-700 leading-relaxed">{result.summary}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><span className="text-amber-500 mr-2">💡</span>专业建议</h3>
              <p className="text-gray-700 leading-relaxed">{result.recommendations}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-amber-50/80 to-yellow-50/80 p-6 border border-black/[0.06] backdrop-blur-sm">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center"><span className="text-amber-500 mr-2">⚠️</span>重要提醒</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• 量表结果仅供参考，不等同于临床诊断</li>
                <li>• 如持续低落、失眠或出现自伤意念，请及时联系专业机构</li>
                <li>• 建议保持规律作息、轻度运动与稳定社交</li>
              </ul>
            </div>
          </div>

          {(seekHelp && seekHelp.length>0) && (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] mb-10">
              <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center"><span className="mr-2">🚑</span>何时就医</h3>
              <ul className="list-disc pl-5 space-y-2 text-red-900">
                {seekHelp.map((t,i)=>(<li key={i}>{t}</li>))}
              </ul>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/assessments" className="block w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 text-center hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 hover:scale-[1.02] shadow-sm">返回测评中心</Link>
            <Link href="/assessments/history" className="block w-full rounded-xl bg-white border border-black/[0.06] text-gray-700 py-4 text-center hover:bg-gray-50 hover:scale-[1.02] transition-all duration-300 shadow-sm">查看测评历史</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SDSResultPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center text-gray-600" style={{ paddingTop: 'var(--nav-offset)' }}>加载结果...</div>}>
      <SDSResultInner />
    </Suspense>
  );
}




