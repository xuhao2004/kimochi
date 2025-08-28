"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AssessmentsPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      {/* 苹果风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(147,197,253,0.08),transparent_50%)]" />

      {/* 主内容区域 */}
      <div className="min-h-[calc(100dvh-var(--nav-offset))] flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-5xl">
          
          {/* 页面标题 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">心理测评</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              专业的心理健康评估工具，帮助您更好地了解自己的心理状态和人格特质
            </p>
          </div>

          {/* 测评卡片（移动端横向滚动） */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 mb-12 items-stretch overflow-x-auto md:overflow-visible no-scrollbar touch-scroll snap-x snap-mandatory h-auto md:h-auto">
            
            {/* SCL-90 测评卡片 */}
            <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-all duration-500 ring-1 ring-black/[0.03] hover:scale-[1.02] h-full flex flex-col">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full mx-auto mb-4 flex items-center justify-center border border-black/[0.06] shadow-sm">
                  <span className="text-rose-600 text-2xl">🧠</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">SCL-90心理症状自评</h2>
                <p className="text-gray-600 text-sm">90题 · 约15-20分钟</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-r from-rose-50/80 to-pink-50/80 rounded-2xl p-4 border border-black/[0.06]">
                  <h3 className="font-medium text-gray-900 mb-2">测评内容</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 躯体化症状评估</li>
                    <li>• 强迫症状检测</li>
                    <li>• 人际关系敏感度</li>
                    <li>• 抑郁与焦虑状况</li>
                    <li>• 其他心理症状分析</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-amber-50/80 to-yellow-50/80 rounded-2xl p-4 border border-black/[0.06]">
                  <h3 className="font-medium text-gray-900 mb-2">AI智能分析</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 智能判断答题认真度</li>
                    <li>• 专业心理状态分析</li>
                    <li>• 个性化建议与指导</li>
                    <li>• 风险评估与预警</li>
                  </ul>
                </div>
              </div>

              <Link 
                href="/assessments/scl90"
                className="mt-auto block w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 hover:from-rose-600 hover:to-pink-600 transition-all duration-300 hover:scale-[1.02] text-center font-medium shadow-sm"
              >
                开始SCL-90测评
              </Link>
            </div>

            {/* MBTI 测评卡片 */}
            <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-all duration-500 ring-1 ring-black/[0.03] hover:scale-[1.02] h-full flex flex-col">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mx-auto mb-4 flex items-center justify-center border border-black/[0.06] shadow-sm">
                  <span className="text-blue-600 text-2xl">🎭</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">MBTI人格类型测试</h2>
                <p className="text-gray-600 text-sm">快速/专业 · 定制化需求</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl p-4 border border-black/[0.06]">
                  <h3 className="font-medium text-gray-900 mb-2">测评内容</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 内向/外向性格倾向</li>
                    <li>• 感觉/直觉信息处理</li>
                    <li>• 思考/情感决策方式</li>
                    <li>• 判断/知觉生活态度</li>
                    <li>• 16型人格特质分析</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-2xl p-4 border border-black/[0.06]">
                  <h3 className="font-medium text-gray-900 mb-2">职业指导</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 个性化职业建议</li>
                    <li>• 优势特质分析</li>
                    <li>• 发展方向指导</li>
                    <li>• 团队协作风格</li>
                  </ul>
                </div>
              </div>

              <Link 
                href="/assessments/mbti"
                className="mt-auto block w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 hover:scale-[1.02] text-center font-medium shadow-sm"
              >
                开始MBTI测试
              </Link>
            </div>

            

            {/* SDS+SAS 综合量表 */}
            <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-all duration-500 ring-1 ring-black/[0.03] hover:scale-[1.02] h-full flex flex-col">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center border border-black/[0.06] shadow-sm">
                  <span className="text-purple-600 text-2xl">🌧️</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">SDS+SAS 抑郁/焦虑综合评估</h2>
                <p className="text-gray-600 text-sm">40题 · 约8-12分钟</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-r from-violet-50/80 to-purple-50/80 rounded-2xl p-4 border border-black/[0.06]">
                  <h3 className="font-medium text-gray-900 mb-2">测评内容</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 抑郁（SDS）与焦虑（SAS）双量表</li>
                    <li>• 情绪、躯体与认知多维评估</li>
                    <li>• 严重程度分级与专业建议</li>
                  </ul>
                </div>
              </div>

              <Link 
                href="/assessments/sds"
                className="mt-auto block w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white py-4 hover:from-violet-600 hover:to-purple-600 transition-all duration-300 hover:scale-[1.02] text-center font-medium shadow-sm"
              >
                开始SDS+SAS测评
              </Link>
            </div>
          </div>

          {/* 注意事项 */}
          <div className="rounded-2xl bg-gradient-to-r from-gray-50/80 to-slate-50/80 p-6 border border-black/[0.06] backdrop-blur-sm">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="text-amber-500 mr-2">⚠️</span>
              测评须知
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• 请在安静的环境中完成测评，确保测评结果的准确性</li>
              <li>• 根据您的真实感受和行为习惯诚实作答，没有对错之分</li>
              <li>• 测评结果仅供参考，如有心理困扰请寻求专业心理咨询</li>
              <li>• 测评数据将安全保存，仅用于提供个性化服务和学术研究</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}