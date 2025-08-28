"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePageVisit } from "@/hooks/usePageVisit";


export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [daily, setDaily] = useState<string | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [weappBound, setWeappBound] = useState<boolean | null>(null);
  
  // 记录页面访问
  usePageVisit("home");

  useEffect(() => {
    setMounted(true);
    
    const checkToken = () => {
      const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      setToken(t);
      
      // 如果有token，检查今日心语与权限
      if (t) {
        checkTodayDaily(t);
        fetchProfile(t);
        // 已登录用户停留在首页（不再自动跳转个人中心）
      } else {
        // 未登录自动跳转到登录页
        try { router.replace("/login"); } catch {}
      }
    };

    // 初始检查
    checkToken();

    // 监听 storage 变化
    if (typeof window !== "undefined") {
      window.addEventListener('storage', checkToken);
      
      return () => {
        window.removeEventListener('storage', checkToken);
      };
    }
  }, []);

  // 检查今日心语
  async function checkTodayDaily(authToken: string) {
    try {
      const res = await fetch("/api/daily", { 
        method: "GET", 
        headers: { Authorization: `Bearer ${authToken}` } 
      });
      const data = await res.json();
      if (res.ok && data.sentence) {
        setDaily(data.sentence);
      }
    } catch (error) {
      console.log("检查今日心语失败:", error);
    }
  }

  // 拉取用户信息以判断是否超级管理员
  async function fetchProfile(authToken: string) {
    try {
      const res = await fetch("/api/profile", {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data?.user) {
        setIsSuperAdmin(!!data.user.isSuperAdmin);
        setWeappBound(!!data.user.weappOpenId);
      }
    } catch (error) {
      // 忽略
    }
  }

  async function fetchDaily() {
    if (!token || dailyLoading) return;
    setDailyLoading(true);
    try {
      const res = await fetch("/api/daily", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setDaily(data.sentence);
      }
    } catch (error) {
      console.log("生成心语失败:", error);
    } finally {
      setDailyLoading(false);
    }
  }

  if (!mounted) {
    return null; // 避免水合不匹配
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      {/* 苹果风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-slate-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(147,197,253,0.08),transparent_50%)]" />

      {/* 主内容区域 */}
      <div className="min-h-[calc(100dvh-var(--nav-offset))] flex flex-col items-center justify-center p-6 relative z-10">
        <div className={`w-full max-w-md transform transition-all duration-1000 ease-out ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}>
          
          {/* 主卡片 - 苹果风格 */}
          <div className="rounded-3xl border border-black/[0.08] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-all duration-500 ring-1 ring-black/[0.03]">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">kimochi心晴</h1>
              <p className="text-gray-500">温柔守护你的每一天</p>
            </div>

            {!token ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center border border-black/[0.06] shadow-sm">
                  <span className="text-gray-600 text-2xl">💭</span>
                </div>
                <p className="text-gray-600 mb-6">请先登录以开启专属心理陪伴</p>
                <div className="space-y-3">
                  <Link href="/login" className="block w-full rounded-xl bg-black text-white py-3 hover:bg-gray-800 transition-all duration-300 hover:scale-[1.02] text-center font-medium shadow-sm">
                    立即登录
                  </Link>
                  <Link href="/register" className="block w-full rounded-xl bg-gray-50 text-gray-900 py-3 hover:bg-gray-100 transition-all duration-300 hover:scale-[1.02] text-center font-medium border border-black/[0.06]">
                    创建账号
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 心语时刻卡片 */}
                <div className="rounded-2xl bg-gradient-to-r from-slate-50/80 to-gray-50/80 p-6 border border-black/[0.06] backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-gray-100 rounded-full flex items-center justify-center border border-black/[0.06]">
                        <span className="text-gray-600 text-sm">✨</span>
                      </div>
                      <h2 className="text-lg font-medium text-gray-900">心语时刻</h2>
                    </div>
                    <button
                      onClick={fetchDaily}
                      disabled={dailyLoading}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        dailyLoading 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-black/[0.06]" 
                          : "bg-white/80 text-gray-700 hover:bg-white hover:scale-[1.02] shadow-sm hover:shadow-md border border-black/[0.06]"
                      }`}
                    >
                      {dailyLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                          <span>生成中</span>
                        </div>
                      ) : daily ? "重新生成" : "获取心语"}
                    </button>
                  </div>
                  
                  {daily ? (
                    <div className={`transition-all duration-500 ease-out ${
                      daily ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}>
                      <blockquote className="text-gray-700 leading-relaxed italic">
                        {daily}
                      </blockquote>
                      <div className="flex items-center justify-end mt-3 text-xs text-gray-500">
                        <span>— kimochi心晴为你定制</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <div className="w-12 h-12 bg-slate-50 rounded-full mx-auto mb-3 flex items-center justify-center border border-black/[0.06]">
                        <span className="text-gray-400">💫</span>
                      </div>
                      <p className="text-sm">点击&ldquo;获取心语&rdquo;开启今日专属温暖</p>
                    </div>
                  )}
                </div>

                {/* 快捷入口 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link href="/message-wall" className="rounded-2xl border border-black/[0.06] bg-white/80 hover:bg-white transition-all duration-300 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">💬</div>
                      <div>
                        <div className="text-gray-900 font-medium">留言墙</div>
                        <div className="text-xs text-gray-500">分享交流，表达此刻心情</div>
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </Link>
                  <Link href="/weapp-bind" className="rounded-2xl border border-black/[0.06] bg-white/80 hover:bg-white transition-all duration-300 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">🔗</div>
                      <div>
                        <div className="text-gray-900 font-medium">绑定小程序</div>
                        <div className="text-xs text-gray-500">{weappBound === null ? '扫码绑定，支持手机端联动' : weappBound ? '已绑定' : '未绑定'}</div>
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </Link>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}


