import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // ✅ use SSL for port 465
  auth: {
    user: process.env.SMTP_USER, // ✅ your Gmail
    pass: process.env.SMTP_PASS, // ✅ your App Password
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: `"Rentivo" <${process.env.SMTP_USER}>`, // ✅ your Gmail as sender
    to,
    subject,
    html,
  });
}
