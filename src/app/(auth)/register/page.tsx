"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AppleSelect from "@/components/AppleSelect";



export default function RegisterPage() {
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(""); // 邮箱
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState("不方便透露");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mockNotice, setMockNotice] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  async function requestEmailCode() {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    if (!isEmail) { setError('请输入有效邮箱'); return; }
    setError(''); setSending(true);
    try {
      const res = await fetch('/api/auth/email/request-code', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: identifier, purpose: 'email_register' }) });
      const data = await res.json();
      if (!res.ok) setError(data.error || '发送失败');
      else {
        setCountdown(60);
        // 开发环境可能返回 devCode，仅用于调试；不自动填充，保持用户手动输入
        const isDevHost = typeof window !== 'undefined' && (
          window.location.host.includes('dev.kimochi.space') ||
          window.location.hostname.startsWith('localhost') ||
          window.location.hostname.startsWith('127.0.0.1')
        );
        setMockNotice(Boolean(isDevHost && data && data.mocked));
      }
    } catch { setError('网络错误'); }
    finally { setSending(false); }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    if (!isEmail) { setError('仅支持邮箱注册'); return; }
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, identifier, password, gender, birthDate, code: emailCode || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        window.location.href = "/login";
      } else {
        setError(data.error || "注册失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      {/* 苹果风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.04),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.04),transparent_50%)]" />

      <div className="min-h-[calc(100dvh-var(--nav-offset))] flex items-center justify-center p-6">
        <div className={`w-full max-w-md transform transition-all duration-1000 ease-out ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}>
          <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
            
            {/* 头部 */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center transform hover:scale-110 transition-transform duration-300 border border-black/[0.06] shadow-sm">
                <span className="text-gray-600 text-2xl">✨</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">加入kimochi心晴</h1>
              <p className="text-gray-500">开启专属的心理陪伴与关怀</p>
            </div>

            {success ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center animate-bounce">
                  <span className="text-green-600 text-2xl">✅</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">注册成功！</h3>
                <p className="text-gray-500">正在跳转到登录页面...</p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-4">
                  <div className="group">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="你的昵称"
                      required
                      className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-300 bg-white/80 backdrop-blur group-hover:bg-white shadow-sm"
                    />
                  </div>
                  <div className="group">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="邮箱地址"
                      required
                      className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-300 bg-white/80 backdrop-blur group-hover:bg-white shadow-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">请输入有效的邮箱地址</p>
                  </div>
                  <div className="group relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="设置密码（至少8位）"
                      required
                      minLength={8}
                      className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-300 bg-white/80 backdrop-blur group-hover:bg-white shadow-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* 邮箱验证码（当 identifier 是邮箱时显示） */}
                  {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier || '') && (
                    <div className="group">
                      <div className="flex gap-2">
                        <input
                          value={emailCode}
                          onChange={e=>setEmailCode(e.target.value)}
                          placeholder="邮箱验证码"
                          className="flex-1 w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-300 bg-white/80 backdrop-blur group-hover:bg-white shadow-sm"
                        />
                        <button type="button" onClick={requestEmailCode} disabled={sending||countdown>0} className={`px-4 rounded-xl border border-black/[0.08] ${sending||countdown>0? 'text-gray-400 bg-gray-100':'text-gray-700 bg-white hover:bg-gray-50'}`}>{countdown>0? `${countdown}s` : '获取验证码'}</button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 ml-1">为保障安全，邮箱注册需完成验证码校验</p>
                      {mockNotice && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-2 ml-1 inline-block">
                          当前为 mock 通道（不会发真实邮件/短信）
                        </p>
                      )}
                    </div>
                  )}
                  <div className="group">
                    <AppleSelect
                      value={gender}
                      onChange={setGender}
                      placeholder="选择你的性别"
                      options={[
                        { value: '男', label: '男', icon: '👨' },
                        { value: '女', label: '女', icon: '👩' },
                        { value: '不方便透露', label: '不方便透露', icon: '🤐' }
                      ]}
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">选择你的性别信息</p>
                  </div>
                  <div className="group">
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-300 bg-white/80 backdrop-blur group-hover:bg-white shadow-sm"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">我们将根据你的出生日期自动计算星座</p>
                  </div>
                </div>

                {error && (
                  <div className={`p-3 rounded-xl bg-red-50 border border-red-200 transition-all duration-300 ${
                    error ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[-10px]"
                  }`}>
                    <p className="text-sm text-red-600 flex items-center">
                      <span className="mr-2">❌</span>
                      {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full rounded-xl py-3 font-medium transition-all duration-300 transform ${
                    loading 
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed scale-95 border border-black/[0.06]" 
                      : "bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-95 shadow-sm"
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      <span>注册中...</span>
                    </div>
                  ) : "创建账号"}
                </button>

                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    已有账号？
                    <a href="/login" className="text-gray-600 hover:text-gray-800 underline underline-offset-2 ml-1 transition-colors duration-200">
                      立即登录
                    </a>
                  </p>
                </div>
              </form>
            )}

            {/* 返回首页 */}
            <div className="text-center mt-6 pt-6 border-t border-gray-200/50">
              <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center justify-center space-x-1">
                <span>←</span>
                <span>返回首页</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


