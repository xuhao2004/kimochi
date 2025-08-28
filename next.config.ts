import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";

const createConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  const isProd = phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER;

  return {
    // 关键：区分 dev 与 prod 的构建产物目录，避免同时运行时相互覆盖
    distDir: isDev ? ".next-dev" : ".next-prod",

    // 允许开发时从指定域访问 Next 内部资源（解决 dev.kimochi.space → /_next/* 跨域警告）
    allowedDevOrigins: ["https://dev.kimochi.space"],

    // 低配置服务器优化
    experimental: {
      // 减少内存使用
      workerThreads: false,
    },

    // 构建优化
    poweredByHeader: false,

    // 生产环境输出优化
    output: isProd ? 'standalone' : undefined,

    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Frame-Options", value: "DENY" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-XSS-Protection", value: "0" },
            {
              key: "Permissions-Policy",
              value: [
                "camera=()",
                "microphone=()",
                "geolocation=*",
                "fullscreen=*",
              ].join(", ")
            },
            // 基础 CSP（注意：如需使用内联脚本、第三方资源，请在部署前按需放宽策略）
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob:",
                "font-src 'self' data:",
                "connect-src 'self' https: http: ws: wss:",
                // 允许在本域内嵌入 Office Online 预览与本地 blob/data 资源
                "frame-src 'self' https://view.officeapps.live.com data: blob:",
                "child-src 'self' https://view.officeapps.live.com data: blob:",
                // 我方页面不可被任何站点嵌入
                "frame-ancestors 'none'",
                "object-src 'none'",
                "base-uri 'self'",
              ].join('; ')
            }
          ]
        }
      ];
    }
  };
};

export default createConfig;
