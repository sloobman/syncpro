import nodemailer from "nodemailer";

interface EmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return "https://mihleev.ru";
  }
  return "http://localhost:3000";
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  return null;
}

export async function sendVerificationEmail(params: {
  to: string;
  name?: string;
  token: string;
  otpCode: string;
}): Promise<EmailResult> {
  const { to, name = "Пользователь", token, otpCode } = params;
  const baseUrl = getAppBaseUrl();
  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const verifyPageLink = `${baseUrl}/auth/verify-email?email=${encodeURIComponent(to)}&token=${encodeURIComponent(token)}`;

  const subject = "Подтверждение регистрации в SyncPro";
  const from = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"SyncPro" <${process.env.SMTP_USER}>` : `"SyncPro" <noreply@syncpro.dev>`);

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Подтверждение email - SyncPro</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 36px 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #38bdf8;">
                Sync<span style="color: #60a5fa;">Pro</span>
              </div>
              <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
                Система совместного редактирования документов
              </div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #f8fafc; text-align: center;">
                Добро пожаловать, ${name}!
              </h1>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="font-size: 15px; line-height: 1.6; color: #cbd5e1; text-align: center; padding-bottom: 24px;">
              Спасибо за регистрацию в SyncPro. Для подтверждения адреса электронной почты введите одноразовый код или нажмите на кнопку ниже:
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <div style="background-color: #0f172a; border: 1px solid #475569; border-radius: 8px; padding: 14px 28px; display: inline-block;">
                <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Код подтверждения</div>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #38bdf8; font-family: 'Courier New', Courier, monospace;">
                  ${otpCode}
                </div>
              </div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Действителен в течение 30 минут</div>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${verifyLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                Подтвердить email в один клик
              </a>
            </td>
          </tr>

          <!-- Fallback Link -->
          <tr>
            <td style="border-top: 1px solid #334155; padding-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5; word-break: break-all;">
              Если кнопка не работает, откройте страницу подтверждения:
              <br>
              <a href="${verifyPageLink}" style="color: #38bdf8; text-decoration: underline;">
                ${verifyPageLink}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center; font-size: 12px; color: #64748b;">
              Если вы не регистрировались в сервисе SyncPro, просто проигнорируйте это письмо.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Добро пожаловать в SyncPro, ${name}!

Ваш одноразовый код подтверждения: ${otpCode} (действителен 30 минут).

Либо подтвердите адрес по ссылке:
${verifyLink}

Если вы не регистрировались в SyncPro, проигнорируйте это сообщение.
  `.trim();

  const transporter = getTransporter();

  if (!transporter) {
    console.log("================== [SIMULATED EMAIL DISPATCH] ==================");
    console.log(`[SMTP Notice]: No SMTP credentials configured. Simulating email.`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`Verification Link: ${verifyLink}`);
    console.log("===============================================================");
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("[SMTP Error sendVerificationEmail]:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string;
  resetToken: string;
}): Promise<EmailResult> {
  const { to, name = "Пользователь", resetToken } = params;
  const baseUrl = getAppBaseUrl();
  const resetLink = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

  const subject = "Сброс пароля в SyncPro";
  const from = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"SyncPro" <${process.env.SMTP_USER}>` : `"SyncPro" <noreply@syncpro.dev>`);

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Сброс пароля - SyncPro</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 36px 32px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="font-size: 26px; font-weight: 800; color: #38bdf8;">Sync<span style="color: #60a5fa;">Pro</span></div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #f8fafc; text-align: center;">
                Запрос на сброс пароля
              </h1>
            </td>
          </tr>
          <tr>
            <td style="font-size: 15px; line-height: 1.6; color: #cbd5e1; text-align: center; padding-bottom: 24px;">
              Здравствуйте, ${name}! Мы получили запрос на изменение пароля для вашей учетной записи.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block;">
                Установить новый пароль
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #334155; padding-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5; word-break: break-all;">
              Ссылка действительна в течение 24 часов:
              <br>
              <a href="${resetLink}" style="color: #38bdf8; text-decoration: underline;">
                ${resetLink}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 24px; text-align: center; font-size: 12px; color: #64748b;">
              Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Здравствуйте, ${name}!

Для сброса пароля вашей учетной записи SyncPro перейдите по ссылке:
${resetLink}

Ссылка действительна в течение 24 часов. Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
  `.trim();

  const transporter = getTransporter();

  if (!transporter) {
    console.log("================== [SIMULATED EMAIL DISPATCH] ==================");
    console.log(`[SMTP Notice]: Simulating password reset email.`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log("===============================================================");
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("[SMTP Error sendPasswordResetEmail]:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
