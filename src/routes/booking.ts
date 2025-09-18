import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendEmail } from "../utils/mailer";
import { sendSMS } from "../utils/sms";
import { authenticateToken } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

/**
 * ======================
 * Booking APIs
 * ======================
 */

// POST /api/bookings/create → create a booking (non-payment)
router.post("/create", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { itemid, renterid, startdate, enddate } = req.body;

    if (!itemid || !renterid || !startdate || !enddate) {
      return res
        .status(400)
        .json({ error: "itemid, renterid, startdate, enddate are required" });
    }

    const booking = await prisma.booking.create({
      data: {
        itemid,
        renterid,
        startdate: new Date(startdate),
        enddate: new Date(enddate),
        status: "PENDING",
      },
    });

    return res.json({ message: "Booking created", booking });
  } catch (err: any) {
    console.error("Booking create error:", err);
    return res
      .status(500)
      .json({ error: "Failed to create booking", details: err.message });
  }
});

// POST /api/bookings/items/:id/availability → add availability
router.post(
  "/items/:id/availability",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { startdate, enddate } = req.body;
    try {
      const availability = await prisma.availability.create({
        data: {
          itemid: req.params.id,
          startdate: new Date(startdate),
          enddate: new Date(enddate),
        },
      });
      res.json(availability);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// GET /api/bookings/items/:id/availability → fetch availability
router.get(
  "/items/:id/availability",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const availability = await prisma.availability.findMany({
        where: { itemid: req.params.id },
      });
      res.json(availability);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// PATCH /api/bookings/:id/handover
router.patch(
  "/:id/handover",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { handoverphoto, handovernotes } = req.body;
    try {
      const booking = await prisma.booking.update({
        where: { id: req.params.id },
        data: { handoverphoto, handovernotes, status: "ONGOING" },
      });
      res.json(booking);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// PATCH /api/bookings/:id/return
router.patch(
  "/:id/return",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { returnphoto, returnnotes } = req.body;
    try {
      const booking = await prisma.booking.update({
        where: { id: req.params.id },
        data: { returnphoto, returnnotes, status: "COMPLETED" },
      });
      res.json(booking);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// PATCH /api/bookings/:id/extend
router.patch(
  "/:id/extend",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { extendeduntil } = req.body;
    try {
      const booking = await prisma.booking.update({
        where: { id: req.params.id },
        data: { extendeduntil: new Date(extendeduntil) },
      });
      res.json(booking);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// GET /api/bookings/admin/insurance
router.get(
  "/admin/insurance",
  authenticateToken,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const pool = await prisma.insurancePool.findMany();
      res.json(pool);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

/**
 * ======================
 * Payments APIs (inside bookings)
 * ======================
 */

// POST /api/bookings/pay → create Razorpay order + DB record
router.post("/pay", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { bookingid, userid, amount, insurancefee = 0, platformfee = 0 } = req.body;

    if (!bookingid || !userid || !amount) {
      return res
        .status(400)
        .json({ error: "bookingid, userid and amount are required" });
    }

    const order = await razorpay.orders.create({
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: bookingid,
    });

    const payment = await prisma.payment.create({
      data: {
        bookingid,
        userid,
        amount: Number(amount),
        insurancefee: Number(insurancefee),
        platformfee: Number(platformfee),
        razorpayorderid: order.id,
        status: "PENDING",
      },
    });

    return res.json({ message: "Payment created", payment, razorpayOrder: order });
  }
