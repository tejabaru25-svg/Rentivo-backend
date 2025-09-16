import express from "express";
import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendEmail } from "../utils/mailer";
import { sendSMS } from "../utils/sms";
import { authenticateToken } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Setup Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// ----------------------
// Create Payment (DB + optional Razorpay Order)
// ----------------------
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { bookingid, userid, amount, insurancefee = 0, platformfee = 0 } = req.body;

    if (!bookingid || !userid || !amount) {
      return res.status(400).json({ error: "bookingid, userid and amount are required" });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Number(amount) * 100, // paise
      currency: "INR",
      receipt: bookingid,
    });

    // Create DB record
    const payment = await prisma.payment.create({
      data: {
        bookingid,
        userid,
        amount: Number(amount),
        insurancefee: Number(insurancefee),
        platformfee: Number(platformfee),
        razorpayorderid: order.id,
        status: "PENDING",
      },
    });

    return res.json({ message: "Payment created", payment, razorpayOrder: order });
  } catch (err: any) {
    console.error("Payment create error:", err);
    return res.status(500).json({ error: "Payment failed", details: err.message });
  }
});

// ----------------------
// Confirm Payment (verify + notify)
// ----------------------
router.post("/confirm", authenticateToken, async (req, res) => {
  try {
    const { paymentId, razorpaypaymentid, razorpayorderid, signature } = req.body;

    if (!razorpayorderid || !razorpaypaymentid || !signature) {
      return res.status(400).json({ error: "razorpayorderid, razorpaypaymentid and signature are required" });
    }

    // Verify Razorpay signature
    const sign = razorpayorderid + "|" + razorpaypaymentid;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(sign.toString())
      .digest("hex");

    if (signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Update DB
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        razorpaypaymentid,
        status: "PAID",
      },
      include: { booking: { include: { item: { include: { owner: true } }, renter: true } }, user: true },
    });

    // Send notifications (safe)
    const booking = updated.booking;
    const renter = booking?.renter;
    const owner = booking?.item?.owner;
    const item = booking?.item;

    const amount = updated.amount;

    if (renter?.email) {
      try {
        await sendEmail(
          renter.email,
          "✅ Payment Received",
          `<p>Your payment of ₹${amount} for ${item?.title} has been received.</p>`
        );
      } catch {}
    }

    if (owner?.email) {
      try {
        await sendEmail(
          owner.email,
          "📢 Payment Completed",
          `<p>You received a payment of ₹${amount} for your item ${item?.title}.</p>`
        );
      } catch {}
    }

    if (renter?.phone) {
      try {
        await sendSMS(renter.phone, `✅ Payment of ₹${amount} received for booking ${booking?.id}`);
      } catch {}
    }

    if (owner?.phone) {
      try {
        await sendSMS(owner.phone, `📢 Payment of ₹${amount} completed for your item ${item?.title}`);
      } catch {}
    }

    return res.json({ success: true, message: "Payment verified & updated", payment: updated });
  } catch (err: any) {
    console.error("Payment confirm error:", err);
    return res.status(500).json({ error: "Failed to confirm payment", details: err.message });
  }
});

// ----------------------
// List Payments
// ----------------------
router.get("/", async (_req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { booking: true, user: true },
      orderBy: { createdat: "desc" },
    });
    return res.json(payments);
  } catch (err: any) {
    console.error("Payment fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch payments", details: err.message });
  }
});

export default router;
