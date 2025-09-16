import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = express.Router();
const prisma = new PrismaClient();

// 🔹 Setup Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// 🔹 Create payment (DB entry)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { bookingid, userid, amount, insurancefee, platformfee } = req.body;

    const payment = await prisma.payment.create({
      data: {
        bookingid,
        userid,
        amount,
        insurancefee,
        platformfee,
        status: "PENDING",
      },
    });

    return res.json(payment);
  } catch (err: any) {
    console.error("Payment create error:", err);
    return res.status(500).json({ error: "Payment failed", details: err.message });
  }
});

// 🔹 Get all payments
router.get("/", async (_req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { booking: true, user: true },
    });
    return res.json(payments);
  } catch (err: any) {
    console.error("Payment fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch payments", details: err.message });
  }
});

// 🔹 Razorpay: Create order
router.post("/create-order", async (req: Request, res: Response) => {
  try {
    const { amount, currency, receipt } = req.body;

    const options = {
      amount: amount * 100, // Razorpay expects paise
      currency: currency || "INR",
      receipt: receipt || "receipt#1",
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Order creation failed:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// 🔹 Razorpay: Verify payment
router.post("/verify-payment", (req: Request, res: Response) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    const sign = order_id + "|" + payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(sign.toString())
      .digest("hex");

    if (signature === expectedSign) {
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Payment verification failed" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
