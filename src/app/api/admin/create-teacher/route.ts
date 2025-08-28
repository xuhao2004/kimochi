import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createTeacherUser, createTeacherSchema } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  
  if (!token) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.isSuperAdmin) {
    return NextResponse.json({ error: "需要超级管理员权限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = createTeacherSchema.parse(body);
    
    const newTeacher = await createTeacherUser(validatedData);
    
    return NextResponse.json({ 
      message: "教师账户创建成功",
      teacher: newTeacher
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("创建教师账户失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
