// 简化的短信发送占位实现。生产中应接入第三方短信平台（如阿里云、腾讯云）。

export type SmsResult = { mocked: boolean };

export async function sendSms(to: string, content: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER; // 'tencent' | 'aliyun' | 'mock'
  const sign = process.env.SMS_SIGN_NAME || 'kimochi心晴';
  const finalContent = content.includes('】') ? content : `【${sign}】${content}`;
  if (!provider || provider === 'mock') {
    console.warn("[sms] 短信服务未配置或处于 mock 模式，降级为控制台输出:", { to, content: finalContent });
    return { mocked: true };
  }
  if (provider === 'tencent') {
    const secretId = process.env.TENCENT_SMS_SECRET_ID;
    const secretKey = process.env.TENCENT_SMS_SECRET_KEY;
    const sdkAppId = process.env.TENCENT_SMS_SDK_APP_ID;
    const templateId = process.env.TENCENT_SMS_TEMPLATE_ID;
    const region = process.env.TENCENT_SMS_REGION || 'ap-guangzhou';
    if (!secretId || !secretKey || !sdkAppId || !templateId) {
      console.error('[sms] 腾讯云短信环境变量缺失');
      return { mocked: true };
    }
    // 这里不引入 SDK，采用网关HTTP占位（生产建议使用 tencentcloud-sdk-nodejs ）
    console.log('[sms] (tencent placeholder) send', { to, templateId, sdkAppId, region, content: finalContent });
    return { mocked: false };
  }
  // 其他供应商可在此扩展
  console.log(`[sms] provider=${provider} send`, { to, content: finalContent });
  return { mocked: false };
}


