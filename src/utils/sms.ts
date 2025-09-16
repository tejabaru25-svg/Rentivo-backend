import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendSMS(to: string, body: string) {
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE, // your Twilio number (+13502383558)
    to,
  });
  console.log("✅ SMS sent:", message.sid);
  return message;
}
