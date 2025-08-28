# Kimochi 心晴 - 多阶段 Docker 构建

# 阶段 1: 依赖安装
FROM node:20-alpine AS deps
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache libc6-compat sqlite

# 复制包管理文件和配置
COPY package*.json ./
COPY yarn.lock* ./
# 复制 Tailwind CSS v4 配置（样式关键文件）
COPY postcss.config.mjs* ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 生成 Prisma Client
RUN npx prisma generate

# 阶段 2: 构建应用
FROM node:20-alpine AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 验证关键配置文件是否存在
RUN echo "检查关键配置文件..." && \
    ls -la postcss.config.mjs || echo "警告: postcss.config.mjs 未找到" && \
    grep -n "@import \"tailwindcss\"" src/app/globals.css || echo "警告: 在 globals.css 中未找到 Tailwind CSS 导入"

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# 构建应用
RUN npm run build

# 验证 CSS 构建输出
RUN echo "检查 CSS 构建输出..." && \
    find .next -name "*.css" -exec ls -lh {} \; | head -5 && \
    echo "上述 CSS 文件应大于 100KB 以确保 Tailwind 正确编译"

# 阶段 3: 运行时镜像
FROM node:20-alpine AS runner
WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 安装运行时依赖
RUN apk add --no-cache \
    sqlite \
    curl \
    bash \
    git \
    && rm -rf /var/cache/apk/*

# 设置环境变量
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 验证 CSS 构建输出
RUN echo "检查 CSS 构建输出..." && \
    find .next -name "*.css" -exec ls -lh {} \; | head -5 && \
    echo "上述 CSS 文件应大于 100KB 以确保 Tailwind 正确编译"

# 复制 CLI 工具和脚本
COPY --from=builder /app/tools ./tools
COPY --from=builder /app/scripts ./scripts

# 确保脚本有执行权限
RUN chmod +x ./scripts/*.sh
COPY --from=builder /app/config ./config
COPY --from=builder /app/prisma ./prisma

# 复制 Prisma Client
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma

# 设置权限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 创建必要目录
RUN mkdir -p .deploy-logs .backups .locks .pids .cloudflare-logs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
