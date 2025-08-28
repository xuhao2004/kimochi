/**
 * 统一错误处理工具
 * 用于将技术错误转换为用户友好的错误信息
 */

// 错误类型定义
export interface UserFriendlyError {
  title: string;
  message: string;
  code?: string;
  retryable?: boolean;
}

// 数据库错误映射
const DATABASE_ERROR_MAP: Record<string, UserFriendlyError> = {
  'P2021': {
    title: '数据库连接异常',
    message: '系统正在维护中，请稍后重试',
    code: 'DB_CONNECTION_ERROR',
    retryable: true
  },
  'P2002': {
    title: '数据冲突',
    message: '该信息已存在，请检查后重试',
    code: 'DUPLICATE_ERROR',
    retryable: false
  },
  'P2025': {
    title: '数据不存在',
    message: '请求的数据不存在或已被删除',
    code: 'NOT_FOUND_ERROR',
    retryable: false
  },
  'P2003': {
    title: '数据关联错误',
    message: '数据关联异常，请联系管理员',
    code: 'FOREIGN_KEY_ERROR',
    retryable: false
  }
};

// 网络错误映射
const NETWORK_ERROR_MAP: Record<string, UserFriendlyError> = {
  'NETWORK_ERROR': {
    title: '网络连接异常',
    message: '请检查网络连接后重试',
    code: 'NETWORK_ERROR',
    retryable: true
  },
  'TIMEOUT_ERROR': {
    title: '请求超时',
    message: '服务器响应超时，请稍后重试',
    code: 'TIMEOUT_ERROR',
    retryable: true
  },
  'SERVER_ERROR': {
    title: '服务器错误',
    message: '服务器暂时无法处理请求，请稍后重试',
    code: 'SERVER_ERROR',
    retryable: true
  }
};

// 业务错误映射
const BUSINESS_ERROR_MAP: Record<string, UserFriendlyError> = {
  'UNAUTHORIZED': {
    title: '登录已过期',
    message: '请重新登录后继续操作',
    code: 'UNAUTHORIZED',
    retryable: false
  },
  'FORBIDDEN': {
    title: '权限不足',
    message: '您没有权限执行此操作',
    code: 'FORBIDDEN',
    retryable: false
  },
  'VALIDATION_ERROR': {
    title: '输入信息有误',
    message: '请检查输入信息后重试',
    code: 'VALIDATION_ERROR',
    retryable: false
  }
};

/**
 * 将技术错误转换为用户友好的错误信息
 */
export function convertToUserFriendlyError(error: unknown): UserFriendlyError {
  // 如果已经是用户友好错误，直接返回
  if (isUserFriendlyError(error)) {
    return error;
  }

  // 处理字符串错误
  if (typeof error === 'string') {
    return {
      title: '操作失败',
      message: error,
      retryable: false
    };
  }

  // 处理Error对象
  if (error instanceof Error) {
    const errorMessage = error.message;

    // 检查是否是Prisma数据库错误
    if (errorMessage.includes('PrismaClientKnownRequestError')) {
      const codeMatch = errorMessage.match(/code:\s*'([^']+)'/);
      if (codeMatch) {
        const prismaCode = codeMatch[1];
        return DATABASE_ERROR_MAP[prismaCode] || {
          title: '数据库错误',
          message: '数据操作失败，请稍后重试',
          code: 'DB_UNKNOWN_ERROR',
          retryable: true
        };
      }
    }

    // 检查是否是网络错误
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return NETWORK_ERROR_MAP['NETWORK_ERROR'];
    }

    // 检查是否是超时错误
    if (errorMessage.includes('timeout')) {
      return NETWORK_ERROR_MAP['TIMEOUT_ERROR'];
    }

    // 检查是否包含敏感信息（数据库表名、字段名等）
    if (containsSensitiveInfo(errorMessage)) {
      return {
        title: '系统错误',
        message: '系统遇到了一些问题，请稍后重试',
        code: 'SYSTEM_ERROR',
        retryable: true
      };
    }

    // 其他Error对象
    return {
      title: '操作失败',
      message: errorMessage,
      retryable: false
    };
  }

  // 默认错误
  return {
    title: '未知错误',
    message: '系统遇到了未知问题，请稍后重试',
    code: 'UNKNOWN_ERROR',
    retryable: true
  };
}

/**
 * 检查是否是用户友好错误
 */
function isUserFriendlyError(error: unknown): error is UserFriendlyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'title' in error &&
    'message' in error &&
    typeof (error as any).title === 'string' &&
    typeof (error as any).message === 'string'
  );
}

/**
 * 检查错误信息是否包含敏感信息
 */
function containsSensitiveInfo(message: string): boolean {
  const sensitivePatterns = [
    /table\s+`?main\./i,           // 数据库表名
    /column\s+`?[a-zA-Z_]+`?/i,    // 数据库字段名
    /prisma/i,                     // Prisma相关
    /database/i,                   // 数据库相关
    /sql/i,                        // SQL相关
    /constraint/i,                 // 约束相关
    /foreign\s+key/i,              // 外键相关
    /unique\s+constraint/i,        // 唯一约束
    /violates/i,                   // 违反约束
    /invalid.*invocation/i,        // Prisma调用错误
    /node_modules/i,               // 文件路径
    /\.js:\d+:\d+/i,              // 错误堆栈
    /at\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/i // 函数调用堆栈
  ];

  return sensitivePatterns.some(pattern => pattern.test(message));
}

/**
 * 根据HTTP状态码获取用户友好错误
 */
export function getErrorByStatusCode(statusCode: number, defaultMessage?: string): UserFriendlyError {
  switch (statusCode) {
    case 400:
      return {
        title: '请求错误',
        message: defaultMessage || '请求参数有误，请检查后重试',
        code: 'BAD_REQUEST',
        retryable: false
      };
    case 401:
      return BUSINESS_ERROR_MAP['UNAUTHORIZED'];
    case 403:
      return BUSINESS_ERROR_MAP['FORBIDDEN'];
    case 404:
      return {
        title: '页面不存在',
        message: defaultMessage || '请求的页面或资源不存在',
        code: 'NOT_FOUND',
        retryable: false
      };
    case 429:
      return {
        title: '请求过于频繁',
        message: '请求过于频繁，请稍后重试',
        code: 'RATE_LIMIT',
        retryable: true
      };
    case 500:
      return NETWORK_ERROR_MAP['SERVER_ERROR'];
    case 502:
    case 503:
    case 504:
      return {
        title: '服务暂时不可用',
        message: '服务器暂时不可用，请稍后重试',
        code: 'SERVICE_UNAVAILABLE',
        retryable: true
      };
    default:
      return {
        title: '请求失败',
        message: defaultMessage || '请求失败，请稍后重试',
        code: 'REQUEST_FAILED',
        retryable: true
      };
  }
}

/**
 * 显示用户友好的错误提示
 */
export function showUserFriendlyError(error: unknown) {
  const friendlyError = convertToUserFriendlyError(error);
  
  // 触发全局错误提示
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('showErrorToast', {
      detail: {
        title: friendlyError.title,
        message: friendlyError.message
      }
    }));
  }
  
  return friendlyError;
}

/**
 * API请求错误处理装饰器
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`${context || 'API'} 错误:`, error);
      const friendlyError = convertToUserFriendlyError(error);
      
      // 记录错误（如果需要）
      if (typeof window !== 'undefined' && friendlyError.code) {
        console.warn(`用户友好错误 [${friendlyError.code}]:`, friendlyError.message);
      }
      
      throw friendlyError;
    }
  }) as T;
}

/**
 * 创建加载状态管理器
 */
export function createLoadingManager() {
  let loadingCount = 0;
  const listeners = new Set<(loading: boolean) => void>();

  return {
    addListener: (listener: (loading: boolean) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    
    startLoading: () => {
      loadingCount++;
      if (loadingCount === 1) {
        listeners.forEach(listener => listener(true));
      }
    },
    
    stopLoading: () => {
      loadingCount = Math.max(0, loadingCount - 1);
      if (loadingCount === 0) {
        listeners.forEach(listener => listener(false));
      }
    },
    
    isLoading: () => loadingCount > 0
  };
}

// 全局加载管理器
export const globalLoadingManager = createLoadingManager();
