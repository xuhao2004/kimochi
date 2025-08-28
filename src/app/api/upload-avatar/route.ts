import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordUserAction } from "@/lib/userActions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
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
    const formData = await req.formData();
    const file = formData.get("avatar") as File;
    
    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "不支持的文件类型，请上传 JPEG、PNG 或 WebP 格式的图片" 
      }, { status: 400 });
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "文件大小不能超过 5MB" 
      }, { status: 400 });
    }

    // 创建上传目录
    const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成文件名
    const fileExtension = file.name.split('.').pop();
    const fileName = `${payload.sub}-${Date.now()}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 更新数据库
    const profileImagePath = `/uploads/avatars/${fileName}`;
    const updatedUser = await prisma.user.update({
      where: { id: payload.sub },
      data: { profileImage: profileImagePath },
      select: {
        id: true,
        profileImage: true,
      },
    });

    // 记录头像上传行为
    await recordUserAction(payload.sub, "avatar_upload", {
      fileName,
      fileSize: file.size,
      fileType: file.type
    });

    return NextResponse.json({ 
      message: "头像上传成功",
      profileImage: updatedUser.profileImage
    });
  } catch (error) {
    console.error("上传头像失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    // 清除用户头像
    const updatedUser = await prisma.user.update({
      where: { id: payload.sub },
      data: { profileImage: null },
      select: {
        id: true,
        profileImage: true,
      },
    });

    return NextResponse.json({ 
      message: "头像已重置",
      profileImage: updatedUser.profileImage
    });
  } catch (error) {
    console.error("重置头像失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
