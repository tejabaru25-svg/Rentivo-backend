import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

// Add a payment
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { booking_id, amount } = req.body;

    const payment = await prisma.payment.create({
      data: {
        booking_id,
        amount,
        status: "initiated",
      },
    });

    return res.json({ message: "Payment recorded", paymentId: payment.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to record payment" });
  }
});

export default router;
