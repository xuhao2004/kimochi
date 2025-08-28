"use client";

import React, { useState, useEffect } from 'react';
import AppleButton from './AppleButton';
import AppleInput from './AppleInput';
import AppleTextarea from './AppleTextarea';
import BufferLogoutModal from './BufferLogoutModal';

interface AccountChangeRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  changeType: 'email';
  currentValue: string;
  onSuccess: () => void;
}

export default function AccountChangeRequestDialog({
  isOpen,
  onClose,
  changeType,
  currentValue,
  onSuccess
}: AccountChangeRequestDialogProps) {
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: 填写信息, 2: 验证码
  const [codeSentOld, setCodeSentOld] = useState(false);
  const [codeSentNew, setCodeSentNew] = useState(false);
  const [countdownOld, setCountdownOld] = useState(0);
  const [countdownNew, setCountdownNew] = useState(0);
  const [mockNoticeOld, setMockNoticeOld] = useState(false);
  const [mockNoticeNew, setMockNoticeNew] = useState(false);
  const [showBuffer, setShowBuffer] = useState(false);
  const disableVerification = process.env.NEXT_PUBLIC_DISABLE_VERIFICATION_CODE === '1';
  const enableSmsVerification = false; // 已下线短信功能

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setNewValue('');
      setReason('');
      setOldCode('');
      setNewCode('');
      setError('');
      setStep(1);
      setCodeSentOld(false);
      setCodeSentNew(false);
      setCountdownOld(0);
      setCountdownNew(0);
      setMockNoticeOld(false);
      setMockNoticeNew(false);
    }
  }, [isOpen]);

  // 倒计时
  useEffect(() => {
    if (countdownOld > 0) {
      const timer = setTimeout(() => setCountdownOld(countdownOld - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdownOld]);
  useEffect(() => {
    if (countdownNew > 0) {
      const timer = setTimeout(() => setCountdownNew(countdownNew - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdownNew]);

  // 发送新值验证码
  const sendNewVerificationCode = async () => {
    if (disableVerification) {
      setError('验证码功能已停用');
      return;
    }
    if (!newValue) {
      setError(`请先填写新的${changeType === 'email' ? '邮箱' : '手机号'}`);
      return;
    }

    // 验证邮箱或手机号格式
    {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newValue)) {
        setError('请输入有效的邮箱地址');
        return;
      }
      // 前端预检：禁止与已有邮箱账号或密保邮箱重复（轻量提示，最终以后端为准）
      try {
        const res = await fetch('/api/account-change/request/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email', value: newValue }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || '该邮箱不可用'); return; }
      } catch {}
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/account-change/request/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeType: 'email', newValue, target: 'new' })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '发送验证码失败');
        return;
      }

      setCodeSentNew(true);
      setCountdownNew(60);
      setStep(2);
      // 开发环境可能返回 devCode，仅用于调试；不自动填充，保持用户手动输入
      const isDevHost = typeof window !== 'undefined' && (
        window.location.host.includes('dev.kimochi.space') ||
        window.location.hostname.startsWith('localhost') ||
        window.location.hostname.startsWith('127.0.0.1')
      );
      setMockNoticeNew(Boolean(isDevHost && data && data.mocked));
    } catch (error) {
      setError('发送验证码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 发送旧值验证码（邮箱/手机号）
  const sendOldVerificationCode = async () => {
    if (disableVerification) return;
    // 旧值取自 currentValue
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/account-change/request/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ changeType: 'email', target: 'old' })
      });
      const data = await res.json();
      if (!res.ok) {
        // 若未设置旧值或其他原因，可不阻塞流程，仅提示
        setError(data.error || '发送旧账号验证码失败');
        return;
      }
      setCodeSentOld(true);
      setCountdownOld(60);
      const isDevHost = typeof window !== 'undefined' && (
        window.location.host.includes('dev.kimochi.space') ||
        window.location.hostname.startsWith('localhost') ||
        window.location.hostname.startsWith('127.0.0.1')
      );
      setMockNoticeOld(Boolean(isDevHost && data && data.mocked));
    } catch (e) {
      setError('发送旧账号验证码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 第一步：同时发送旧/新验证码并进入第二步
  const startVerification = async () => {
    setError('');
    if (!newValue || !reason) {
      setError('请填写所有必填字段');
      return;
    }
    // 邮箱必须双端
    await sendOldVerificationCode();
    await sendNewVerificationCode();
  };

  // 提交申请（带验证码）
  const handleSubmit = async () => {
    if (disableVerification) {
      setError('验证码功能已停用');
      return;
    }
    if (!newValue || !reason) {
      setError('请填写所有必填字段');
      return;
    }
    if (!oldCode) { setError('请输入旧邮箱验证码'); return; }
    if (!newCode) { setError('请输入新邮箱验证码'); return; }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/account-change/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ changeType: 'email', newValue, reason, oldCode, newCode })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        if (data.forceLogout) {
          setShowBuffer(true);
          return;
        }
        onClose();
      } else {
        setError(data.error || '申请提交失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 对话框 */}
      <div className="relative w-full max-w-lg md:max-w-xl mx-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden" style={{ animation: 'dialogBounceIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          {/* 头部 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 md:px-8 py-4 md:py-5 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  申请修改{changeType === 'email' ? '邮箱' : '手机号'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  当前{changeType === 'email' ? '邮箱' : '手机号'}：{currentValue}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 内容 */}
          <div className="p-6 md:p-8">
            {disableVerification ? (
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                  验证码功能已停用，目前不可申请修改登录邮箱/手机号。
                </div>
                <div className="flex space-x-3 pt-2">
                  <AppleButton
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1"
                  >
                    关闭
                  </AppleButton>
                </div>
              </div>
            ) : step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">新的邮箱地址 *</label>
                  <AppleInput type={'email'} value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder={`请输入新的邮箱地址`} disabled={loading} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    申请理由 *
                  </label>
                  <AppleTextarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="请详细说明您申请修改的原因（例如：原邮箱无法使用、更换手机号等）"
                    rows={5}
                    maxLength={500}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <AppleButton
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1"
                  >
                    取消
                  </AppleButton>
                  <AppleButton
                    onClick={startVerification}
                    isLoading={loading}
                    className="flex-1"
                  >
                    获取验证码
                  </AppleButton>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 1 0-8 0v6l8 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">验证身份</h4>
                  <p className="text-sm text-gray-600">
                    我们已向 {`${currentValue}（旧）与 ${newValue}（新）`} 发送验证码
                  </p>
                  {(mockNoticeOld || mockNoticeNew) && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-2 inline-block">当前为 mock 通道（不会发真实邮件/短信）</p>
                  )}
                </div>

                {(
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">旧邮箱验证码 *</label>
                      <AppleInput type="text" value={oldCode} onChange={(e)=>setOldCode(e.target.value)} placeholder="请输入6位验证码" maxLength={6} disabled={loading} />
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">已发送至 {currentValue}</p>
                        {countdownOld > 0 ? (
                          <span className="text-xs text-gray-500">{countdownOld}s后可重新发送</span>
                        ) : (
                          <button onClick={sendOldVerificationCode} disabled={loading} className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400">重新发送</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">新邮箱验证码 *</label>
                      <AppleInput type="text" value={newCode} onChange={(e)=>setNewCode(e.target.value)} placeholder="请输入6位验证码" maxLength={6} disabled={loading} />
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">已发送至 {newValue}</p>
                        {countdownNew > 0 ? (
                          <span className="text-xs text-gray-500">{countdownNew}s后可重新发送</span>
                        ) : (
                          <button onClick={sendNewVerificationCode} disabled={loading} className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400">重新发送</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">重要提醒</p>
                      <p className="text-xs text-amber-700 mt-1">
                        申请提交后需要管理员审核，审核结果将通过站内消息通知您。修改成功后60天内不得再次申请。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <AppleButton
                    variant="secondary"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="flex-1"
                  >
                    返回
                  </AppleButton>
                  <AppleButton onClick={handleSubmit} isLoading={loading} className="flex-1">提交申请</AppleButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <BufferLogoutModal isOpen={showBuffer} reason={'account_change_submitted'} seconds={3} />
    </div>
  );
}
