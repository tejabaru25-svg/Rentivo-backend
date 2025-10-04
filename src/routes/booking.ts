import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendEmail } from "../utils/mailer";
import { sendSMS } from "../utils/sms";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Initialize Razorpay client safely
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

/**
 * ======================
 * BOOKING APIs
 * ======================
 */

// ✅ Create Booking
router.post("/create", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    if (!authReq.user) return res.status(401).json({ error: "Unauthorized" });

    const { itemid, renterid, startdate, enddate } = req.body;

    if (!itemid || !renterid || !startdate || !enddate) {
      return res.status(400).json({ error: "itemid, renterid, startdate, enddate are required" });
    }

    const booking = await prisma.booking.create({
      data: {
        itemid,
        renterid,
        startdate: new Date(startdate),
        enddate: new Date(enddate),
        status: "PENDING",
      },
    });

    return res.json({ message: "Booking created", booking });
  } catch (err: any) {
    console.error("Booking create error:", err);
    return res.status(500).json({ error: "Failed to create booking", details: err.message });
  }
});

// ✅ Add Availability
router.post("/items/:id/availability", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    if (!authReq.user) return res.status(401).json({ error: "Unauthorized" });

    const { startdate, enddate } = req.body;
    const availability = await prisma.availability.create({
      data: {
        itemid: req.params.id,
        startdate: new Date(startdate),
        enddate: new Date(enddate),
      },
    });

    return res.json({ message: "Availability added", availability });
  } catch (err: any) {
    console.error("Availability add error:", err);
    return res.status(400).json({ error: err.message });
  }
});

// ✅ Get Availability
router.get("/items/:id/availability", async (req: Request, res: Response) => {
  try {
    const availability = await prisma.availability.findMany({
      where: { itemid: req.params.id },
    });
    res.json(availability);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Handover Booking
router.patch("/:id/handover", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    if (!authReq.user) return res.status(401).json({ error: "Unauthorized" });

    const { handoverphoto, handovernotes } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { handoverphoto, handovernotes, status: "ONGOING" },
    });

    return res.json({ message: "Booking handover completed", booking });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Return Booking
router.patch("/:id/return", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    if (!authReq.user) return res.status(401).json({ error: "Unauthorized" });

    const { returnphoto, returnnotes } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { returnphoto, returnnotes, status: "COMPLETED" },
    });

    return res.json({ message: "Booking marked as completed", booking });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Extend Booking
router.patch("/:id/extend", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    if (!authReq.user) return res.status(401).json({ error: "Unauthorized" });

    const { extendeduntil } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { extendeduntil: new Date(extendeduntil) },
    });

    return res.json({ message: "Booking extended", booking });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ View Insurance Pool (Admin)
router.get("/admin/insurance", authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = await prisma.insurancePool.findMany();
    res.json(pool);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ======================
 * PAYMENT APIs
 * ======================
 */

// ✅ Create Payment (Razorpay + DB entry)
router.post("/pay", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    if (!authReq.user) return res.status(401).json({ error: "Unauthorized" });

    const { bookingid, userid, amount, insurancefee = 0, platformfee = 0 } = req.body;
    if (!bookingid || !userid || !amount) {
      return res.status(400).json({ error: "bookingid, userid and amount are required" });
    }

    const order = await razorpay.orders.create({
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: bookingid,
    });

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

// ✅ Confirm Payment (Verify Signature)
router.post("/pay/confirm", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    if (!authReq.user) return res.status(401).json({ error: "Unauthorized" });

    const { paymentId, razorpaypaymentid, razorpayorderid, signature } = req.body;
    if (!razorpayorderid || !razorpaypaymentid || !signature) {
      return res.status(400).json({
        error: "razorpayorderid, razorpaypaymentid and signature are required",
      });
    }

    const sign = razorpayorderid + "|" + razorpaypaymentid;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(sign.toString())
      .digest("hex");

    if (signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { razorpaypaymentid, status: "PAID" },
      include: {
        booking: { include: { item: { include: { owner: true } }, renter: true } },
        user: true,
      },
    });

    const booking = updated.booking;
    const renter = booking?.renter;
    const owner = booking?.item?.owner;
    const item = booking?.item;
    const amount = updated.amount;

    // 🔔 Send Email Notifications
    if (renter?.email)
      await sendEmail(
        renter.email,
        "✅ Payment Received",
        `<p>Your payment of ₹${amount} for ${item?.title} has been received.</p>`
      );

    if (owner?.email)
      await sendEmail(
        owner.email,
        "📢 Payment Completed",
        `<p>You received a payment of ₹${amount} for your item ${item?.title}.</p>`
      );

    // 📱 Send SMS Notifications
    if (renter?.phone)
      await sendSMS(renter.phone, `✅ Payment of ₹${amount} received for booking ${booking?.id}`);
    if (owner?.phone)
      await sendSMS(owner.phone, `📢 Payment of ₹${amount} completed for your item ${item?.title}`);

    return res.json({
      success: true,
      message: "Payment verified & updated successfully",
      payment: updated,
    });
  } catch (err: any) {
    console.error("Payment confirm error:", err);
    return res.status(500).json({ error: "Failed to confirm payment", details: err.message });
  }
});

// ✅ Get All Payments
router.get("/pay", async (_req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { booking: true, user: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(payments);
  } catch (err: any) {
    console.error("Payment fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch payments", details: err.message });
  }
});

export default router;

