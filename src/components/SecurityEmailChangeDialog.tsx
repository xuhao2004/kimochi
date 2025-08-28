"use client";

import React, { useEffect, useState } from 'react';
import BufferLogoutModal from './BufferLogoutModal';
import AppleButton from './AppleButton';
import AppleInput from './AppleInput';
import { shouldExemptOldEmailVerification } from '@/lib/adminUtils';

interface SecurityEmailChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail?: string | null;
  onSuccess?: (msg?: string) => void;
}

export default function SecurityEmailChangeDialog({ isOpen, onClose, currentEmail, onSuccess }: SecurityEmailChangeDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [ownerPhoneCode, setOwnerPhoneCode] = useState('');
  const [oldUnavailable, setOldUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdownOld, setCountdownOld] = useState(0);
  const [countdownNew, setCountdownNew] = useState(0);
  const [countdownPhone, setCountdownPhone] = useState(0);
  const [mockNoticeOld, setMockNoticeOld] = useState(false);
  const [mockNoticeNew, setMockNoticeNew] = useState(false);
  const [selfSecurityEmail, setSelfSecurityEmail] = useState<string | null | undefined>(currentEmail);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [selfEmail, setSelfEmail] = useState<string | null>(null);
  const [selfPhone, setSelfPhone] = useState<string | null>(null);
  const [createdByType, setCreatedByType] = useState<string | null>(null);
  const [syncAccount, setSyncAccount] = useState<boolean>(false);
  const [replaceLoginAccount, setReplaceLoginAccount] = useState<boolean>(false);
  const [showBuffer, setShowBuffer] = useState(false);
  const [bufferReason, setBufferReason] = useState<'security_email_request_submitted' | 'security_email_updated' | 'generic'>('generic');
  const disableVerification = process.env.NEXT_PUBLIC_DISABLE_VERIFICATION_CODE === '1';
  const enableOwnerPhoneVerify = false; // 已下线短信功能
  const enableSmsVerification = false; // 已下线短信功能

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNewEmail('');
      setOldCode('');
      setNewCode('');
      setOwnerPhoneCode('');
      setOldUnavailable(false);
      setError('');
      setCountdownOld(0);
      setCountdownNew(0);
      setCountdownPhone(0);
      setMockNoticeOld(false);
      setMockNoticeNew(false);
      setSelfSecurityEmail(currentEmail);
      setIsSuperAdmin(false);
      setSelfEmail(null);
      setSelfPhone(null);
      setReplaceLoginAccount(false);
    }
  }, [isOpen]);

  // 若未传入 currentEmail，则在打开时查询一次个人资料，获取 securityEmail
  useEffect(() => {
    const run = async () => {
      if (!isOpen) return;
      // 即便传入 currentEmail 也拉取一次，确保同步拿到 isSuperAdmin/selfEmail/selfPhone/createdByType
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) {
          if (typeof currentEmail === 'undefined') {
            setSelfSecurityEmail(data.user?.securityEmail || null);
          }
          setIsSuperAdmin(Boolean(data.user?.isSuperAdmin));
          setSelfEmail(data.user?.email || null);
          setSelfPhone(data.user?.phone || null);
          setCreatedByType(data.user?.createdByType || null);
        }
      } catch {}
    };
    run();
  }, [isOpen, currentEmail]);

  useEffect(() => {
    if (countdownOld > 0) {
      const t = setTimeout(() => setCountdownOld(countdownOld - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdownOld]);
  useEffect(() => {
    if (countdownNew > 0) {
      const t = setTimeout(() => setCountdownNew(countdownNew - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdownNew]);

  useEffect(() => {
    if (countdownPhone > 0) {
      const t = setTimeout(() => setCountdownPhone(countdownPhone - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdownPhone]);

  const sendOldCode = async () => {
    const oldEmail = selfSecurityEmail;
    if (!oldEmail) return; // 未设置旧邮箱时跳过
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/security-email/change/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ target: 'old', oldUnavailable })
      });
      const data = await res.json();
      if (!res.ok) {
        // 旧邮箱不存在等情况直接提示但不阻塞
        setError(data.error || '发送旧邮箱验证码失败');
        return false;
      }
      setCountdownOld(60);
      const isDevHost = typeof window !== 'undefined' && (window.location.host.includes('dev.kimochi.space') || window.location.hostname.startsWith('localhost') || window.location.hostname.startsWith('127.0.0.1'));
      setMockNoticeOld(Boolean(isDevHost && data && data.mocked));
      return true;
    } catch (e) {
      setError('发送旧邮箱验证码失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendNewCode = async () => {
    if (!newEmail) { setError('请先填写新的密保邮箱'); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) { setError('请输入有效的邮箱地址'); return false; }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/security-email/change/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ target: 'new', newEmail })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '发送新邮箱验证码失败'); return false; }
      setCountdownNew(60);
      const isDevHost = typeof window !== 'undefined' && (window.location.host.includes('dev.kimochi.space') || window.location.hostname.startsWith('localhost') || window.location.hostname.startsWith('127.0.0.1'));
      setMockNoticeNew(Boolean(isDevHost && data && data.mocked));
      return true;
    } catch (e) {
      setError('发送新邮箱验证码失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const startVerification = async () => {
    if (disableVerification) { setError('验证码功能已停用'); return; }
    setError('');
    // 若选择替换为邮箱账号，但短信校验未启用，则阻止
    if (replaceLoginAccount) { setError('手机号替换为邮箱的短信校验已下线'); return; }
    const okNew = await sendNewCode();
    if (!okNew) return;
    // 使用统一的豁免逻辑函数
    const exemptOld = shouldExemptOldEmailVerification(isSuperAdmin, selfSecurityEmail, selfPhone, selfEmail);
    if (!exemptOld && selfSecurityEmail && !oldUnavailable) {
      await sendOldCode();
    }
    // 替换为邮箱账号时，发送旧手机号验证码（需开短信校验）
    // 短信校验相关已下线
    setStep(2);
  };

  const handleSubmit = async () => {
    if (disableVerification) { setError('验证码功能已停用'); return; }
    const exemptOld = shouldExemptOldEmailVerification(isSuperAdmin, selfSecurityEmail, selfPhone, selfEmail);
    if (!newEmail) { setError('请填写新的密保邮箱'); return; }
    if (!exemptOld && !oldUnavailable && !oldCode) { setError('请填写旧邮箱验证码'); return; }
    if (!newCode) { setError('请填写新邮箱验证码'); return; }
    if (replaceLoginAccount) { setError('手机号替换为邮箱的短信校验已下线'); return; }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/security-email/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ newEmail, oldCode: (exemptOld || oldUnavailable) ? undefined : oldCode, newCode, oldUnavailable, syncAccount, replaceLoginAccount: replaceLoginAccount && createdByType === 'phone_register', ownerPhoneCode: replaceLoginAccount ? ownerPhoneCode : undefined })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '更新失败'); return; }
      onSuccess?.(data.message);
      // 强制登出：显示缓冲弹窗，倒计时结束后自动退出
      if (data.forceLogout) {
        const reason = data.requestId ? 'security_email_request_submitted' : 'security_email_updated';
        setBufferReason(reason);
        setShowBuffer(true);
        return;
      }
      onClose();
    } catch (e) {
      setError('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const sendOwnerPhoneCode = async () => { setError('短信功能已下线'); return false; };

  // 替换为邮箱账号：发送旧手机号验证码（使用账号变更验证码通道）
  const sendReplacementPhoneCode = async () => { setError('短信功能已下线'); return false; };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg md:max-w-xl mx-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden" style={{ animation: 'dialogBounceIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 md:px-8 py-4 md:py-5 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">修改密保邮箱（账号）</h3>
                <p className="text-sm text-gray-600 mt-1">当前：{selfSecurityEmail || '未设置'}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="p-6 md:p-8">
            {disableVerification ? (
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">验证码功能已停用，目前不可修改密保邮箱。</div>
                <div className="flex space-x-3 pt-2"><AppleButton variant="secondary" onClick={onClose} className="flex-1">关闭</AppleButton></div>
              </div>
            ) : step === 1 ? (
              <div className="space-y-4">
                {process.env.NEXT_PUBLIC_ENABLE_OLD_EMAIL_UNAVAILABLE === '1' && selfSecurityEmail && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="text-xs text-amber-800">
                      <p className="font-medium">原邮箱已停用</p>
                      <p>勾选后不会给原邮箱发送任何邮件，仅校验新邮箱验证码{isSuperAdmin ? '（超管无需审批）' : '，提交后需要管理员审批'}</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={oldUnavailable} onChange={(e)=>setOldUnavailable(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute relative after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                )}
                {/* 手机注册用户：可选择将手机号登录账号替换为新邮箱（需短信校验，默认关闭）*/}
                {(false) && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="text-xs text-blue-800">
                      <p className="font-medium">将手机号登录账号替换为新邮箱</p>
                      <p>{enableSmsVerification ? '需同时校验原手机号与新邮箱验证码，提交后需超级管理员审批，可24小时内撤销' : '该操作涉及短信校验，当前正在开发中，暂不可用'}</p>
                    </div>
                    <label className={`inline-flex items-center ${enableSmsVerification ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                      <input type="checkbox" className="sr-only peer" checked={replaceLoginAccount} onChange={(e)=>enableSmsVerification && setReplaceLoginAccount(e.target.checked)} disabled={!enableSmsVerification} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute relative after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">新的密保邮箱 *</label>
                  <AppleInput type="email" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} placeholder="请输入新的密保邮箱" disabled={loading} />
                </div>
                {error && (<div className="p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm text-red-600">{error}</p></div>)}
                <div className="flex space-x-3 pt-2">
                  <AppleButton variant="secondary" onClick={onClose} disabled={loading} className="flex-1">取消</AppleButton>
                  <AppleButton onClick={startVerification} isLoading={loading} className="flex-1">获取验证码</AppleButton>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">验证身份</h4>
                  {(mockNoticeOld || mockNoticeNew) && (<p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 inline-block">当前为 mock 通道（不会发真实邮件）</p>)}
                </div>
                {/* 同步修改登录账号（仅邮箱账号或超管可见） */}
                {((createdByType === 'email_register') || isSuperAdmin) && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="text-xs text-blue-800">
                      <p className="font-medium">同步修改登录账号</p>
                      <p>将登录邮箱同步更新为新的密保邮箱</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={syncAccount} onChange={(e)=>setSyncAccount(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute relative after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                )}
                {/* 原邮箱已停用开关已前置到第1步，避免无效邮件发送 */}
                {/* 旧邮箱验证码：当不满足免验（见上）且未声明停用时显示 */}
                {selfSecurityEmail && !shouldExemptOldEmailVerification(isSuperAdmin, selfSecurityEmail, selfPhone, selfEmail) && !oldUnavailable && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">旧邮箱验证码 *</label>
                    <AppleInput value={oldCode} onChange={(e)=>setOldCode(e.target.value)} placeholder="请输入6位验证码" maxLength={6} disabled={loading} />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">已发送至 {selfSecurityEmail}</p>
                      {countdownOld>0 ? (<span className="text-xs text-gray-500">{countdownOld}s后可重新发送</span>) : (<button onClick={sendOldCode} disabled={loading} className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400">重新发送</button>)}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">新邮箱验证码 *</label>
                  <AppleInput value={newCode} onChange={(e)=>setNewCode(e.target.value)} placeholder="请输入6位验证码" maxLength={6} disabled={loading} />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">已发送至 {newEmail}</p>
                    {countdownNew>0 ? (<span className="text-xs text-gray-500">{countdownNew}s后可重新发送</span>) : (<button onClick={sendNewCode} disabled={loading} className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400">重新发送</button>)}
                  </div>
                </div>
                {/* 替换登录账号：手机验证码（短信校验开启时显示） */}
                {false && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">手机验证码 *</label>
                    <AppleInput value={ownerPhoneCode} onChange={(e)=>setOwnerPhoneCode(e.target.value)} placeholder="请输入6位验证码" maxLength={6} disabled={loading} />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">已发送至 {selfPhone}</p>
                      {countdownPhone>0 ? (<span className="text-xs text-gray-500">{countdownPhone}s后可重新发送</span>) : (<button onClick={sendReplacementPhoneCode} disabled={loading} className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400">重新发送</button>)}
                    </div>
                  </div>
                )}
                {/* 超管手机号账号附加校验（原有功能，保留在短信校验开关控制下） */}
                {false && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">手机验证码 *</label>
                    <AppleInput value={ownerPhoneCode} onChange={(e)=>setOwnerPhoneCode(e.target.value)} placeholder="请输入6位验证码" maxLength={6} disabled={loading} />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">已发送至 {selfPhone}</p>
                      {countdownPhone>0 ? (<span className="text-xs text-gray-500">{countdownPhone}s后可重新发送</span>) : (<button onClick={sendOwnerPhoneCode} disabled={loading} className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400">重新发送</button>)}
                    </div>
                  </div>
                )}
                {error && (<div className="p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm text-red-600">{error}</p></div>)}
                <div className="flex space-x-3 pt-2">
                  <AppleButton variant="secondary" onClick={()=>setStep(1)} disabled={loading} className="flex-1">返回</AppleButton>
                  <AppleButton onClick={handleSubmit} isLoading={loading} className="flex-1">提交</AppleButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <BufferLogoutModal isOpen={showBuffer} reason={bufferReason} seconds={3} />
    </div>
  );
}


