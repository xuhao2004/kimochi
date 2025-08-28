import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { recordUserAction } from "@/lib/userActions";
import { updateUserActivity, updateSystemStats } from "@/lib/userActivity";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  
  if (!token) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "无效的访问令牌" }, { status: 401 });
  }

  try {
    const { page, timestamp } = await req.json();
    
    // 记录页面访问行为
    await recordUserAction(payload.sub, "page_visit", {
      page,
      timestamp,
      userAgent: req.headers.get("user-agent") || "unknown"
    });

    // 更新用户活跃时间
    await updateUserActivity(payload.sub);
    
    // 更新系统统计
    await updateSystemStats('visit');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("记录页面访问失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
