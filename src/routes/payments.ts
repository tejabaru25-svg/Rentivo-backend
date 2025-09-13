import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

// Record a payment
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { bookingId, amount, status } = req.body;

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        status: status || "INITIATED", // ✅ enum uppercase
      },
    });

    return res.json({
      message: "Payment recorded successfully",
      paymentId: payment.id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to record payment" });
  }
});

export default router;
