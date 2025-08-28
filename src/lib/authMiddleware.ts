import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AuthPayload {
  sub: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
  tokenVersion?: number;
}

export async function authenticateRequest(req: Request): Promise<{ 
  success: true; 
  payload: AuthPayload; 
} | { 
  success: false; 
  response: NextResponse; 
}> {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    
    if (!token) {
      return {
        success: false,
        response: NextResponse.json({ error: "未授权" }, { status: 401 })
      };
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return {
        success: false,
        response: NextResponse.json({ error: "无效的token" }, { status: 401 })
      };
    }

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isAdmin: true, tokenVersion: true }
    });
    
    if (!user) {
      return {
        success: false,
        response: NextResponse.json({ 
          error: "用户不存在，请重新登录", 
          code: "USER_NOT_FOUND" 
        }, { status: 401 })
      };
    }

    // 版本号校验（老token无该字段则放行，待自然过期）
    if (typeof payload.tokenVersion === 'number' && user.tokenVersion !== payload.tokenVersion) {
      return {
        success: false,
        response: NextResponse.json({ error: "登录状态已失效，请重新登录" }, { status: 401 })
      };
    }

    return {
      success: true,
      payload: {
        ...payload,
        isAdmin: user.isAdmin
      }
    };

  } catch (error) {
    console.error("认证失败:", error);
    return {
      success: false,
      response: NextResponse.json({ error: "认证失败" }, { status: 500 })
    };
  }
}

// 仅管理员访问的认证
export async function authenticateAdmin(req: Request): Promise<{ 
  success: true; 
  payload: AuthPayload; 
} | { 
  success: false; 
  response: NextResponse; 
}> {
  const authResult = await authenticateRequest(req);
  
  if (!authResult.success) {
    return authResult;
  }

  if (!authResult.payload.isAdmin) {
    return {
      success: false,
      response: NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
    };
  }

  return authResult;
}
