import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { recordUserAction } from "@/lib/userActions";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "无效的访问令牌" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "未选择文件" }, { status: 400 });

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "不支持的文件类型" }, { status: 400 });
    }

    // 10MB 上限
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) return NextResponse.json({ error: "文件过大 (<=10MB)" }, { status: 400 });

    const uploadDir = join(process.cwd(), "public", "uploads", "images");
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const name = `${payload.sub}-${Date.now()}.${ext}`;
    const filePath = join(uploadDir, name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const urlPath = `/uploads/images/${name}`;
    await recordUserAction(payload.sub, "upload_image", { path: urlPath, size: file.size, type: file.type });

    return NextResponse.json({ url: urlPath });
  } catch (e) {
    console.error("上传失败:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}


