"use client";

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function getMessage(reason?: string | null): { title: string; lines: string[] } {
  switch (reason) {
    case 'password_changed':
      return { title: '密码修改成功', lines: ['为了您的账户安全，我们将退出当前登录。', '请使用新密码重新登录。'] };
    case 'security_email_updated':
      return { title: '密保邮箱已更新', lines: ['您的密保邮箱已更新。', '为确保安全，需要重新登录。'] };
    case 'security_email_request_submitted':
      return { title: '申请已提交', lines: ['您的密保邮箱变更申请已提交，正在等待管理员审核。', '审核期间将暂时退出登录，请耐心等待。'] };
    case 'account_change_submitted':
      return { title: '申请已提交', lines: ['您的账号变更申请已提交，正在等待管理员审核。', '为了安全，我们将退出当前登录。'] };
    default:
      return { title: '安全退出', lines: ['为了您的账户安全，我们将退出当前登录。'] };
  }
}

function ReloginPageInner() {
  const sp = useSearchParams();
  const reason = useMemo(() => sp.get('reason'), [sp]);

  const [seconds, setSeconds] = useState(3);
  const message = getMessage(reason);

  useEffect(() => {
    try { localStorage.removeItem('token'); } catch {}
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (seconds === 0) {
      window.location.replace('/login');
    }
  }, [seconds]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.04),transparent_50%)]" />
      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md text-center bg-white/70 backdrop-blur-xl border border-black/[0.08] p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/[0.03]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-4 flex items-center justify-center text-white text-2xl">🔐</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{message.title}</h2>
          <div className="text-gray-600 space-y-1 mb-4">
            {message.lines.map((line, idx) => (
              <p key={idx} className="text-sm">{line}</p>
            ))}
          </div>
          <div className="flex items-center justify-center space-x-3 text-sm text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <span>{seconds} 秒后跳转到登录页</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReloginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    }>
      <ReloginPageInner />
    </Suspense>
  );
}


