"use client";
import { useEffect, useState } from "react";

export default function WechatBindPage() {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("网页微信绑定已暂时关闭");
  const disabled = true;

  useEffect(() => {}, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-xl border border-black/10 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🟢</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">微信授权</h1>
        {status && <p className="text-gray-600 mb-2">{status}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}


