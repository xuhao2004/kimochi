import nodemailer from "nodemailer";

type MailOptions = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME || "kimochi心晴";
}

async function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const authMethod = process.env.SMTP_AUTH_METHOD || undefined; // e.g. LOGIN/PLAIN
  const requireTLS = process.env.SMTP_REQUIRE_TLS ? process.env.SMTP_REQUIRE_TLS !== '0' : true; // default true per Outlook STARTTLS requirement
  const tlsMinVersion = (process.env.SMTP_TLS_MIN_VERSION || 'TLSv1.2') as
    | 'TLSv1'
    | 'TLSv1.1'
    | 'TLSv1.2'
    | 'TLSv1.3';
  const debugEnabled = process.env.SMTP_DEBUG === '1';

  if (!host || !port || !user || !pass) {
    return null;
  }

  // Build transport options shared by both password and OAuth2 auth
  const baseOptions: any = {
    host,
    port,
    secure: port === 465, // 465 = SSL
    requireTLS,
    // Tighten TLS and ensure SNI for providers like Outlook.com
    tls: {
      minVersion: tlsMinVersion,
      servername: host,
    },
    // Helpful timeouts for flaky networks
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    // Optional verbose logging for diagnostics when SMTP_DEBUG=1
    logger: debugEnabled,
    debug: debugEnabled,
  };

  return nodemailer.createTransport({
    ...baseOptions,
    auth: { user, pass },
    authMethod,
  });
}

export async function sendEmail(options: MailOptions) {
  const transporter = await getTransport();
  const from = process.env.SMTP_FROM || `${getAppName()} <no-reply@${(process.env.DOMAIN || 'example.com')}>`;

  if (!transporter) {
    // 开发/无配置环境降级到控制台输出
    console.warn("[mailer] SMTP 未配置，降级为控制台输出:", {
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
    return { mocked: true } as const;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    if (process.env.SMTP_DEBUG === '1') {
      // Log minimal delivery metadata for troubleshooting
      // Avoid logging full message contents to protect privacy
      // info.response often contains the server status line (e.g., 250 2.0.0 OK ...)
      console.log('[mailer] sendMail ok', {
        messageId: (info as any)?.messageId,
        accepted: (info as any)?.accepted,
        response: (info as any)?.response,
      });
    }
    return { mocked: false } as const;
  } catch (error) {
    // 邮件服务异常时不要中断业务流程（例如 Outlook 限流/网络问题）
    const e = error as any;
    console.error('[mailer] sendMail failed, fallback to mock:', {
      code: e?.code,
      command: e?.command,
      responseCode: e?.responseCode,
      response: e?.response,
      message: e?.message,
    });
    if (process.env.SMTP_FATAL_ON_ERROR === '1') {
      throw error;
    }
    return { mocked: true } as const;
  }
}

export function renderSimpleTemplate(title: string, contentLines: string[]) {
  const appName = getAppName();
  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; line-height: 1.6; color: #1f2937;">
    <h2 style="margin: 0 0 12px; color: #111827;">${title}</h2>
    ${contentLines.map(l => `<p style=\"margin: 0 0 8px;\">${l}</p>`).join("\n")}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;"/>
    <p style="font-size: 12px; color: #6b7280;">此邮件由 ${appName} 系统发送，请勿回复。</p>
  </div>`;
  const text = `${title}\n\n${contentLines.join("\n")}\n\n— ${appName}`;
  return { html, text };
}


