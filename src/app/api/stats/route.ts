import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getUserStats } from "@/lib/userActions";

export async function GET(req: Request) {
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
    // 获取真实的用户统计数据
    const stats = await getUserStats(payload.sub);
    
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("获取统计数据失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
