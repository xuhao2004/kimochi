"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePageVisit } from "@/hooks/usePageVisit";
import { useAlert } from '@/components/AppleAlert';

interface Question {
  id: string;
  text: string;
  dimension: string;
  direction: string;
  options: {
    A: string;
    B: string;
  };
}

export default function MBTIPage() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [instruction, setInstruction] = useState("");
  const [mode, setMode] = useState<'quick'|'pro'>('pro');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [assessment, setAssessment] = useState<{id: string, status: string, rawAnswers?: string, currentPage?: number, elapsedTime?: number, pausedAt?: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const elapsedRef = useRef<number>(0);
  
  const questionsPerPage = 10;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  
  // 记录页面访问
  usePageVisit("mbti_assessment");

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("token");
    setToken(t);
    
    if (t) {
      initializeAssessment(t);
    } else {
      router.push("/login");
    }
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  // 计时器逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (startTime && !isPaused && !submitting) {
      timer = setInterval(() => {
        setElapsedTime(prev => {
          const next = prev + 1;
          elapsedRef.current = next;
          return next;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [startTime, isPaused, submitting]);

  // 自动保存进度（每15秒）
  useEffect(() => {
    let saveTimer: NodeJS.Timeout;
    
    if (assessment && token && Object.keys(answers).length > 0) {
      saveTimer = setInterval(() => {
        saveProgress({ answers: answersRef.current, elapsedTime: elapsedRef.current });
      }, 15000); // 15秒保存一次
    }
    
    return () => {
      if (saveTimer) clearInterval(saveTimer);
    };
  }, [assessment, token, answers, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // 页面离开/隐藏时保存进度（keepalive），使用最新引用值
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (assessment && token && Object.keys(answers).length > 0) {
        saveProgress({ keepalive: true, answers: answersRef.current, elapsedTime: elapsedRef.current });
      }
    };
    const handleVisibility = () => {
      if (document.hidden && assessment && token && Object.keys(answers).length > 0) {
        saveProgress({ keepalive: true, answers: answersRef.current, elapsedTime: elapsedRef.current });
      }
    };
    const handlePageHide = () => {
      if (assessment && token && Object.keys(answers).length > 0) {
        saveProgress({ keepalive: true, answers: answersRef.current, elapsedTime: elapsedRef.current });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [assessment, token, answers, currentPage, elapsedTime, isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换模式（Apple风格分段控件使用）
  const handleModeChange = async (nextMode: 'quick'|'pro') => {
    if (nextMode === mode) return;
    setMode(nextMode);
    // 切换模式时重置题目与进度（不覆盖已存在测评记录）
    setAnswers({});
    setCurrentPage(0);
    setLoading(true);
    try {
      const t = localStorage.getItem("token");
      if (!t) return;
      const res = await fetch(`/api/assessments/questions?type=MBTI&mode=${nextMode}`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setInstruction(data.instruction || '');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeAssessment = async (authToken: string) => {
    try {
      setLoading(true);
      
      // 1. 创建或获取测评
      const assessmentRes = await fetch("/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ type: "MBTI" })
      });

      if (!assessmentRes.ok) {
        const errorData = await assessmentRes.json();
        
        // 如果是用户不存在错误，清除token并跳转到登录页
        if (errorData.code === "USER_NOT_FOUND") {
          localStorage.removeItem("token");
          showAlert({
            title: '认证失败',
            message: '用户认证失败，请重新登录',
            type: 'error'
          });
          router.push("/login");
          return;
        }
        
        throw new Error(errorData.error || "创建测评失败");
      }

      const assessmentData = await assessmentRes.json();
      const assessment = assessmentData.assessment;
      setAssessment(assessment);

      // 2. 获取题目（支持 quick/pro 模式）
      const questionsRes = await fetch(`/api/assessments/questions?type=MBTI&mode=${mode}` , {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!questionsRes.ok) {
        throw new Error("获取题目失败");
      }

      const questionsData = await questionsRes.json();
      setQuestions(questionsData.questions);
      setInstruction(questionsData.instruction);
      
      // 3. 恢复保存的进度
      if (assessment.rawAnswers) {
        const savedAnswers = JSON.parse(assessment.rawAnswers);
        setAnswers(savedAnswers);
      }
      
      if (assessment.currentPage !== null && assessment.currentPage !== undefined) {
        setCurrentPage(assessment.currentPage);
      }
      
      if (assessment.elapsedTime) {
        setElapsedTime(assessment.elapsedTime);
      }
      
      // 如果有暂停时间，说明之前暂停了
      if (assessment.pausedAt) {
        setIsPaused(true);
      } else {
        setStartTime(Date.now());
      }

    } catch (error) {
      console.error("初始化测评失败:", error);
      showAlert({
        title: '初始化失败',
        message: '初始化测评失败，请重试',
        type: 'error'
      });
      router.push("/assessments");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    // 若处于暂停状态，用户一旦作答则自动恢复计时
    if (isPaused) {
      setIsPaused(false);
      setStartTime(Date.now());
      // 立即将暂停状态同步为false，避免继续保持暂停
      saveProgress({ isPaused: false, elapsedTime: elapsedRef.current });
    }

    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value };
      answersRef.current = updated;
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(() => {
        saveProgress({ answers: updated, elapsedTime: elapsedRef.current });
      }, 1500);
      return updated;
    });
  };

  // 保存进度（允许覆盖为最新值，避免闭包旧值）
  const saveProgress = async (options?: { keepalive?: boolean, answers?: Record<string, string>, elapsedTime?: number, isPaused?: boolean, currentPage?: number }) => {
    if (!assessment || !token) return;
    
    try {
      await fetch(`/api/assessments/${assessment.id}/progress`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPage: options?.currentPage ?? currentPage,
          answers: options?.answers ?? answers,
          elapsedTime: options?.elapsedTime ?? elapsedTime,
          isPaused: options?.isPaused ?? isPaused
        }),
        keepalive: options?.keepalive === true
      } as RequestInit);
    } catch (error) {
      console.error("保存进度失败:", error);
    }
  };

  // 暂停/恢复测试
  const togglePause = async () => {
    if (!assessment || !token) return;
    
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      // 暂停时保存进度
      await saveProgress({ isPaused: true, elapsedTime: elapsedRef.current });
    } else {
      // 恢复时重新设置开始时间
      setStartTime(Date.now());
    }
  };

  const getCurrentPageQuestions = () => {
    const start = currentPage * questionsPerPage;
    const end = start + questionsPerPage;
    return questions.slice(start, end);
  };

  const canGoNext = () => {
    const currentQuestions = getCurrentPageQuestions();
    return currentQuestions.every(q => answers[q.id] !== undefined);
  };

  const handleNext = async () => {
    if (currentPage < totalPages - 1) {
      if (isPaused) {
        setIsPaused(false);
        setStartTime(Date.now());
        await saveProgress({ isPaused: false, elapsedTime: elapsedRef.current });
      }
      await saveProgress(); // 切换页面时保存进度
      setCurrentPage(prev => prev + 1);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevious = async () => {
    if (currentPage > 0) {
      if (isPaused) {
        setIsPaused(false);
        setStartTime(Date.now());
        await saveProgress({ isPaused: false, elapsedTime: elapsedRef.current });
      }
      await saveProgress(); // 切换页面时保存进度
      setCurrentPage(prev => prev - 1);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleSubmit = async () => {
    if (!assessment || !token) return;

    // 检查是否所有题目都已回答
    const unansweredQuestions = questions.filter(q => answers[q.id] === undefined);
    if (unansweredQuestions.length > 0) {
      showAlert({
        title: '提交失败',
        message: `还有 ${unansweredQuestions.length} 道题目未回答，请完成后再提交。`,
        type: 'warning'
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // 使用总的已用时间（包括之前保存的进度）
      const completionTime = elapsedTime;
      
      const response = await fetch(`/api/assessments/${assessment.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          answers,
          completionTime
        })
      });

      if (!response.ok) {
        throw new Error("提交失败");
      }

      await response.json();
      
      // 跳转到缓冲页面
      router.push(`/assessments/mbti/processing?id=${assessment.id}`);

    } catch (error) {
      console.error("提交测评失败:", error);
      showAlert({
        title: '提交失败',
        message: '提交失败，请重试',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getProgress = () => {
    const answeredCount = Object.keys(answers).length;
    return Math.round((answeredCount / questions.length) * 100);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载测评题目...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="text-center">
          <p className="text-gray-600">加载题目失败</p>
          <button
            onClick={() => router.push("/assessments")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            返回测评中心
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      {/* 苹果风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.05),transparent_50%)]" />

      <div className="min-h-[calc(100dvh-var(--nav-offset))] flex flex-col relative z-10">
        {/* 顶部进度条 */}
        <div className="bg-white/80 backdrop-blur-md border-b border-black/[0.08] flex-shrink-0 z-20">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-semibold text-gray-900">MBTI 人格类型测试</h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">模式：</span>
                  {/* Apple风格分段控件 */}
                  <div className="relative flex items-center rounded-2xl bg-gray-100/60 backdrop-blur-xl border border-black/[0.06] p-1 shadow-sm" role="tablist" aria-label="模式选择">
                    <span
                      className="absolute top-1 bottom-1 rounded-xl bg-white shadow-sm transition-all duration-300"
                      style={{ left: mode === 'quick' ? '4px' : 'calc(50% + 4px)', width: 'calc(50% - 8px)' }}
                    />
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'quick'}
                      onClick={() => handleModeChange('quick')}
                      className={`relative z-10 px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${mode === 'quick' ? 'text-gray-900' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                      快速
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'pro'}
                      onClick={() => handleModeChange('pro')}
                      className={`relative z-10 px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${mode === 'pro' ? 'text-gray-900' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                      专业
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  第 {currentPage + 1} 页 / 共 {totalPages} 页
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium text-gray-700">
                    用时: {formatTime(elapsedTime)}
                  </div>
                  <button
                    onClick={togglePause}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                      isPaused 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    {isPaused ? '继续' : '暂停'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              已完成 {Object.keys(answers).length} / {questions.length} 题 ({getProgress()}%)
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 max-w-4xl mx-auto w-full p-6">
          
          {/* 说明文字 */}
          {currentPage === 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-50/80 to-yellow-50/80 p-6 border border-black/[0.06] backdrop-blur-sm mb-8">
              <h2 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="text-amber-500 mr-2">📋</span>
                测评说明
              </h2>
              <p className="text-gray-700 leading-relaxed">{instruction}</p>
            </div>
          )}

          {/* 题目列表 */}
          <div className="space-y-6">
            {getCurrentPageQuestions().map((question, index) => (
              <div 
                key={question.id}
                className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.12)] transition-all duration-300"
              >
                <div className="mb-4">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-slate-100 to-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 border border-black/[0.06]">
                      {currentPage * questionsPerPage + index + 1}
                    </span>
                    <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
                      {question.text}
                    </h3>
                  </div>
                </div>

                {/* 选项 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['A', 'B'].map((optionKey) => (
                    <label 
                      key={optionKey}
                      className={`cursor-pointer rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                        answers[question.id] === optionKey
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={optionKey}
                        checked={answers[question.id] === optionKey}
                        onChange={() => handleAnswerChange(question.id, optionKey)}
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          answers[question.id] === optionKey
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {answers[question.id] === optionKey && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{optionKey}. {question.options[optionKey as 'A' | 'B']}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentPage === 0}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                currentPage === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border border-black/[0.06] text-gray-700 hover:bg-gray-50 hover:scale-[1.02] shadow-sm"
              }`}
            >
              上一页
            </button>

            <div className="text-sm text-gray-500">
              {currentPage + 1} / {totalPages}
            </div>

            {currentPage === totalPages - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!canGoNext() || submitting}
                className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${
                  !canGoNext() || submitting
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 hover:scale-[1.02] shadow-sm"
                }`}
              >
                {submitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>提交中...</span>
                  </div>
                ) : (
                  "提交测评"
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  !canGoNext()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 hover:scale-[1.02] shadow-sm"
                }`}
              >
                下一页
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
