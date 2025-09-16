import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Create payment
router.post("/", async (req, res) => {
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

// Get all payments
router.get("/", async (_req, res) => {
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

export default router;
