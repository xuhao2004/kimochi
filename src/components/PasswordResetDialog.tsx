"use client";

import React, { useEffect, useState } from 'react';

interface PasswordResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChange: (oldPassword: string, newPassword: string, emailCode?: string) => Promise<void>;
  isNewUser?: boolean;
  isFirstTimeChange?: boolean;  // 是否为首次修改密码
  userType?: string;
}

export default function PasswordResetDialog({
  isOpen,
  onClose,
  onPasswordChange,
  isNewUser = false,
  isFirstTimeChange = false,
  userType = "用户"
}: PasswordResetDialogProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 密码验证
    if (newPassword.length < 8) {
      setError('新密码长度至少8位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新密码与确认密码不一致');
      return;
    }

    // 检查密码强度
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError('密码必须包含大写字母、小写字母和数字');
      return;
    }

    try {
      setLoading(true);
      // 如果是首次修改密码且是默认密码，自动使用默认密码作为当前密码
      const currentPassword = isFirstTimeChange ? 'kimochi@2025' : oldPassword;
      await onPasswordChange(currentPassword, newPassword, emailCode || undefined);
      // 重置表单
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!isNewUser) {
      onClose();
    }
  };

  // 倒计时副作用
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-auto my-8 overflow-hidden min-h-fit max-h-[90vh] flex flex-col" style={{ animation: 'dialogBounceIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* 头部 - 固定 */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 sm:p-6 text-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
            <h2 className="text-xl font-bold">
              {isFirstTimeChange ? '密码安全提醒' : '修改密码'}
            </h2>
            <p className="text-white/90 text-sm">
              {isFirstTimeChange ? '检测到您正在使用默认密码，建议立即修改' : '为保障账户安全，请设置一个强密码'}
            </p>
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {isFirstTimeChange && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="font-medium text-orange-900 mb-1">安全提醒</h3>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• 检测到您正在使用默认密码 kimochi@2025</li>
                    <li>• 为了账户安全，建议立即修改密码</li>
                    <li>• 新密码应包含大小写字母、数字</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* 当前密码 - 首次修改密码时隐藏 */}
            {!isFirstTimeChange && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  当前密码
                </label>
                <div className="relative">
                  <input
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={isNewUser ? "请输入默认密码 kimochi@2025" : "请输入当前密码"}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm sm:text-base"
                  required
                />
                  <button type="button" onClick={() => setShowOld(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showOld ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}
            
            {/* 首次修改密码的提示 */}
            {isFirstTimeChange && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-green-900 mb-1">首次修改密码</h3>
                    <p className="text-sm text-green-800">
                      检测到您正在使用默认密码，首次修改无需输入当前密码，请直接设置新密码。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 新密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新密码
              </label>
              <div className="relative">
                <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少8位）"
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm sm:text-base"
                required
                minLength={8}
              />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* 密保邮箱验证码（非首次默认密码时需要） */}
            {!isFirstTimeChange && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密保邮箱验证码
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    placeholder="请输入6位验证码"
                    maxLength={6}
                    className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    disabled={loading || countdown > 0}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        setError('');
                        const token = localStorage.getItem('token');
                        if (!token) { setError('未登录'); return; }
                        const res = await fetch('/api/auth/change-password/request-code', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || '发送验证码失败');

                        if (data.skipCode) {
                          // 无需验证码的情况
                          setError(''); // 清除错误信息
                          alert(data.message || '您的账号无需验证码');
                        } else {
                          // 需要验证码的情况
                          setCountdown(60);
                          alert(data.message || '验证码已发送');
                        }
                      } catch (e) {
                        setError(e instanceof Error ? e.message : '发送验证码失败');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl transition-colors text-sm ${countdown>0 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'}`}
                  >
                    {countdown>0 ? `${countdown}s后重试` : '获取验证码'}
                  </button>
                </div>
              </div>
            )}

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认新密码
              </label>
              <div className="relative">
                <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm sm:text-base"
                required
                minLength={8}
              />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* 密码要求提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">密码要求：</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• 至少8个字符</li>
                <li>• 包含大写字母（A-Z）</li>
                <li>• 包含小写字母（a-z）</li>
                <li>• 包含数字（0-9）</li>
                <li>• 建议包含特殊符号</li>
              </ul>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

          </form>
        </div>

        {/* 按钮区域 - 固定底部 */}
        <div className="flex-shrink-0 p-4 sm:p-6 bg-gray-50/80 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            {!isNewUser && (
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
              >
                稍后修改
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-medium text-sm sm:text-base ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg transform hover:scale-[1.02]'
              }`}
            >
              {loading ? '修改中...' : '立即修改'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using password reset dialog
export function usePasswordResetDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const showPasswordReset = () => setIsOpen(true);
  const hidePasswordReset = () => setIsOpen(false);

  return {
    isOpen,
    showPasswordReset,
    hidePasswordReset
  };
}
