import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

// Create a booking
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { itemId, renterId, startDate, endDate } = req.body;

    const booking = await prisma.booking.create({
      data: {
        itemId,
        renterId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "PENDING", // ✅ enum from schema
      },
    });

    return res.json({
      message: "Booking created successfully",
      bookingId: booking.id,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
