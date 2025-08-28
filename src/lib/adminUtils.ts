/**
 * 管理员相关工具函数
 */

/**
 * 检测是否为默认管理员邮箱
 * 支持多个默认管理员邮箱格式
 */
export function isDefaultAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase().trim();
  const defaultAdminEmails = [
    'admin@kimochi.space'
  ];
  
  return defaultAdminEmails.includes(normalizedEmail);
}

/**
 * 检测超级管理员是否应该豁免旧邮箱验证
 * 条件：
 * 1. 是超级管理员
 * 2. 当前密保邮箱是默认管理员邮箱 或 是手机号账户 或 没有设置密保邮箱
 */
export function shouldExemptOldEmailVerification(
  isSuperAdmin: boolean,
  securityEmail: string | null | undefined,
  phone: string | null | undefined,
  email: string | null | undefined
): boolean {
  if (!isSuperAdmin) return false;

  // 如果没有设置密保邮箱，超级管理员应该豁免旧邮箱验证
  if (!securityEmail) return true;

  // 检查是否为默认管理员邮箱
  const isDefaultAdmin = isDefaultAdminEmail(securityEmail);

  // 检查是否为手机号账户（有手机号但没有有效邮箱）
  const isPhoneAccount = !!phone && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  return isDefaultAdmin || isPhoneAccount;
}
