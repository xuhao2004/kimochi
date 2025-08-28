import crypto from 'crypto';

const AMAP_BASE_URL = 'https://restapi.amap.com';

function getAmapKeys() {
  const apiKey = process.env.AMAP_API_KEY || '';
  const secretKey = process.env.AMAP_SECRET_KEY || '';
  return { apiKey, secretKey };
}

function generateSignature(params: Record<string, string>, secretKey: string): string {
  const sortedKeys = Object.keys(params).sort();
  const sortedParams = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');
  const signString = sortedParams + secretKey;
  return crypto.createHash('md5').update(signString).digest('hex');
}

export async function fetchAmap(endpoint: string, params: Record<string, string>) {
  const { apiKey, secretKey } = getAmapKeys();
  if (!apiKey) {
    return { status: 'error', data: {}, info: '未配置高德地图密钥' };
  }

  const baseParams: Record<string, string> = { key: apiKey, ...params };
  if (secretKey) {
    baseParams.sig = generateSignature(baseParams, secretKey);
  }

  const search = new URLSearchParams(baseParams);
  const url = `${AMAP_BASE_URL}${endpoint}?${search.toString()}`;

  try {
    const resp = await fetch(url);
    const json = await resp.json();
    if (json && json.status === '1') {
      return { status: 'success', data: json };
    }
    return { status: 'error', data: json, info: json?.info || '请求失败' };
  } catch (error) {
    return { status: 'error', data: {}, info: '网络请求失败' };
  }
}


