// src/routes/bookings.ts
import express, { Response } from "express";
import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendEmail } from "../utils/mailer";
import { sendSMS } from "../utils/sms";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Setup Razorpay client safely (guard if env missing)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay: Razorpay | null = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn("⚠️ Razorpay keys not set. Payments requiring Razorpay will fail.");
}

/**
 * ----------------------
 * Create Payment (DB + optional Razorpay Order)
 * POST /api/bookings/pay or POST /api/payments
 * ----------------------
 */
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { bookingid, userid, amount, insurancefee = 0, platformfee = 0 } = req.body;

    if (!bookingid || !userid || amount === undefined) {
      return res
        .status(400)
        .json({ error: "bookingid, userid and amount are required" });
    }

    // Validate booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingid },
      include: { item: { include: { owner: true } }, renter: true },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Create Razorpay order only if razorpay configured
    let order: any = null;
    if (razorpay) {
      order = await razorpay.orders.create({
        amount: Math.round(Number(amount) * 100), // paise
        currency: "INR",
        receipt: bookingid.toString(),
      });
    }

    const payment = await prisma.payment.create({
      data: {
        bookingid,
        userid,
        amount: Math.round(Number(amount)),
        insurancefee: Math.round(Number(insurancefee || 0)),
        platformfee: Math.round(Number(platformfee || 0)),
        razorpayorderid: order?.id ?? null,
        status: "PENDING",
      },
    });

    return res.json({ message: "Payment created", payment, razorpayOrder: order });
  } catch (err: any) {
    console.error("Payment create error:", err);
    return res.status(500).json({ error: "Payment failed", details: err?.message || err });
  }
});

/**
 * ----------------------
 * Confirm Payment (verify + notify)
 * POST /api/bookings/pay/confirm
 * Body: { paymentId, razorpaypaymentid, razorpayorderid, signature }
 * ----------------------
 */
router.post("/confirm", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { paymentId, razorpaypaymentid, razorpayorderid, signature } = req.body;

    if (!paymentId || !razorpayorderid || !razorpaypaymentid || !signature) {
      return res.status(400).json({
        error: "paymentId, razorpayorderid, razorpaypaymentid and signature are required",
      });
    }

    if (!RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: "Razorpay not configured on server" });
    }

    // Verify signature
    const sign = `${razorpayorderid}|${razorpaypaymentid}`;
    const expectedSign = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Ensure payment record exists
    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: { include: { item: { include: { owner: true } }, renter: true } },
        user: true,
      },
    });
    if (!existing) return res.status(404).json({ error: "Payment record not found" });

    // Update DB
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { razorpaypaymentid, status: "PAID" },
      include: {
        booking: { include: { item: { include: { owner: true } }, renter: true } },
        user: true,
      },
    });

    // Notify renter & owner (best-effort)
    const booking = updated.booking;
    const renter = booking?.renter;
    const owner = booking?.item?.owner;
    const item = booking?.item;
    const amount = updated.amount;

    try {
      if (renter?.email) {
        await sendEmail(
          renter.email,
          "✅ Payment Received",
          `<p>Your payment of ₹${amount} for ${item?.title} has been received.</p>`
        );
      }
    } catch (e) {
      console.error("Email to renter failed:", e);
    }

    try {
      if (owner?.email) {
        await sendEmail(
          owner.email,
          "📢 Payment Completed",
          `<p>You received a payment of ₹${amount} for your item ${item?.title}.</p>`
        );
      }
    } catch (e) {
      console.error("Email to owner failed:", e);
    }

    try {
      if (renter?.phone) {
        await sendSMS(renter.phone, `✅ Payment of ₹${amount} received for booking ${booking?.id}`);
      }
    } catch (e) {
      console.error("SMS to renter failed:", e);
    }

    try {
      if (owner?.phone) {
        await sendSMS(owner.phone, `📢 Payment of ₹${amount} completed for your item ${item?.title}`);
      }
    } catch (e) {
      console.error("SMS to owner failed:", e);
    }

    return res.json({
      success: true,
      message: "Payment verified & updated",
      payment: updated,
    });
  } catch (err: any) {
    console.error("Payment confirm error:", err);
    return res.status(500).json({ error: "Failed to confirm payment", details: err?.message || err });
  }
});

/**
 * ----------------------
 * List Payments
 * GET /api/bookings/pay or /api/payments
 * ----------------------
 */
router.get("/", async (_req, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { booking: true, user: true },
      orderBy: { createdAt: "desc" }, // ✅ FIXED camelCase
    });
    return res.json(payments);
  } catch (err: any) {
    console.error("Payment fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch payments", details: err?.message || err });
  }
});

export default router;
