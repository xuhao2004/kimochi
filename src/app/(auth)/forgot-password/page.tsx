"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mockNotice, setMockNotice] = useState(false);
  const disableVerification = process.env.NEXT_PUBLIC_DISABLE_VERIFICATION_CODE === '1';

  async function requestCode() {
    setError("");
    setMessage("");
    if (disableVerification) { setError('验证码找回已停用，请联系管理员'); return; }
    if (!identifier) {
      setError("请输入邮箱");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '发送失败');
        return;
      }
      setMessage('验证码已发送，如该账号存在将收到验证码');
      // 开发环境可能返回 devCode，仅用于调试；不自动填充，保持用户手动输入
      const isDevHost = typeof window !== 'undefined' && (
        window.location.host.includes('dev.kimochi.space') ||
        window.location.hostname.startsWith('localhost') ||
        window.location.hostname.startsWith('127.0.0.1')
      );
      setMockNotice(Boolean(isDevHost && data && data.mocked));
      setStep(2);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError("");
    setMessage("");
    if (disableVerification) { setError('验证码找回已停用，请联系管理员'); return; }
    if (!identifier || !code || !newPassword) {
      setError('请完整填写信息');
      return;
    }
    if (newPassword.length < 8) {
      setError('新密码至少8位');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '重置失败');
        return;
      }
      setMessage('密码已重置，请使用新密码登录');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">找回密码</h1>
            <p className="text-gray-500 text-sm mt-1">支持邮箱</p>
          </div>

          {disableVerification ? (
            <div className="space-y-4">
              <p className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 p-3 rounded-xl">验证码找回已停用，请联系管理员协助重置密码。</p>
              <div className="text-center mt-4">
                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">返回登录</Link>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="请输入注册邮箱"
                className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}
              {mockNotice && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg">当前为 mock 通道（不会发真实邮件/短信）</p>
              )}
              <button
                onClick={requestCode}
                disabled={loading}
                className={`w-full rounded-xl py-3 font-medium ${loading ? 'bg-gray-300 text-gray-500' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                发送验证码
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入验证码"
                className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少8位）"
                className="w-full rounded-xl border border-black/[0.08] px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}
              <button
                onClick={resetPassword}
                disabled={loading}
                className={`w-full rounded-xl py-3 font-medium ${loading ? 'bg-gray-300 text-gray-500' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                重置密码
              </button>
            </div>
          )}

          <div className="text-center mt-6">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">返回登录</Link>
          </div>
        </div>
      </div>
    </div>
  );
}


