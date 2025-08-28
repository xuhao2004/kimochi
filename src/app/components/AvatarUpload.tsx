"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { getAvatarClasses } from "@/lib/avatar";

interface AvatarUploadProps {
  userId: string;
  name: string;
  currentAvatar?: string | null;
  onAvatarChange: (newAvatar: string | null) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function AvatarUpload({ 
  userId, 
  name, 
  currentAvatar, 
  onAvatarChange,
  size = 'lg' 
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showActions, setShowActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const token = localStorage.getItem("token");
      const response = await fetch("/api/upload-avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        onAvatarChange(data.profileImage);
        setShowActions(false);
      } else {
        setError(data.error || "上传失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setUploading(false);
      // 清空文件输入，允许再次选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/upload-avatar", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        onAvatarChange(null);
        setShowActions(false);
      } else {
        setError(data.error || "重置失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setUploading(false);
    }
  };

  const avatarStyles = getAvatarClasses(userId, name, size);

  return (
    <div className="relative group">
      {/* 头像显示 */}
      <div 
        className="relative cursor-pointer"
        onClick={() => setShowActions(!showActions)}
      >
        {currentAvatar ? (
          <Image 
            src={currentAvatar} 
            alt={name}
            width={80}
            height={80}
            className={`${avatarStyles.containerClass.replace('bg-gradient-to-br', '').split(' ').filter(c => !c.includes('from-') && !c.includes('to-')).join(' ')} object-cover ring-2 ring-white/20 shadow-sm transition-transform duration-200 group-hover:scale-105`}
          />
        ) : (
          <div className={`${avatarStyles.containerClass} transition-transform duration-200 group-hover:scale-105`}>
            <span className={avatarStyles.textClass}>
              {avatarStyles.initials}
            </span>
          </div>
        )}
        
        {/* 上传覆盖层 */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-medium">
            {uploading ? "上传中..." : "更换"}
          </span>
        </div>
      </div>

      {/* 操作菜单 */}
      {showActions && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-[9999] min-w-[120px]">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            从相册选择
          </button>
          {currentAvatar && (
            <button
              onClick={handleRemoveAvatar}
              disabled={uploading}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              使用默认头像
            </button>
          )}
          <button
            onClick={() => setShowActions(false)}
            className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
          >
            ✕ 取消
          </button>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 错误提示 */}
      {error && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs z-[9999] max-w-[200px] text-center">
          {error}
        </div>
      )}

      {/* 点击外部关闭菜单 */}
      {showActions && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}
