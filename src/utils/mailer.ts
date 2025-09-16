import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.sendgrid.net",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // TLS (STARTTLS)
  auth: {
    user: process.env.SMTP_USER || "apikey",
    pass: process.env.SMTP_PASS!,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  const fromAddress = process.env.EMAIL_FROM || `Rentivo <noreply@rentivo.com>`;
  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
  });
  console.log("✅ SendGrid Email sent:", info.messageId);
  return info;
}
