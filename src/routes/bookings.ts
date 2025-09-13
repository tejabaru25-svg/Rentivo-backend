import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

// Create a booking
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { listingId, renterId, startDate, endDate, totalPrice } = req.body;

    const booking = await prisma.booking.create({
      data: {
        listingId,
        renterId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalPrice,
        status: "PENDING", // ✅ enum uppercase
      },
    });

    return res.json({
      message: "Booking created successfully",
      bookingId: booking.id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
