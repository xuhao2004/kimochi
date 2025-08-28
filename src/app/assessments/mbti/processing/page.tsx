"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id');
  
  const [currentStep, setCurrentStep] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);

  const steps = [
    "正在保存您的答题数据...",
    "分析人格维度特征...",
    "计算四个维度倾向...",
    "匹配16型人格类型...",
    "生成个性化报告...",
    "分析完成，即将呈现结果！"
  ];

  useEffect(() => {
    if (!assessmentId) {
      router.push('/assessments');
      return;
    }

    const processSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
        setCurrentStep(i);
      }
      
      setProcessingComplete(true);
      
      setTimeout(() => {
        router.push(`/assessments/mbti/result?id=${assessmentId}`);
      }, 1500);
    };

    processSteps();
  }, [router, assessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 苹果风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent_70%)]" />

      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="max-w-md w-full mx-auto px-6">
          {/* 主卡片 */}
          <div className="rounded-3xl border border-black/[0.08] bg-white/80 backdrop-blur-xl p-8 shadow-[0_8px_32px_rgb(0,0,0,0.12)]">
            
            {/* 头部 */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">分析您的人格类型</h1>
              <p className="text-gray-600 text-sm">MBTI智能分析正在进行中...</p>
            </div>

            {/* 进度指示器 */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">处理进度</span>
                <span className="text-sm text-gray-500">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* 步骤列表 */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-3 transition-all duration-500 ${
                    index <= currentStep ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                    index < currentStep 
                      ? 'bg-green-500 text-white' 
                      : index === currentStep 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-400'
                  }`}>
                    {index < currentStep ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : index === currentStep ? (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    ) : (
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    )}
                  </div>
                  
                  <span className={`text-sm transition-all duration-500 ${
                    index <= currentStep ? 'text-gray-800 font-medium' : 'text-gray-500'
                  }`}>
                    {step}
                  </span>
                  
                  {index === currentStep && (
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 完成状态 */}
            {processingComplete && (
              <div className="mt-6 text-center animate-fade-in">
                <div className="inline-flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">分析完成，正在跳转...</span>
                </div>
              </div>
            )}

            {/* 提示信息 */}
            <div className="mt-8 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <p className="text-xs text-blue-700 text-center leading-relaxed">
                🎯 我们正在运用先进的心理学理论和算法，为您生成准确的人格类型分析报告
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MBTIProcessing() {
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
