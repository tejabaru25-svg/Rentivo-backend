import express from "express";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../utils/mailer";

const router = express.Router();
const prisma = new PrismaClient();

// Create booking
router.post("/", async (req, res) => {
  try {
    const { itemid, renterid, startdate, enddate } = req.body;

    // Create booking in DB
    const booking = await prisma.booking.create({
      data: {
        itemid,
        renterid,
        startdate: new Date(startdate),
        enddate: new Date(enddate),
        status: "PENDING",
      },
      include: {
        renter: true,
        item: { include: { owner: true } },
      },
    });

    // -------------------
    // Send Email Notifications
    // -------------------
    const renterEmail = booking.renter.email;
    const ownerEmail = booking.item.owner.email;

    // Email to renter
    if (renterEmail) {
      await sendEmail(
        renterEmail,
        "📩 Rentivo Booking Confirmation",
        `
        <h2>Hi ${booking.renter.name || "User"},</h2>
        <p>Your booking for <b>${booking.item.title}</b> has been created successfully.</p>
        <p><b>Start:</b> ${booking.startdate.toDateString()}</p>
        <p><b>End:</b> ${booking.enddate.toDateString()}</p>
        <p>Status: ${booking.status}</p>
        <br/>
        <p>Thank you for using Rentivo 🚀</p>
        `
      );
    }

    // Email to item owner
    if (ownerEmail) {
      await sendEmail(
        ownerEmail,
        "📩 New Booking on Your Item - Rentivo",
        `
        <h2>Hello ${booking.item.owner.name || "Owner"},</h2>
        <p>Your item <b>${booking.item.title}</b> has been booked by ${booking.renter.name || "a user"}.</p>
        <p><b>Start:</b> ${booking.startdate.toDateString()}</p>
        <p><b>End:</b> ${booking.enddate.toDateString()}</p>
        <p>Status: ${booking.status}</p>
        <br/>
        <p>Login to Rentivo to manage your booking 🚀</p>
        `
      );
    }

    // -------------------
    // Respond with booking
    // -------------------
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
