import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { NotificationService } from '@/lib/notificationService';
import { prisma } from '@/lib/prisma';

// 错误监控配置
const ERROR_MONITOR_CONFIG = {
  // 需要监控的API路径
  monitoredPaths: [
    '/api/weather',
    '/api/daily',
    '/api/assessments',
    '/api/upload-avatar',
    '/api/profile',
    '/api/chat',
    '/api/message-wall'
  ],
  // 忽略的错误状态码
  ignoredStatusCodes: [400, 401, 403], // 客户端错误通常不需要系统警报
  // 错误频率限制（避免重复通知）
  errorCooldown: 5 * 60 * 1000, // 5分钟内同一类型错误只通知一次
};

// 错误缓存（内存中临时存储，避免重复通知）
const errorCache = new Map<string, number>();

/**
 * API错误监控装饰器
 * 包装API处理函数，自动捕获和报告错误
 */
export function withErrorMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  featureName: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let response: NextResponse;
    
    try {
      response = await handler(req);
      
      // 检查响应状态码
      if (response.status >= 500) {
        await handleServerError(req, response, featureName, startTime);
      }
      
      return response;
    } catch (error) {
      // 捕获未处理的异常
      await handleUnhandledException(req, error, featureName, startTime);
      
      // 返回通用错误响应
      return NextResponse.json(
        { error: '服务器内部错误，请稍后重试' },
        { status: 500 }
      );
    }
  };
}

/**
 * 处理服务器错误（5xx状态码）
 */
async function handleServerError(
  req: NextRequest,
  response: NextResponse,
  featureName: string,
  startTime: number
): Promise<void> {
  try {
    const duration = Date.now() - startTime;
    const url = req.url;
    const method = req.method;
    
    // 尝试获取错误详情
    let errorDetails = `HTTP ${response.status}`;
    try {
      const responseText = await response.text();
      if (responseText) {
        const errorData = JSON.parse(responseText);
        errorDetails = errorData.error || errorDetails;
      }
    } catch {
      // 解析失败，使用默认错误信息
    }
    
    // 检查是否需要跳过监控
    if (ERROR_MONITOR_CONFIG.ignoredStatusCodes.includes(response.status)) {
      return;
    }
    
    // 检查错误频率限制
    const errorKey = `${featureName}-${response.status}`;
    const lastNotified = errorCache.get(errorKey);
    const now = Date.now();
    
    if (lastNotified && (now - lastNotified) < ERROR_MONITOR_CONFIG.errorCooldown) {
      return; // 跳过重复通知
    }
    
    errorCache.set(errorKey, now);
    
    // 获取用户信息
    const userInfo = await getUserInfoFromRequest(req);
    
    if (userInfo) {
      await NotificationService.recordUserFacingError(
        userInfo.userId,
        { name: userInfo.name, accountType: userInfo.accountType },
        featureName,
        `${method} ${url} 响应错误: ${errorDetails}`,
        {
          statusCode: response.status,
          duration,
          userAgent: req.headers.get('user-agent'),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
        }
      );
    } else {
      // 未授权用户的错误
      await NotificationService.recordSystemError(
        featureName,
        `匿名用户访问错误: ${method} ${url} - ${errorDetails}`,
        'medium'
      );
    }
  } catch (monitorError) {
    console.error('Error monitoring failed:', monitorError);
  }
}

/**
 * 处理未捕获的异常
 */
async function handleUnhandledException(
  req: NextRequest,
  error: unknown,
  featureName: string,
  startTime: number
): Promise<void> {
  try {
    const duration = Date.now() - startTime;
    const url = req.url;
    const method = req.method;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // 检查错误频率限制
    const errorKey = `${featureName}-exception`;
    const lastNotified = errorCache.get(errorKey);
    const now = Date.now();
    
    if (lastNotified && (now - lastNotified) < ERROR_MONITOR_CONFIG.errorCooldown) {
      return;
    }
    
    errorCache.set(errorKey, now);
    
    // 获取用户信息
    const userInfo = await getUserInfoFromRequest(req);
    
    const context = {
      duration,
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      stack: errorStack?.split('\n').slice(0, 5).join('\n') // 限制堆栈跟踪长度
    };
    
    if (userInfo) {
      await NotificationService.recordUserFacingError(
        userInfo.userId,
        { name: userInfo.name, accountType: userInfo.accountType },
        featureName,
        `${method} ${url} 未处理异常: ${errorMessage}`,
        context
      );
    } else {
      await NotificationService.recordSystemError(
        featureName,
        `匿名用户触发异常: ${method} ${url} - ${errorMessage}`,
        'high'
      );
    }
  } catch (monitorError) {
    console.error('Exception monitoring failed:', monitorError);
  }
}

/**
 * 从请求中获取用户信息
 */
async function getUserInfoFromRequest(req: NextRequest): Promise<{
  userId: string;
  name: string;
  accountType: string;
} | null> {
  try {
    const auth = req.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    
    if (!token) return null;
    
    const payload = verifyToken(token);
    if (!payload) return null;
    
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        accountType: true
      }
    });
    
    if (!user) return null;
    
    return {
      userId: user.id,
      name: user.name,
      accountType: user.accountType
    };
  } catch {
    return null;
  }
}

/**
 * 手动报告错误（用于catch块中）
 */
export async function reportError(
  error: unknown,
  context: {
    feature: string;
    userId?: string;
    userInfo?: { name: string; accountType: string };
    additionalContext?: Record<string, any>;
  }
): Promise<void> {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (context.userId && context.userInfo) {
      await NotificationService.recordUserFacingError(
        context.userId,
        context.userInfo,
        context.feature,
        errorMessage,
        context.additionalContext
      );
    } else {
      await NotificationService.recordSystemError(
        context.feature,
        errorMessage,
        'medium'
      );
    }
  } catch (reportError) {
    console.error('Failed to report error:', reportError);
  }
}

/**
 * 清理错误缓存（避免内存泄漏）
 */
export function cleanupErrorCache(): void {
  const now = Date.now();
  const cutoff = now - ERROR_MONITOR_CONFIG.errorCooldown * 2; // 清理超过冷却时间2倍的缓存
  
  for (const [key, timestamp] of errorCache.entries()) {
    if (timestamp < cutoff) {
      errorCache.delete(key);
    }
  }
}

// 定期清理缓存
setInterval(cleanupErrorCache, 10 * 60 * 1000); // 每10分钟清理一次
