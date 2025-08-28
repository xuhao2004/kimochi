"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useUnread } from "@/contexts/UnreadContext";
import UnifiedNotificationCenter from "@/components/UnifiedNotificationCenter";

// 天气图标映射
function getWeatherIcon(summary: string): string {
  if (summary.includes('晴')) return '☀️';
  if (summary.includes('云') || summary.includes('阴')) return '☁️';
  if (summary.includes('雨')) return '🌧️';
  if (summary.includes('雪')) return '❄️';
  if (summary.includes('雾')) return '🌫️';
  if (summary.includes('雷')) return '⛈️';
  return '🌤️';
}

export default function Nav() {
  const [token, setToken] = useState<string | null>(null);
  const [validatedToken, setValidatedToken] = useState<string | null>(null); // 新增：验证过的token
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userType, setUserType] = useState<'superAdmin' | 'admin' | 'teacher' | 'student' | 'self'>('self');
  const [weather, setWeather] = useState<{ locationName: string; summary: string; temperatureC: number } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const weatherFetched = useRef(false);
  const { unreadCount, refreshUnreadCount } = useUnread();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const touchStartXRef = useRef<number>(0);

  useEffect(() => {
    const checkToken = () => {
      const t = localStorage.getItem("token");
      setToken(t);
      
      // 检查管理员权限
      if (t) {
        checkAdminStatus(t);
        // 自动获取天气 - 只执行一次
        if (!weatherFetched.current) {
          weatherFetched.current = true;
          autoFetchWeather(t);
        }
        // 获取未读消息数量
        refreshUnreadCount();
      } else {
        // 如果没有 token，重置所有状态
        setValidatedToken(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setWeather(null);
        weatherFetched.current = false;
      }
    };

    // 初始检查
    checkToken();

    // 监听 storage 变化（用于处理其他标签页的登录/退出）
    window.addEventListener('storage', checkToken);
    window.addEventListener('beforeunload', () => {
      window.removeEventListener('storage', checkToken);
    });

    return () => {
      window.removeEventListener('storage', checkToken);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAdminStatus(authToken: string) {
    try {
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (!res.ok) {
        // token验证失败，清除validatedToken
        setValidatedToken(null);
        return;
      }
      
      const text = await res.text();
      if (!text) {
        setValidatedToken(null);
        return;
      }
      
      const data = JSON.parse(text);
      if (data.user) {
        // 检查是否为管理员或高级管理员
        setIsAdmin(data.user.isAdmin || data.user.isSuperAdmin);
        setIsSuperAdmin(data.user.isSuperAdmin || false);
        
        // 确定用户类型
        if (data.user.isSuperAdmin) {
          setUserType('superAdmin');
        } else if (data.user.accountType === 'admin') {
          setUserType('admin');
        } else if (data.user.accountType === 'teacher') {
          setUserType('teacher');
        } else if (data.user.accountType === 'student') {
          setUserType('student');
        } else {
          setUserType('self');
        }
        // 将用户资料缓存到本地，供统一通知上下文使用
        try {
          localStorage.setItem('userProfile', JSON.stringify(data.user));
        } catch {}
        
        // 只有当token验证成功后，才设置validatedToken供UnifiedNotificationCenter使用
        setValidatedToken(authToken);
      } else {
        // 无用户数据，清除validatedToken
        setValidatedToken(null);
      }
    } catch (error) {
      console.log("检查管理员状态失败:", error);
      // 验证失败时清除validatedToken
      setValidatedToken(null);
    }
  }

  async function autoFetchWeather(authToken: string) {
    if (!authToken) return;
    setWeatherLoading(true);
    try {
      let position: GeolocationPosition;

      try {
        // 首先尝试获取精确位置
        position = await getCurrentPosition();
      } catch (geoError) {
        console.log("GPS定位失败，尝试IP定位:", geoError);

        // GPS定位失败，尝试使用IP定位作为降级方案
        try {
          const ipLocationRes = await fetch("/api/location/ip", {
            method: "GET",
            headers: { Authorization: `Bearer ${authToken}` }
          });

          if (ipLocationRes.ok) {
            const ipData = await ipLocationRes.json();
            if (ipData.lat && ipData.lon) {
              // 模拟GeolocationPosition结构
              position = {
                coords: {
                  latitude: ipData.lat,
                  longitude: ipData.lon,
                  accuracy: 10000, // IP定位精度较低
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null
                },
                timestamp: Date.now()
              } as GeolocationPosition;
            } else {
              throw new Error("IP定位数据无效");
            }
          } else {
            throw new Error("IP定位服务不可用");
          }
        } catch (ipError) {
          console.log("IP定位也失败:", ipError);
          // 所有定位方案都失败，直接返回
          return;
        }
      }

      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ lat: position.coords.latitude, lon: position.coords.longitude }),
      });

      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            setWeather(data);
          } catch (parseError) {
            console.log("天气数据解析失败:", parseError);
          }
        }
      } else {
        console.log("天气API请求失败:", res.status, res.statusText);
      }
    } catch (error) {
      console.log("获取天气失败:", error);
    } finally {
      setWeatherLoading(false);
    }
  }

  function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      // 检查浏览器是否支持地理位置API
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持地理位置服务'));
        return;
      }

      // 检查权限状态（如果浏览器支持）
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'denied') {
            reject(new Error('地理位置权限被拒绝'));
            return;
          }

          // 权限允许或询问状态，继续获取位置
          requestPosition();
        }).catch(() => {
          // 权限API不支持，直接尝试获取位置
          requestPosition();
        });
      } else {
        // 浏览器不支持权限API，直接尝试获取位置
        requestPosition();
      }

      function requestPosition() {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve(position);
          },
          (error) => {
            // 根据错误类型提供更详细的错误信息
            let errorMessage = '获取位置失败';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = '用户拒绝了地理位置权限请求';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = '位置信息不可用';
                break;
              case error.TIMEOUT:
                errorMessage = '获取位置超时';
                break;
              default:
                errorMessage = `获取位置失败: ${error.message}`;
                break;
            }
            reject(new Error(errorMessage));
          },
          {
            timeout: 15000, // 增加超时时间到15秒
            enableHighAccuracy: false,
            maximumAge: 300000 // 5分钟内的缓存位置可接受
          }
        );
      }
    });
  }



  function logout() {
    localStorage.removeItem("token");
    try { localStorage.removeItem('userProfile'); } catch {}
    // 跳转到首页，状态会通过 useEffect 自动更新
    window.location.href = "/";
  }

  // 打开/关闭菜单，带卸载延时以播放关闭动画
  const openMenu = () => {
    setIsMenuMounted(true);
    setMobileMenuOpen(true);
  };
  const closeMenu = () => {
    setMobileMenuOpen(false);
    // 关闭动画 320ms 后卸载
    setTimeout(() => setIsMenuMounted(false), 340);
  };

  // 锁定滚动，提升移动端体验
  useEffect(() => {
    if (isMenuMounted) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isMenuMounted]);

  // 轻量级手势关闭（右滑超过 60px 关闭）
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setTouchDeltaX(0);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartXRef.current;
    setTouchDeltaX(delta);
  };
  const handleTouchEnd = () => {
    if (touchDeltaX > 60) closeMenu();
    setTouchDeltaX(0);
  };

  return (
    <div
      className="w-full bg-white/80 backdrop-blur-xl border-b border-black/[0.06] shadow-sm"
      style={{
        minHeight: 'var(--nav-height, 58px)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: '6px'
      }}
    >
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-6 h-full">
        {/* 顶部主栏 */}
        <div className="w-full flex items-center justify-between py-2.5 sm:py-3 min-h-[44px]">
          {/* 左侧：品牌 + 天气（所有尺寸均显示，手机使用紧凑样式） */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="text-lg sm:text-xl font-semibold text-gray-900 leading-none">kimochi心晴</Link>
            {token && (
              <div className={`transition-all duration-500 ease-out ${weather ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"}`}>
                {weatherLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                    <span>定位中...</span>
                  </div>
                ) : weather ? (
                  <>
                    {/* 桌面/平板：完整天气胶囊 */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50/80 border border-black/[0.06] hover:bg-slate-50 transition-colors duration-200 shadow-sm">
                      <span className="text-sm">{getWeatherIcon(weather.summary)}</span>
                      <div className="text-xs">
                        <span className="font-medium text-gray-700">{weather.locationName}</span>
                        <span className="text-gray-500 ml-1">{weather.summary} {weather.temperatureC}°C</span>
                      </div>
                    </div>
                    {/* 手机：紧凑胶囊，仅图标+温度 */}
                    <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50/90 border border-black/[0.06] shadow-sm text-xs">
                      <span className="text-sm leading-none">{getWeatherIcon(weather.summary)}</span>
                      <span className="font-medium text-gray-700 leading-none">{weather.temperatureC}°C</span>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* 中间/右侧：桌面菜单 */}
          <div className="hidden lg:flex items-center gap-3 text-sm">
            <Link href="/" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">首页</Link>
            {token && (
              <>
                <Link href="/assessments" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">心理测评</Link>
                <Link href="/assessments/history" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">测评历史</Link>
                <Link href="/message-wall" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">留言墙</Link>
                <Link href="/messages" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">心语聊天</Link>
              </>
            )}
            {isSuperAdmin ? (
              <div className="flex items-center gap-2">
                <Link href="/super-admin" className="px-2 py-2 rounded-lg hover:bg-purple-50 text-purple-600 font-medium">高级管理</Link>
                <Link href="/admin" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">数据管理</Link>
                <Link href="/admin/reports" className="px-2 py-2 rounded-lg hover:bg-red-50 text-red-600 font-medium">举报管理</Link>
              </div>
            ) : (isAdmin || userType === 'teacher') && (
              <div className="flex items-center gap-2">
                <Link href="/admin" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">数据管理</Link>
                <Link href="/admin/reports" className="px-2 py-2 rounded-lg hover:bg-red-50 text-red-600 font-medium">举报管理</Link>
              </div>
            )}
            {token ? (
              <>
                <Link href="/profile" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">个人中心</Link>
                <UnifiedNotificationCenter token={validatedToken || undefined} userType={userType} />
                <button onClick={logout} className="rounded-xl bg-black/90 text-white px-3 py-2.5 hover:bg-black shadow-sm backdrop-blur-sm border border-black/10 transition-all duration-200">退出</button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">登录</Link>
                <Link href="/register" className="px-2 py-2 rounded-lg hover:bg-gray-100 text-gray-700">注册</Link>
              </>
            )}
          </div>

          {/* 移动端：精简区 + 菜单按钮 */}
          <div className="flex items-center gap-2 lg:hidden">
            {token && <UnifiedNotificationCenter token={validatedToken || undefined} userType={userType} />}
            <button
              aria-label="打开菜单"
              className="h-11 w-11 min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95 transition tap-44"
              onClick={openMenu}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* 移动端抽屉菜单（使用 Portal，避免被父层级裁剪/遮挡） */}
      {isMenuMounted && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100000] lg:hidden">
          {/* 背景遮罩 */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] ${mobileMenuOpen ? 'backdrop-enter' : 'backdrop-exit'}`}
            onClick={closeMenu}
          />
          {/* 右侧抽屉 */}
          <div
            role="dialog"
            aria-modal="true"
            className={`absolute right-0 top-0 h-[100dvh] w-[86%] max-w-sm bg-white shadow-2xl flex flex-col pt-[max(env(safe-area-inset-top),16px)] rounded-l-3xl ${mobileMenuOpen ? 'drawer-enter' : 'drawer-exit'}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="px-4 pb-3 flex items-center justify-between">
              <span className="text-lg font-semibold">菜单</span>
              <button
                aria-label="关闭菜单"
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200"
                onClick={closeMenu}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29l6.29 6.29 6.3-6.29z"/></svg>
              </button>
            </div>

            {/* 头部信息区 */}
            <div className="px-4 pb-4">
              {weather && (
                <div className="mb-3 flex items-center justify-between px-3 py-2 rounded-2xl bg-gradient-to-r from-slate-50 to-white/90 border border-black/[0.06] shadow-sm">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-base">{getWeatherIcon(weather.summary)}</span>
                    <span className="font-medium text-gray-800">{weather.temperatureC}°C</span>
                    <span className="text-gray-500">{weather.summary}</span>
                  </div>
                  <span className="text-xs text-gray-400">{weather.locationName}</span>
                </div>
              )}
            </div>

            {/* iOS 分组式菜单 */}
            <nav className="px-3 pb-[max(env(safe-area-inset-bottom),16px)] overflow-y-auto">
              {/* 常用 */}
              <div className="mb-5">
                <p className="px-1 pb-2 text-[11px] text-gray-400">常用</p>
                <div className="rounded-2xl overflow-hidden border border-gray-200/70 bg-white/90 backdrop-blur">
                  <Link href="/" onClick={closeMenu} className="flex items-center px-4 py-3 active:bg-gray-100">
                    <span className="mr-3 text-lg">🏠</span>
                    <span className="flex-1">首页</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </Link>
                  {token && (
                    <>
                      <Link href="/assessments" onClick={closeMenu} className="flex items-center px-4 py-3 border-t border-gray-200/70 active:bg-gray-100">
                        <span className="mr-3 text-lg">🧠</span>
                        <span className="flex-1">心理测评</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                      <Link href="/assessments/history" onClick={closeMenu} className="flex items-center px-4 py-3 border-t border-gray-200/70 active:bg-gray-100">
                        <span className="mr-3 text-lg">🗂️</span>
                        <span className="flex-1">测评历史</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                      <Link href="/message-wall" onClick={closeMenu} className="flex items-center px-4 py-3 border-t border-gray-200/70 active:bg-gray-100">
                        <span className="mr-3 text-lg">📝</span>
                        <span className="flex-1">留言墙</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                      <Link href="/messages" onClick={closeMenu} className="flex items-center px-4 py-3 border-t border-gray-200/70 active:bg-gray-100">
                        <span className="mr-3 text-lg">💬</span>
                        <span className="flex-1">心语聊天</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* 管理 */}
              {(isSuperAdmin || isAdmin || userType === 'teacher') && (
                <div className="mb-5">
                  <p className="px-1 pb-2 text-[11px] text-gray-400">管理</p>
                  <div className="rounded-2xl overflow-hidden border border-gray-200/70 bg-white/90 backdrop-blur">
                    {isSuperAdmin && (
                      <Link href="/super-admin" onClick={closeMenu} className="flex items-center px-4 py-3 active:bg-gray-100">
                        <span className="mr-3 text-lg">🛠️</span>
                        <span className="flex-1 text-purple-700 font-medium">高级管理</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                    )}
                    <Link href="/admin" onClick={closeMenu} className="flex items-center px-4 py-3 border-t border-gray-200/70 active:bg-gray-100">
                      <span className="mr-3 text-lg">📊</span>
                      <span className="flex-1">数据管理</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </Link>
                    <Link href="/admin/reports" onClick={closeMenu} className="flex items-center px-4 py-3 border-t border-gray-200/70 active:bg-gray-100">
                      <span className="mr-3 text-lg">🚨</span>
                      <span className="flex-1 text-red-600 font-medium">举报管理</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              )}

              {/* 账户 */}
              <div>
                <p className="px-1 pb-2 text-[11px] text-gray-400">账户</p>
                <div className="rounded-2xl overflow-hidden border border-gray-200/70 bg-white/90 backdrop-blur">
                  {token ? (
                    <>
                      <Link href="/profile" onClick={closeMenu} className="flex items-center px-4 py-3 active:bg-gray-100">
                        <span className="mr-3 text-lg">👤</span>
                        <span className="flex-1">个人中心</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                      <button onClick={() => { closeMenu(); logout(); }} className="w-full flex items-center px-4 py-3 border-t border-gray-200/70 text-red-600 active:bg-red-50">
                        <span className="mr-3 text-lg">🚪</span>
                        <span className="flex-1 text-left">退出登录</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={closeMenu} className="flex items-center px-4 py-3 active:bg-gray-100">
                        <span className="mr-3 text-lg">🔑</span>
                        <span className="flex-1">登录</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                      <Link href="/register" onClick={closeMenu} className="flex items-center px-4 py-3 border-t border-gray-200/70 active:bg-gray-100">
                        <span className="mr-3 text-lg">✍️</span>
                        <span className="flex-1">注册</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </nav>
          </div>

          {/* 动画样式 */}
          <style jsx>{`
            @keyframes drawerIn {
              0% { transform: translateX(100%); opacity: 0.6; }
              60% { transform: translateX(-2%); }
              100% { transform: translateX(0); opacity: 1; }
            }
            @keyframes drawerOut {
              0% { transform: translateX(0); opacity: 1; }
              100% { transform: translateX(100%); opacity: 0.9; }
            }
            @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes backdropOut { from { opacity: 1; } to { opacity: 0; } }
            .drawer-enter { animation: drawerIn 360ms cubic-bezier(0.16, 1, 0.3, 1) forwards; will-change: transform, opacity; }
            .drawer-exit { animation: drawerOut 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards; will-change: transform, opacity; }
            .backdrop-enter { animation: backdropIn 260ms ease-out forwards; }
            .backdrop-exit { animation: backdropOut 220ms ease-in forwards; }
          `}</style>
        </div>,
        document.body
      )}
    </div>
  );
}


