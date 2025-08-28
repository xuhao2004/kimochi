"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePageVisit } from "@/hooks/usePageVisit";

type UserStats = {
  totalDailyQuotes: number;
  weatherUpdates: number;
  accountAge: number;
  lastActiveDate: string;
  favoriteWeather: string;
  mostActiveTime: string;
  totalAssessments: number;
  completedThisMonth: number;
};

export default function StatsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 记录页面访问
  usePageVisit("stats");

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("token");
    setToken(t);
    if (t) {
      fetchStats(t);
    }
  }, []);

  async function fetchStats(authToken: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.log("获取统计数据失败:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return null;
  }

  if (!token) {
    return (
      <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20" />
        <div className="min-h-[calc(100dvh-var(--nav-offset))] flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-2xl">🔒</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">需要登录</h2>
            <p className="text-gray-500 mb-6">请先登录以查看使用统计</p>
            <Link href="/login" className="inline-block px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors duration-200">
              立即登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ paddingTop: 'var(--nav-offset)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 via-white to-blue-50/20" />

      <div className="min-h-[calc(100dvh-var(--nav-offset))] p-6 relative z-10 overflow-y-auto apple-scrollbar touch-scroll">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8 sticky top-0 z-10 bg-white/70 backdrop-blur-xl pt-4 -mt-4">
            <Link href="/profile" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200">
              <span className="mr-2">←</span>
              返回个人中心
            </Link>
            <h1 className="text-3xl font-semibold text-gray-900">使用统计</h1>
            <p className="text-gray-500 mt-2">查看你在kimochi心晴的使用情况</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
              <span className="ml-3 text-gray-600">加载统计数据...</span>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 心语统计 */}
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-purple-600 text-xl">💭</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">心语时刻</h3>
                    <p className="text-sm text-gray-500">总生成次数</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats.totalDailyQuotes}</p>
                <p className="text-sm text-gray-600">每一句都是专属温暖</p>
              </div>

              {/* 测评统计 */}
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <span className="text-indigo-600 text-xl">🧠</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">心理测评</h3>
                    <p className="text-sm text-gray-500">累计完成次数</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats.totalAssessments}</p>
                <p className="text-sm text-gray-600">了解自己，成长更好</p>
              </div>

              {/* 本月测评 */}
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <span className="text-emerald-600 text-xl">📅</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">本月测评</h3>
                    <p className="text-sm text-gray-500">当月完成次数</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats.completedThisMonth}</p>
                <p className="text-sm text-gray-600">持续关注心理健康</p>
              </div>

              {/* 天气统计 */}
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-blue-600 text-xl">🌤️</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">天气查询</h3>
                    <p className="text-sm text-gray-500">总查询次数</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats.weatherUpdates}</p>
                <p className="text-sm text-gray-600">关注天气，关注心情</p>
              </div>

              {/* 使用天数 */}
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="text-green-600 text-xl">📅</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">使用天数</h3>
                    <p className="text-sm text-gray-500">注册至今</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats.accountAge}</p>
                <p className="text-sm text-gray-600">感谢一路陪伴</p>
              </div>

              {/* 最后活跃 */}
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-orange-600 text-xl">⏰</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">最后活跃</h3>
                    <p className="text-sm text-gray-500">最近访问时间</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-2">
                  {new Date(stats.lastActiveDate).toLocaleDateString('zh-CN')}
                </p>
                <p className="text-sm text-gray-600">期待你的下次到来</p>
              </div>

              {/* 最常天气 */}
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <span className="text-cyan-600 text-xl">☁️</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">常见天气</h3>
                    <p className="text-sm text-gray-500">最频繁的天气</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">{stats.favoriteWeather || "多云"}</p>
                <p className="text-sm text-gray-600">你的天气伙伴</p>
              </div>

              {/* 活跃时段 */}
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                    <span className="text-pink-600 text-xl">🕐</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">活跃时段</h3>
                    <p className="text-sm text-gray-500">最常使用时间</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">{stats.mostActiveTime}</p>
                <p className="text-sm text-gray-600">你的专属时光</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">📊</span>
              </div>
              <p className="text-gray-500">暂无统计数据</p>
              <p className="text-sm text-gray-400 mt-1">开始使用kimochi心晴来积累数据吧</p>
            </div>
          )}

          {/* 使用建议 */}
          <div className="mt-8 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 p-6 border border-purple-100/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 使用建议</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <span className="text-purple-500 mt-0.5">✨</span>
                <p>每天获取一句心语，让温暖陪伴你的每一天</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-indigo-500 mt-0.5">🧠</span>
                <p>定期进行心理测评，关注自己的心理健康状态</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">🌤️</span>
                <p>定期查看天气，关注外在环境与内心状态</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-500 mt-0.5">📱</span>
                <p>坚持使用，让心晴成为你的情感陪伴工具</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
