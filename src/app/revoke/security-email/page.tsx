"use client";

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessInner() {
  const sp = useSearchParams();
  const rid = useMemo(() => sp.get('rid'), [sp]);
  const code = useMemo(() => sp.get('code'), [sp]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const qs = new URLSearchParams();
        if (rid) qs.set('rid', rid);
        if (code) qs.set('code', code!);
        const res = await fetch(`/api/security-email/change/revoke?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '撤回失败');
        setStatus('ok');
      } catch (e:any) {
        setStatus('error');
        setError(e?.message || '撤回失败');
      }
    };
    run();
  }, [rid, code]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_55%)]" />
      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md text-center bg-white/80 backdrop-blur-xl border border-black/[0.06] p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">正在撤回申请...</h2>
              <p className="text-gray-600 mt-2">请稍候</p>
            </>
          )}
          {status === 'ok' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 mx-auto mb-4 flex items-center justify-center text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">撤回成功</h2>
              <p className="text-gray-600 mt-2">您的申请已成功撤回，我们已通知相关方。</p>
              <a href="/login" className="inline-block mt-6 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">返回登录</a>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 mx-auto mb-4 flex items-center justify-center text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">撤回失败</h2>
              <p className="text-gray-600 mt-2">{error}</p>
              <a href="/login" className="inline-block mt-6 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black">返回登录</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RevokeSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-600">加载中...</div>}>
      <SuccessInner />
    </Suspense>
  );
}


