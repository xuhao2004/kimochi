import { NextResponse } from "next/server";
import { batchCreateStudentsSchema, batchCreateStudents, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 验证管理员权限
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "无效的认证令牌" }, { status: 401 });
    }
    
    // 检查是否为管理员
    const admin = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isAdmin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    
    const json = await req.json();
    const input = batchCreateStudentsSchema.parse(json);
    const students = await batchCreateStudents(input);
    
    return NextResponse.json({ 
      message: `成功创建 ${students.length} 个学生账号`,
      students: students.map(s => ({
        id: s.id,
        studentId: s.studentId,
        name: s.name,
        className: s.className,
        gender: s.gender
      }))
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "批量创建失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
