// utils/http.js
import { loginWeapp } from './auth';

// 动态 API Base
// 优先使用本地覆盖；默认在真机/体验/上线环境只允许 HTTPS 生产域名；
// 仅在开发者工具（develop）允许尝试 127.0.0.1 回落，避免真机报“url not in domain list”。
// 如需在真机直连本地局域网 HTTP，请手动设置：
// wx.setStorageSync('DEV_ALLOW_HTTP_OVERRIDE', true)
// wx.setStorageSync('API_BASE', 'http://192.168.x.x:3001')

function isPrivateLanHttpUrl(url){
  try {
    return /^http:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?(\/|$)/i.test(url);
  } catch {
    return false;
  }
}
function getApiBaseCandidates(){
  const manual = wx.getStorageSync('API_BASE');
  const allowHttpOverride = !!wx.getStorageSync('DEV_ALLOW_HTTP_OVERRIDE');
  let isDevtools = false;
  try { isDevtools = (wx.getSystemInfoSync().platform === 'devtools'); } catch {}
  const arr = [ 'https://app.kimochi.space' ];
  // 真机（开发版/体验版/正式版）一律不使用 127.0.0.1，避免“url not in domain list”
  // 仅在开发者工具中允许：本地覆盖与本地端口
  if (isDevtools) {
    if (manual) arr.unshift(manual);
    arr.push('http://127.0.0.1:3001', 'http://127.0.0.1:3000');
  } else if (manual) {
    // 非 devtools：默认只允许 HTTPS 覆盖；若显式允许，则放行局域网 HTTP 覆盖
    if (/^https:\/\//i.test(manual)) {
      arr.unshift(manual);
    } else if (allowHttpOverride && isPrivateLanHttpUrl(manual)) {
      arr.unshift(manual);
    }
  }
  return Array.from(new Set(arr.filter(Boolean)));
}

// 选择首选 API Base（与 http() 的候选一致）
export function getResolvedApiBase(){
  try{
    const bases = getApiBaseCandidates();
    if (bases && bases.length > 0) return bases[0];
  }catch{}
  return 'https://app.kimochi.space';
}

function requestWithBase(base, path, { method, data, token }){
  return new Promise((resolve, reject) => {
    wx.request({
      url: base.replace(/\/$/, '') + path,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: resolve,
      fail: reject
    });
  });
}

function shouldAutoLoginOn401(){
  try{ return !!wx.getStorageSync('AUTO_LOGIN_ON_401'); }catch{ return false; }
}

export async function http(path, { method='GET', data } = {}, retry = true) {
  const token = wx.getStorageSync('token');
  const bases = getApiBaseCandidates();
  let isDevtools = false;
  try { isDevtools = (wx.getSystemInfoSync().platform === 'devtools'); } catch {}
  let lastErr = null;
  for (let i = 0; i < bases.length; i++) {
    try {
      const res = await requestWithBase(bases[i], path, { method, data, token });
      // 401 未授权 或 404 用户不存在：触发一次自动登录并重试
      const userNotFound = res.statusCode === 404 && res?.data && typeof res.data === 'object' && /用户不存在|user not found|not found/i.test(res.data.error || '');
      if ((res.statusCode === 401 || userNotFound) && retry && shouldAutoLoginOn401()) {
        await loginWeapp('小程序用户');
        return http(path, { method, data }, false);
      }
      // 非 2xx：在开发态尝试候选；在真机/体验/线上不跨域名回落，避免触发“url not in domain list”。
      if (res.statusCode < 200 || res.statusCode >= 300) {
        lastErr = res;
        if (isDevtools && i < bases.length - 1) continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (!isDevtools || i === bases.length - 1) throw e;
    }
  }
  if (lastErr) throw lastErr;
}