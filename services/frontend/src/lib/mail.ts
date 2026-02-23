import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASSWORD ?? "";
  const secure = process.env.SMTP_SECURE === "true";

  if (!host) {
    throw new Error("SMTP_HOST is not configured. Email sending is disabled.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
  const from = process.env.SMTP_FROM ?? "noreply@prism.local";

  const transporter = getTransporter();

  await transporter.sendMail({
    from,
    to: email,
    subject: "Verify your Prism account",
    html: `
      <div style="font-family: 'Roboto', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #3c4858;">Welcome to Prism</h2>
        <p style="color: #8b9eb5; font-size: 14px;">
          Click the button below to verify your email address and activate your account.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; padding: 12px 32px; background: rgb(74,119,240); color: #fff;
                  text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; margin: 20px 0;">
          Verify Email
        </a>
        <p style="color: #8b9eb5; font-size: 12px;">
          This link expires in 24 hours. If you didn't create an account, ignore this email.
        </p>
      </div>
    `,
  });
}
