import { NextRequest, NextResponse } from 'next/server';

function pkcs7Unpad(buffer: Buffer): Buffer {
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 32) return buffer;
  return buffer.slice(0, buffer.length - pad);
}

import crypto from 'crypto';

function decryptWeappData(sessionKey: string, encryptedData: string, iv: string): any {
  const key = Buffer.from(sessionKey, 'base64');
  const ivBuf = Buffer.from(iv, 'base64');
  const ed = Buffer.from(encryptedData, 'base64');
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, ivBuf);
  decipher.setAutoPadding(false);
  const decoded = Buffer.concat([decipher.update(ed), decipher.final()]);
  const unpadded = pkcs7Unpad(decoded);
  const json = JSON.parse(unpadded.toString('utf8'));
  return json;
}

// 旧版/兼容：使用 encryptedData+iv 解密手机号
// 入参：{ loginCode, encryptedData, iv }
export async function POST(request: NextRequest) {
  try {
    const { loginCode, encryptedData, iv } = await request.json();
    if (!loginCode || !encryptedData || !iv) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const appId = process.env.WEAPP_APP_ID;
    const appSecret = process.env.WEAPP_APP_SECRET;
    if (!appId || !appSecret) return NextResponse.json({ error: '未配置小程序密钥' }, { status: 400 });

    // 通过 jscode2session 获取 session_key
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(loginCode)}&grant_type=authorization_code`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!resp.ok || !data.session_key) {
      return NextResponse.json({ error: '获取 session_key 失败', detail: data }, { status: 400 });
    }

    // 解密
    const json = decryptWeappData(data.session_key, encryptedData, iv);
    // 可选校验 appid
    try { if (json?.watermark?.appid && appId && json.watermark.appid !== appId) { return NextResponse.json({ error: 'appid 不匹配' }, { status: 400 }); } } catch {}
    const phoneNumber: string | undefined = json?.phoneNumber || json?.purePhoneNumber;
    if (!phoneNumber) return NextResponse.json({ error: '未解析到手机号' }, { status: 400 });
    return NextResponse.json({ phoneNumber });
  } catch (e) {
    console.error('decrypt weapp phone failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


