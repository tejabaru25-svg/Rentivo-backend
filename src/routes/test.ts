import express from "express";
import { sendEmail } from "../utils/mailer";
import { sendSMS } from "../utils/sms";

const router = express.Router();

/**
 * Test Email Route
 * Opens in browser: /api/test/email
 */
router.get("/email", async (req, res) => {
  try {
    await sendEmail(
      process.env.SMTP_USER!, // ✅ your Gmail account from env
      "Test Email from Rentivo",
      "<p>✅ This is a test email sent from Rentivo backend 🚀</p>"
    );
    return res.json({ success: true, message: "Test email sent!" });
  } catch (err: any) {
    console.error("Email test error:", err);
    return res.status(500).json({ error: "Email failed", details: err.message });
  }
});

/**
 * Test SMS Route
 * Opens in browser: /api/test/sms
 */
router.get("/sms", async (req, res) => {
  try {
    await sendSMS(
      "+919502902546", // ✅ recipient: your verified personal number
      "✅ Test SMS from Rentivo backend 🚀"
    );
    return res.json({ success: true, message: "Test SMS sent!" });
  } catch (err: any) {
    console.error("SMS test error:", err);
    return res.status(500).json({ error: "SMS failed", details: err.message });
  }
});

export default router;
