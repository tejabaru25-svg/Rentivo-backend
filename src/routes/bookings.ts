import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../authMiddleware";
import { sendPushNotification } from "../utils/firebase";
import { sendEmail } from "../utils/mailer";     // ✅ Email helper
import { sendSMS } from "../utils/sms";          // ✅ SMS helper

const router = express.Router();
const prisma = new PrismaClient();

// -------------------
// Create booking
// -------------------
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { itemid, startdate, enddate } = req.body;
    const renterid = (req as any).user.id; // ✅ Use logged-in user as renter

    const booking = await prisma.booking.create({
      data: {
        itemid,
        renterid,
        startdate: new Date(startdate),
        enddate: new Date(enddate),
        status: "PENDING",
      },
    });

    // Fetch item + owner for notifications
    const item = await prisma.item.findUnique({
      where: { id: itemid },
      include: { owner: true },
    });

    if (item?.owner) {
      // ✅ Push Notification
      if (item.owner.fcmtoken) {
        await sendPushNotification(
          item.owner.fcmtoken,
          "New Booking",
          `Your item "${item.title}" has been booked!`
        );
      }

      // ✅ Email Notification
      if (item.owner.email) {
        await sendEmail(
          item.owner.email,
          "New Booking Alert",
          `<p>Your item <b>${item.title}</b> has been booked by a renter.</p>`
        );
      }

      // ✅ SMS Notification
      if (item.owner.phone) {
        await sendSMS(
          item.owner.phone,
          `Your item "${item.title}" has been booked on Rentivo!`
        );
      }
    }

    return res.json(booking);
  } catch (err: any) {
    console.error("Booking create error:", err);
    return res
      .status(500)
      .json({ error: "Booking failed", details: err.message });
  }
});

// -------------------
// Get bookings for logged-in user
// -------------------
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const bookings = await prisma.booking.findMany({
      where: { renterid: userId },
      include: { item: true, renter: true },
    });

    return res.json(bookings);
  } catch (err: any) {
    console.error("Booking fetch error:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch bookings", details: err.message });
  }
});

export default router;
