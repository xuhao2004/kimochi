import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createAdminUser, createAdminSchema } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  
  if (!token) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.isAdmin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = createAdminSchema.parse(body);
    
    const newAdmin = await createAdminUser(validatedData);
    
    return NextResponse.json({ 
      message: "管理员账户创建成功",
      admin: newAdmin
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("创建管理员失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
