import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

// Create a booking
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { listing_id, renter_id, start_date, end_date, total_price } = req.body;

    const booking = await prisma.booking.create({
      data: {
        listing_id,
        renter_id,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        total_price,
        status: "pending",
      },
    });

    return res.json({ message: "Booking created successfully", bookingId: booking.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
