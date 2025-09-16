import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(to: string, subject: string, html: string) {
  const fromAddress = process.env.EMAIL_FROM || "Rentivo <tejabaru25@gmail.com>";

  const msg = {
    to,
    from: fromAddress,
    subject,
    html,
  };

  const res = await sgMail.send(msg);
  console.log("✅ SendGrid API email sent:", res[0].statusCode);
  return res;
}
