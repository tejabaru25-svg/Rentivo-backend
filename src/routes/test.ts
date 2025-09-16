import express from "express";
import { sendEmail } from "../utils/mailer";
import { sendSMS } from "../utils/sms";

const router = express.Router();

// Test Email
router.get("/email", async (req, res) => {
  try {
    await sendEmail(
      process.env.SMTP_USER!, // send to your own Gmail
      "Test Email from Rentivo",
      "<p>✅ This is a test email sent from Rentivo backend 🚀</p>"
    );
    return res.json({ success: true, message: "Test email sent!" });
  } catch (err: any) {
    return res.status(500).json({ error: "Email failed", details: err.message });
  }
});

// Test SMS
router.get("/sms", async (req, res) => {
  try {
    await sendSMS(
      "+91YOUR_NUMBER", // replace with your verified mobile number
      "✅ Test SMS from Rentivo backend 🚀"
    );
    return res.json({ success: true, message: "Test SMS sent!" });
  } catch (err: any) {
    return res.status(500).json({ error: "SMS failed", details: err.message });
  }
});

export default router;
