import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const sendSMS = async (to: string, message: string) => {
  try {
    const sms = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to,
    });
    console.log("✅ SMS sent:", sms.sid);
    return sms;
  } catch (err) {
    console.error("❌ SMS send error:", err);
    throw err;
  }
};
