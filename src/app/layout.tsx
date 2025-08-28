import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/app/components/Nav";
import { UnifiedNotificationProvider } from "@/contexts/UnifiedNotificationContext";
import { UnreadProvider } from "@/contexts/UnreadContext";
import { AlertProvider } from "@/components/AppleAlert";
import GlobalToasts from "@/components/GlobalToasts";

export const metadata: Metadata = {
  title: "kimochi心晴 | 心理危机干预",
  description: "温柔而专业的心理关怀与每日鼓励",
};

// 为移动端提供更好的显示区域与刘海屏安全区支持
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`bg-white text-gray-900 antialiased min-h-screen`}>
        <AlertProvider>
          <UnifiedNotificationProvider>
            <UnreadProvider>
              {/* 固定导航栏 */}
              <div className="fixed top-0 left-0 right-0 z-[1000]">
                <Nav />
              </div>

              {/* 全局提示（不影响布局） */}
              <GlobalToasts />

              {/* 主体内容：移除全局滚动和padding，让各页面自己控制布局 */}
              <main
                className="min-h-[100dvh] overflow-hidden"
                style={{
                  // 提供给子页面使用的导航栏偏移量变量（包含额外间距）
                  ['--nav-offset' as any]: `calc(var(--nav-height, 58px) + var(--nav-content-gap, 16px) + env(safe-area-inset-top))`,
                } as React.CSSProperties}
              >
                {children}
              </main>
            </UnreadProvider>
          </UnifiedNotificationProvider>
        </AlertProvider>
      </body>
    </html>
  );
}
