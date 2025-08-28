"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SDSProcessingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get('id');
  const [idx, setIdx] = useState(0);
  const steps = ['保存答题数据…','计算SDS/SAS指数…','判定综合风险…','生成专业建议…','完成分析，准备展示结果…'];

  useEffect(() => {
    if (!id) { router.replace('/assessments'); return; }
    (async () => {
      for (let i = 0; i < steps.length; i++) {
        await new Promise(r => setTimeout(r, 900 + Math.random() * 500));
        setIdx(i);
      }
      setTimeout(() => router.replace(`/assessments/sds/result?id=${id}`), 1200);
    })();
  }, [id, router]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50" />
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="max-w-md w-full mx-auto px-6">
          <div className="rounded-3xl border border-black/[0.08] bg-white/80 backdrop-blur-xl p-8 shadow-[0_8px_32px_rgb(0,0,0,0.12)]">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">生成SDS+SAS分析报告</h1>
              <p className="text-gray-600 text-sm">请稍候，系统正在评估抑郁/焦虑指数…</p>
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">处理进度</span>
                <span className="text-sm text-gray-500">{Math.round(((idx+1)/steps.length)*100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${((idx+1)/steps.length)*100}%` }}></div>
              </div>
            </div>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i} className={`flex items-center space-x-3 transition-all duration-500 ${i <= idx ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${i < idx ? 'bg-green-500 text-white' : i===idx ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {i < idx ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : i===idx ? (<div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>) : (<div className="w-2 h-2 bg-gray-400 rounded-full"></div>)}
                  </div>
                  <span className={`text-sm ${i <= idx ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SDSProcessingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-600">加载中...</div>}>
      <SDSProcessingInner />
    </Suspense>
  );
}




