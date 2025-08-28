"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams?.get('id');
  
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);

  const steps = [
    { title: "保存答题数据", icon: "💾", description: "正在安全保存您的答题记录..." },
    { title: "AI智能分析", icon: "🤖", description: "AI正在分析您的心理状态..." },
    { title: "生成专业报告", icon: "📊", description: "正在生成个性化评估报告..." },
    { title: "计算风险评估", icon: "⚡", description: "正在进行风险等级评估..." },
    { title: "完成分析", icon: "✅", description: "分析完成，准备查看结果..." }
  ];

  useEffect(() => {
    setMounted(true);
    
    if (!assessmentId) {
      router.push("/assessments");
      return;
    }

    // 模拟处理步骤
    const processSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
        setCurrentStep(i);
      }
      
      setProcessingComplete(true);
      
      // 等待1.5秒后跳转到结果页面
      setTimeout(() => {
        router.push(`/assessments/scl90/result?id=${assessmentId}`);
      }, 1500);
    };

    processSteps();
  }, [router, assessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 苹果风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(147,197,253,0.08),transparent_50%)]" />

      {/* 主内容区域 */}
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-2xl">
          
          {/* 标题区域 */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full mx-auto mb-6 flex items-center justify-center border border-black/[0.06] shadow-lg animate-pulse">
              <span className="text-rose-600 text-4xl">🧠</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">
              AI正在分析您的测评结果
            </h1>
            <p className="text-xl text-gray-600">
              请稍候，我们的专业AI系统正在为您生成个性化的心理健康报告
            </p>
          </div>

          {/* 处理步骤 */}
          <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-4 p-4 rounded-2xl transition-all duration-500 ${
                    index <= currentStep 
                      ? 'bg-gradient-to-r from-rose-50/80 to-pink-50/80 border border-rose-200/50' 
                      : 'bg-gray-50/50'
                  }`}
                >
                  {/* 图标 */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    index < currentStep 
                      ? 'bg-green-100 border-green-300' 
                      : index === currentStep 
                      ? 'bg-rose-100 border-rose-300 animate-pulse' 
                      : 'bg-gray-100 border-gray-300'
                  }`}>
                    {index < currentStep ? (
                      <span className="text-green-600 text-xl">✅</span>
                    ) : index === currentStep ? (
                      <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-gray-500 text-xl">{step.icon}</span>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1">
                    <h3 className={`font-semibold transition-all duration-500 ${
                      index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm transition-all duration-500 ${
                      index <= currentStep ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {index === currentStep ? step.description : 
                       index < currentStep ? '已完成' : '等待中...'}
                    </p>
                  </div>

                  {/* 状态指示 */}
                  {index < currentStep && (
                    <div className="text-green-600 text-sm font-medium">完成</div>
                  )}
                  {index === currentStep && (
                    <div className="text-rose-600 text-sm font-medium animate-pulse">处理中...</div>
                  )}
                </div>
              ))}
            </div>

            {/* 完成状态 */}
            {processingComplete && (
              <div className="mt-8 text-center">
                <div className="text-green-600 text-lg font-semibold mb-2">✨ 分析完成！</div>
                <p className="text-gray-600 text-sm">正在为您跳转到结果页面...</p>
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="text-center mt-8">
            <div className="rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-6 border border-black/[0.06] backdrop-blur-sm">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center justify-center">
                <span className="text-blue-500 mr-2">💡</span>
                温馨提示
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• AI分析基于专业心理学理论和大数据模型</li>
                <li>• 测评结果仅供参考，如有困扰请寻求专业帮助</li>
                <li>• 您的数据将被安全保密，仅用于生成个人报告</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">正在处理...</p>
        </div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
}
