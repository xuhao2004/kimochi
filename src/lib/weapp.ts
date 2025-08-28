// 简单的微信小程序 AccessToken 缓存与手机号获取工具

type AccessTokenResp = {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
};

type PhoneNumberResp = {
  errcode?: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber: string; // 完整手机号（含区号）
    purePhoneNumber: string; // 不含区号
    countryCode: string;
  };
};

let cachedToken: { token: string; expireAt: number } | null = null;

export async function getWeappAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expireAt - 120 > now) {
    return cachedToken.token;
  }

  const appId = process.env.WEAPP_APP_ID;
  const appSecret = process.env.WEAPP_APP_SECRET;
  if (!appId || !appSecret) throw new Error('未配置小程序密钥');

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const resp = await fetch(url);
  const data = (await resp.json()) as AccessTokenResp;
  if (!resp.ok || data.errcode || !data.access_token || !data.expires_in) {
    throw new Error(`获取小程序 access_token 失败: ${JSON.stringify(data)}`);
  }
  cachedToken = { token: data.access_token, expireAt: now + data.expires_in };
  return cachedToken.token;
}

export async function getPhoneNumberByCode(code: string): Promise<{ phoneNumber: string; purePhoneNumber: string; countryCode: string }>{
  const token = await getWeappAccessToken();
  const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(token)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = (await resp.json()) as PhoneNumberResp;
  if (!resp.ok || data.errcode || !data.phone_info) {
    throw new Error(`获取微信手机号失败: ${JSON.stringify(data)}`);
  }
  return {
    phoneNumber: data.phone_info.phoneNumber,
    purePhoneNumber: data.phone_info.purePhoneNumber,
    countryCode: data.phone_info.countryCode
  };
}


