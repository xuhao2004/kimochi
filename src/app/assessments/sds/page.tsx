"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePageVisit } from "@/hooks/usePageVisit";

interface Question { id: string; text: string; reverse?: boolean }
interface Option { value: number; label: string }

export default function SDSPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [instruction, setInstruction] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef<Record<string, number>>({});
  const elapsedRef = useRef<number>(0);

  const questionsPerPage = 10;
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  usePageVisit("sds_assessment");

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("token");
    setToken(t);
    if (t) initializeAssessment(t); else router.push("/login");
  }, [router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (startTime && !isPaused && !submitting) {
      timer = setInterval(() => {
        setElapsedTime(prev => { const n = prev + 1; elapsedRef.current = n; return n; });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [startTime, isPaused, submitting]);

  useEffect(() => {
    let saveTimer: NodeJS.Timeout;
    if (assessment && token && Object.keys(answers).length > 0) {
      saveTimer = setInterval(() => {
        saveProgress({ answers: answersRef.current, elapsedTime: elapsedRef.current });
      }, 15000);
    }
    return () => { if (saveTimer) clearInterval(saveTimer); };
  }, [assessment, token, answers, currentPage]);

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
  }, [assessment, token, answers, currentPage, elapsedTime, isPaused]);

  const initializeAssessment = async (authToken: string) => {
    try {
      setLoading(true);
      const assessmentRes = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ type: "SDS/SAS" })
      });
      if (!assessmentRes.ok) {
        const err = await assessmentRes.json();
        if (err.code === 'USER_NOT_FOUND') { localStorage.removeItem('token'); router.push('/login'); return; }
        throw new Error(err.error || '创建测评失败');
      }
      const aData = await assessmentRes.json();
      const a = aData.assessment; setAssessment(a);

      const qRes = await fetch("/api/assessments/questions?type=SDS/SAS", { headers: { Authorization: `Bearer ${authToken}` } });
      if (!qRes.ok) throw new Error('获取题目失败');
      const qData = await qRes.json();
      setQuestions(qData.questions); setOptions(qData.options); setInstruction(qData.instruction);

      if (a.rawAnswers) { const saved = JSON.parse(a.rawAnswers); setAnswers(saved); }
      if (a.currentPage !== null && a.currentPage !== undefined) setCurrentPage(a.currentPage);
      if (a.elapsedTime) setElapsedTime(a.elapsedTime);
      if (a.pausedAt) setIsPaused(true); else setStartTime(Date.now());
    } catch (e) {
      console.error(e); alert('初始化测评失败，请重试'); router.push('/assessments');
    } finally { setLoading(false); }
  };

  const saveProgress = async (options?: { keepalive?: boolean, answers?: Record<string, number>, elapsedTime?: number, isPaused?: boolean, currentPage?: number }) => {
    if (!assessment || !token) return;
    try {
      await fetch(`/api/assessments/${assessment.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPage: options?.currentPage ?? currentPage,
          answers: options?.answers ?? answers,
          elapsedTime: options?.elapsedTime ?? elapsedTime,
          isPaused: options?.isPaused ?? isPaused
        }),
        keepalive: options?.keepalive === true
      } as RequestInit);
    } catch {}
  };

  const handleAnswerChange = (qid: string, value: number) => {
    if (isPaused) {
      setIsPaused(false);
      setStartTime(Date.now());
      saveProgress({ isPaused: false, elapsedTime: elapsedRef.current });
    }
    setAnswers(prev => {
      const updated = { ...prev, [qid]: value };
      answersRef.current = updated;
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(() => saveProgress({ answers: updated, elapsedTime: elapsedRef.current }), 1200);
      return updated;
    });
  };

  const getCurrentPageQuestions = () => {
    const start = currentPage * questionsPerPage; return questions.slice(start, start + questionsPerPage);
  };
  const canGoNext = () => getCurrentPageQuestions().every(q => answers[q.id] !== undefined);

  const handleNext = async () => {
    if (currentPage < totalPages - 1) {
      if (isPaused) {
        setIsPaused(false);
        setStartTime(Date.now());
        await saveProgress({ isPaused: false, elapsedTime: elapsedRef.current });
      }
      await saveProgress(); setCurrentPage(p => p + 1);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const handlePrevious = async () => {
    if (currentPage > 0) {
      if (isPaused) {
        setIsPaused(false);
        setStartTime(Date.now());
        await saveProgress({ isPaused: false, elapsedTime: elapsedRef.current });
      }
      await saveProgress(); setCurrentPage(p => p - 1);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const togglePause = async () => {
    if (!assessment || !token) return;
    const np = !isPaused; setIsPaused(np);
    if (np) await saveProgress({ isPaused: true, elapsedTime: elapsedRef.current });
    else setStartTime(Date.now());
  };

  const handleSubmit = async () => {
    if (!assessment || !token) return;
    const unanswered = questions.filter(q => answers[q.id] === undefined);
    if (unanswered.length > 0) { alert(`还有 ${unanswered.length} 题未作答`); return; }
    try {
      setSubmitting(true);
      const resp = await fetch(`/api/assessments/${assessment.id}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers, completionTime: elapsedTime })
      });
      if (!resp.ok) throw new Error('提交失败');
      await resp.json();
      router.push(`/assessments/sds/processing?id=${assessment.id}`);
    } catch (e) { console.error(e); alert('提交失败，请重试'); } finally { setSubmitting(false); }
  };

  const getProgress = () => Math.round((Object.keys(answers).length / (questions.length || 1)) * 100);
  const formatTime = (s: number) => { const m = Math.floor(s/60); const ss = s%60; return `${m}:${ss.toString().padStart(2,'0')}`; };

  if (!mounted) return null;
  if (loading) return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}><div className="text-center"><div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600">正在加载测评题目...</p></div></div>
  );
  if (!questions.length) return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ paddingTop: 'var(--nav-offset)' }}><div className="text-center"><p className="text-gray-600">加载题目失败</p><button onClick={() => router.push('/assessments')} className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">返回测评中心</button></div></div>
  );

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50" />
      <div className="min-h-[calc(100dvh-var(--nav-offset))] flex flex-col relative z-10">
        <div className="bg-white/80 backdrop-blur-md border-b border-black/[0.08] flex-shrink-0 z-20">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-semibold text-gray-900">SDS+SAS 抑郁/焦虑综合评估</h1>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">第 {currentPage + 1} 页 / 共 {totalPages} 页</div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium text-gray-700">用时: {formatTime(elapsedTime)}</div>
                  <button onClick={togglePause} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${isPaused ? 'bg-green-100 text-green-700 hover:bg-green-200':'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>{isPaused? '继续':'暂停'}</button>
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: `${getProgress()}%` }}></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">已完成 {Object.keys(answers).length} / {questions.length} 题 ({getProgress()}%)</div>
          </div>
        </div>

        <div className="flex-1 max-w-4xl mx-auto w-full p-6">
          {currentPage === 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-50/80 to-yellow-50/80 p-6 border border-black/[0.06] backdrop-blur-sm mb-8">
              <h2 className="font-medium text-gray-900 mb-3 flex items-center"><span className="text-amber-500 mr-2">📋</span>测评说明</h2>
              <p className="text-gray-700 leading-relaxed">{instruction}</p>
            </div>
          )}

          <div className="space-y-6">
            {getCurrentPageQuestions().map((q, idx) => (
              <div key={q.id} className="rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.12)] transition-all duration-300">
                <div className="mb-4">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-slate-100 to-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 border border-black/[0.06]">{currentPage * questionsPerPage + idx + 1}</span>
                    <h3 className="text-lg font-medium text-gray-900 leading-relaxed">{q.text}</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {options.map(op => (
                    <label key={op.value} className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-all duration-200 ${answers[q.id]===op.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
                      <input type="radio" name={q.id} value={op.value} checked={answers[q.id]===op.value} onChange={() => handleAnswerChange(q.id, op.value)} className="sr-only" />
                      <div className="text-sm font-medium">{op.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{op.value}分</div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200">
            <button onClick={handlePrevious} disabled={currentPage === 0} className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${currentPage === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-black/[0.06] text-gray-700 hover:bg-gray-50 hover:scale-[1.02] shadow-sm'}`}>上一页</button>
            <div className="text-sm text-gray-500">{currentPage + 1} / {totalPages}</div>
            {currentPage === totalPages - 1 ? (
              <button onClick={handleSubmit} disabled={!canGoNext() || submitting} className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${!canGoNext() || submitting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 hover:scale-[1.02] shadow-sm'}`}>{submitting ? '提交中...' : '提交测评'}</button>
            ) : (
              <button onClick={handleNext} disabled={!canGoNext()} className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${!canGoNext() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 hover:scale-[1.02] shadow-sm'}`}>下一页</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




