"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [wechatUrl, setWechatUrl] = useState<string | null>(null);
  const disableVerification = true; // 暂时隐藏短信验证码登录

  // 邮箱验证码登录相关状态
  const [loginMode, setLoginMode] = useState<'password' | 'email'>('password');
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      if (loginMode === 'password') {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("token", data.token);
          // 添加成功动画延迟
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.href = "/";
        } else {
          setError(data.error || "登录失败");
        }
      } else {
        // 邮箱验证码登录
        const res = await fetch("/api/auth/email-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: emailCode }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("token", data.token);
          // 添加成功动画延迟
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.href = "/";
        } else {
          setError(data.error || "登录失败");
        }
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function requestEmailCode() {
    if (!email) {
      setError("请输入邮箱");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (countdown > 0) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/email-login/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setCountdown(60);
        // 只有当邮件真的是模拟发送时才显示开发环境验证码
        if (data.devCode && data.mocked) {
          setError(`开发环境验证码：${data.devCode}`);
        }
      } else {
        setError(data.error || "发送失败");
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.04),transparent_50%)]" />

      <div className="min-h-[calc(100dvh-var(--nav-offset))] flex items-center justify-center p-6">
        <div className={`w-full max-w-md transform transition-all duration-1000 ease-out ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}>
          <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
            
            {/* 头部 */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center transform hover:scale-110 transition-transform duration-300 border border-black/[0.06] shadow-sm">
                <span className="text-gray-600 text-2xl">🔐</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">欢迎回来</h1>
              <p className="text-gray-500">登录kimochi心晴，继续你的心理陪伴之旅</p>
            </div>

            {/* 错误提示（两种登录方式通用） */}
            {error && (
              <div
                className={`p-3 rounded-xl bg-red-50 border border-red-200 transition-all duration-300 ${
                  error ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[-10px]"
                }`}
              >
                <p className="text-sm text-red-600 flex items-center">
                  <span className="mr-2">❌</span>
                  {error}
                </p>
              </div>
            )}

            {/* 登录模式切换 */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => setLoginMode('password')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMode === 'password'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                账号密码登录
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('email')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMode === 'email'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                邮箱验证码登录
              </button>
            </div>

            {/* 登录表单 */}
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-4">
                {loginMode === 'password' ? (
                  <>
                    <div className="group">
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="邮箱、学号或工号"
                        required
                        className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-300 bg-white/80 backdrop-blur group-hover:bg-white shadow-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2 ml-1">支持邮箱、学号或工号登录</p>
                    </div>
                    <div className="group relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="密码"
                        required
                        className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-300 bg-white/80 backdrop-blur group-hover:bg-white shadow-sm"
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="group">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="请输入邮箱地址"
                        required
                        className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-300 bg-white/80 backdrop-blur group-hover:bg-white shadow-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2 ml-1">输入已注册的邮箱地址</p>
                    </div>
                    <div className="group flex space-x-3">
                      <input
                        type="text"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        placeholder="验证码"
                        required
                        maxLength={6}
                        className="flex-1 rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-300 bg-white/80 backdrop-blur group-hover:bg-white shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={requestEmailCode}
                        disabled={countdown > 0 || loading}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                          countdown > 0 || loading
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
                        }`}
                      >
                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                      </button>
                    </div>
                  </>
                )}
              </div>

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
                    <span>登录中...</span>
                  </div>
                ) : loginMode === 'password' ? "登录" : "验证码登录"}
              </button>
            </form>

            {/* 短信/网页微信登录暂不开放 */}

            {/* 辅助链接 */}
            <div className="flex items-center justify-start text-sm text-gray-500 pt-1">
              <Link href="/forgot-password" className="hover:text-gray-700 underline underline-offset-2">忘记密码？</Link>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              <Link href="/login-help" className="underline underline-offset-2 hover:text-gray-700 mr-3">微信/小程序登录说明</Link>
              <Link href="/qr-login" className="underline underline-offset-2 hover:text-gray-700">PC 扫码登录</Link>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-500">
                还没有账号？
                <a href="/register" className="text-blue-600 hover:text-blue-700 underline underline-offset-2 ml-1 transition-colors duration-200">
                  立即注册
                </a>
              </p>
            </div>

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


