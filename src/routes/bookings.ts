import express from "express";
import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import { sendEmail } from "../utils/mailer";
import { sendSMS } from "../utils/sms";
import { authenticateToken } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// Init Razorpay client if keys exist
let razorpayClient: Razorpay | null = null;
if (process.env.RZP_KEY_ID && process.env.RZP_KEY_SECRET) {
  razorpayClient = new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
  });
}

/**
 * Create a payment record.
 * If `createRazorpayOrder: true` is sent in body and razorpay keys are configured,
 * this route will also create a Razorpay order and return the order details to the client.
 *
 * Body example:
 * {
 *   "bookingid": "uuid",
 *   "userid": "uuid",
 *   "amount": 1000,
 *   "insurancefee": 50,
 *   "platformfee": 20,
 *   "createRazorpayOrder": true
 * }
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { bookingid, userid, amount, insurancefee = 0, platformfee = 0, createRazorpayOrder = false } = req.body;
    if (!bookingid || !userid || !amount) {
      return res.status(400).json({ error: "bookingid, userid and amount are required" });
    }

    // Optionally create Razorpay order
    let razorpayOrder: any = null;
    if (createRazorpayOrder && razorpayClient) {
      // Razorpay expects amount in paise (INR * 100)
      const rpAmount = Number(amount) * 100;
      razorpayOrder = await razorpayClient.orders.create({
        amount: rpAmount,
        currency: "INR",
        receipt: bookingid,
        payment_capture: 1, // auto-capture if you want; set 0 if you capture later
      });
    }

    const created = await prisma.payment.create({
      data: {
        bookingid,
        userid,
        amount: Number(amount),
        insurancefee: Number(insurancefee || 0),
        platformfee: Number(platformfee || 0),
        razorpayorderid: razorpayOrder ? String(razorpayOrder.id) : null,
        status: "PENDING",
      },
    });

    return res.json({
      message: "Payment record created",
      payment: created,
      razorpayOrder: razorpayOrder || null,
    });
  } catch (err: any) {
    console.error("Payment create error:", err);
    return res.status(500).json({ error: "Payment failed", details: err.message });
  }
});

/**
 * Confirm payment (called after client completes payment or from a webhook)
 * Body example:
 * {
 *   "paymentId": "payment-uuid",
 *   "razorpaypaymentid": "pay_xxx",
 *   "razorpayorderid": "order_xxx",
 *   "status": "PAID"
 * }
 *
 * This will update the payment record and notify renter & owner via Email + SMS.
 */
router.post("/confirm", authenticateToken, async (req, res) => {
  try {
    const { paymentId, razorpaypaymentid, razorpayorderid, status = "PAID" } = req.body;
    if (!paymentId && !razorpayorderid) {
      return res.status(400).json({ error: "paymentId or razorpayorderid is required" });
    }

    // Find payment either by id or by razorpayorderid
    const whereClause = paymentId ? { id: paymentId } : { razorpayorderid: razorpayorderid };
    const payment = await prisma.payment.findUnique({ where: whereClause as any, include: { booking: { include: { item: { include: { owner: true } }, renter: true } }, user: true } });

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    // Update payment with payment ids and status
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpaypaymentid: razorpaypaymentid || payment.razorpaypaymentid,
        status,
      },
      include: { booking: { include: { item: { include: { owner: true } }, renter: true } }, user: true },
    });

    // Prepare notification data
    const booking = updated.booking;
    const renter = booking?.renter ?? null;
    const owner = booking?.item?.owner ?? null;
    const item = booking?.item ?? null;

    const amount = updated.amount;
    const subjectRenter = `Payment received for your booking (${item?.title ?? "item"})`;
    const subjectOwner = `Payout/Payment received for your item (${item?.title ?? "item"})`;

    const htmlToRenter = `
      <h3>Payment Received</h3>
      <p>Hi ${renter?.name ?? "Renter"},</p>
      <p>We have received your payment of <b>₹${amount}</b> for the booking of <b>${item?.title}</b>.</p>
      <p>Booking ID: ${booking?.id}</p>
      <p>Payment ID: ${updated.razorpaypaymentid ?? updated.id}</p>
      <br/><p>Thank you for using Rentivo 🚀</p>
    `;

    const htmlToOwner = `
      <h3>Booking Payment Completed</h3>
      <p>Hi ${owner?.name ?? "Owner"},</p>
      <p>A payment of <b>₹${amount}</b> has been completed for your item <b>${item?.title}</b>.</p>
      <p>Booking ID: ${booking?.id}</p>
      <p>Payment ID: ${updated.razorpaypaymentid ?? updated.id}</p>
      <br/><p>Login to Rentivo to view details.</p>
    `;

    // Send emails (safe)
    if (renter?.email) {
      try {
        await sendEmail(renter.email, subjectRenter, htmlToRenter);
      } catch (e) {
        console.warn("⚠️ Failed to send payment email to renter:", e);
      }
    }

    if (owner?.email) {
      try {
        await sendEmail(owner.email, subjectOwner, htmlToOwner);
      } catch (e) {
        console.warn("⚠️ Failed to send payment email to owner:", e);
      }
    }

    // Send SMS (safe)
    if (renter?.phone) {
      try {
        await sendSMS(renter.phone, `✅ Payment received for booking ${booking?.id}. Amount: ₹${amount}`);
      } catch (e) {
        console.warn("⚠️ Failed to send payment SMS to renter:", e);
      }
    }

    if (owner?.phone) {
      try {
        await sendSMS(owner.phone, `📢 Payment completed for your item ${item?.title}. Booking: ${booking?.id}. Amount: ₹${amount}`);
      } catch (e) {
        console.warn("⚠️ Failed to send payment SMS to owner:", e);
      }
    }

    return res.json({ message: "Payment updated and notifications sent (best-effort).", payment: updated });
  } catch (err: any) {
    console.error("Payment confirm error:", err);
    return res.status(500).json({ error: "Failed to update payment", details: err.message });
  }
});

/**
 * List payments (admin/debug)
 */
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
