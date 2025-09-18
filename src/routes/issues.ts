import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ======================
 * Owner: Create Issue
 * ======================
 * - Only OWNER can raise an issue
 * - Can only be raised after booking is COMPLETED
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { bookingid, description, photos } = req.body;
    const user = (req as any).user;

    if (!bookingid || !description) {
      return res.status(400).json({ error: "bookingid and description are required" });
    }

    // Ensure only OWNER can raise
    if (user.role !== "OWNER") {
      return res.status(403).json({ error: "Only owners can raise issues" });
    }

    // Check booking exists & is completed
    const booking = await prisma.booking.findUnique({
      where: { id: bookingid },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (booking.status !== "COMPLETED") {
      return res.status(400).json({ error: "Issue can only be raised after booking is COMPLETED" });
    }

    const issue = await prisma.issue.create({
      data: {
        bookingid,
        userid: user.id,
        description,
        photos: photos || [],
        status: "OPEN",
      },
    });

    return res.json({ message: "Issue created successfully", issue });
  } catch (err: any) {
    console.error("Issue create error:", err);
    return res.status(500).json({ error: "Issue creation failed", details: err.message });
  }
});

/**
 * ======================
 * Admin: Resolve Issue
 * ======================
 * - Only ADMIN can resolve
 * - Updates status and resolution note
 */
router.patch("/:id/resolve", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, resolutionnote } = req.body;
    const user = (req as any).user;

    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can resolve issues" });
    }

    if (!["APPROVED", "REJECTED", "RESOLVED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const issue = await prisma.issue.update({
      where: { id: req.params.id },
      data: {
        status,
        resolutionnote,
        resolvedbyid: user.
