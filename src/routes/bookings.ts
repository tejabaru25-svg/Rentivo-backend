import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Create booking
router.post("/", async (req, res) => {
  try {
    const { itemid, renterid, startdate, enddate } = req.body;

    const booking = await prisma.booking.create({
      data: {
        itemid,
        renterid,
        startdate: new Date(startdate),
        enddate: new Date(enddate),
        status: "PENDING",
      },
    });

    return res.json(booking);
  } catch (err: any) {
    console.error("Booking create error:", err);
    return res.status(500).json({ error: "Booking failed", details: err.message });
  }
});

// Get all bookings
router.get("/", async (_req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { item: true, renter: true },
    });
    return res.json(bookings);
  } catch (err: any) {
    console.error("Booking fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch bookings", details: err.message });
  }
});

export default router;
