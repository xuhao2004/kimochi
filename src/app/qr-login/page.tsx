"use client";
import { useEffect, useRef, useState } from "react";

type StartResp = { nonce: string; expiresAt: string };

export default function QrLoginPage() {
  const [nonce, setNonce] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<string>("初始化...");
  const [countdown, setCountdown] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const timerRef = useRef<any>(null);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/qr-login/start', { method: 'POST' });
        const data: StartResp = await res.json();
        if (!res.ok) throw new Error((data as any).error || '启动失败');
        setNonce(data.nonce);
        const exp = new Date(data.expiresAt);
        setExpiresAt(exp);
        setStatus('请使用小程序在“确认登录”页输入下方登录码，或直接扫码二维码确认登录');
      } catch (e) {
        setStatus('启动失败，请刷新重试');
      }
    })();
    return () => { clearInterval(timerRef.current); clearInterval(pollRef.current); };
  }, []);

  // 倒计时与轮询
  useEffect(() => {
    if (!expiresAt || !nonce) return;
    function tick() {
      const left = Math.max(0, Math.floor(((expiresAt ? expiresAt.getTime() : 0) - Date.now()) / 1000));
      setCountdown(left);
      if (left <= 0) {
        setStatus('登录码已过期，请刷新页面重试');
        clearInterval(timerRef.current);
        clearInterval(pollRef.current);
      }
    }
    tick();
    timerRef.current = setInterval(tick, 1000);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/auth/qr-login/poll?nonce=${encodeURIComponent(nonce)}`);
        const d = await r.json();
        if (d.status === 'confirmed') {
          clearInterval(pollRef.current);
          const rc = await fetch(`/api/auth/qr-login/complete?nonce=${encodeURIComponent(nonce)}`);
          const dc = await rc.json();
          if (rc.ok && dc.token) {
            localStorage.setItem('token', dc.token);
            setStatus('登录成功，正在跳转...');
            setTimeout(() => { window.location.href = '/'; }, 800);
          } else {
            setStatus(dc.error || '完成登录失败');
          }
        }
      } catch {
        // 忽略临时错误
      }
    }, 1500);
    return () => { clearInterval(timerRef.current); clearInterval(pollRef.current); };
  }, [expiresAt, nonce]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white/80 backdrop-blur-xl border border-black/10 p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">PC 扫码登录</h1>
        <p className="text-sm text-gray-600 mb-4">{status}</p>
        {nonce && (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">登录码（在小程序“确认登录”输入或扫码）</div>
            <div className="font-mono text-lg sm:text-xl bg-gray-100 rounded-xl px-3 py-2 mx-auto w-full max-w-full break-all leading-7 select-all">
              {nonce}
            </div>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(nonce);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                } catch {
                  try {
                    const ta = document.createElement('textarea');
                    ta.value = nonce;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  } catch {}
                }
              }}
              className="mt-2 inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs bg-gray-900 text-white hover:bg-black transition-colors"
            >
              {copied ? '已复制' : '复制'}
            </button>
            {/* 简易二维码（使用前端库渲染 DataURL） */}
            <Qr nonce={nonce} />
            <div className="mt-3 text-xs text-gray-500">有效期：{countdown}s</div>
          </div>
        )}
        <div className="mt-6 text-xs text-gray-600">
          <ol className="list-decimal list-inside space-y-1">
            <li>在微信打开你的小程序 → 进入“确认登录”页</li>
            <li>输入上方登录码或直接扫码二维码确认</li>
            <li>本页将自动完成登录</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function Qr({ nonce }: { nonce: string }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    (async () => {
      const QRCode = (await import('qrcode')).default;
      const text = `kimochi://qr-login?nonce=${encodeURIComponent(nonce)}`;
      const url = await QRCode.toDataURL(text, { margin: 1, width: 200 });
      if (ref.current) ref.current.src = url;
    })();
  }, [nonce]);
  return <img ref={ref} alt="二维码" className="mx-auto mt-3 rounded bg-white p-2 border border-gray-200" />;
}


