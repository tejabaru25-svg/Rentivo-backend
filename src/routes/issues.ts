import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ======================
 * Owner: Create Issue
 * ======================
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { bookingid, description, photos } = req.body;
    const user = (req as any).user;

    if (!bookingid || !description) {
      return res.status(400).json({ error: "bookingid and description are required" });
    }

    if (user.role !== "OWNER") {
      return res.status(403).json({ error: "Only owners can raise issues" });
    }

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
        resolvedbyid: user.id,
      },
    });

    return res.json({ message: "Issue resolved", issue });
  } catch (err: any) {
    console.error("Issue resolve error:", err);
    return res.status(500).json({ error: "Failed to resolve issue", details: err.message });
  }
});

/**
 * ======================
 * Admin: List All Issues
 * ======================
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can view all issues" });
    }

    const issues = await prisma.issue.findMany({
      include: { booking: true, user: true, resolvedby: true },
      orderBy: { createdat: "desc" },
    });

    return res.json(issues);
  } catch (err: any) {
    console.error("Issue fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch issues", details: err.message });
  }
});

/**
 * ======================
 * Owner: List My Issues
 * ======================
 */
router.get("/my", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== "OWNER") {
      return res.status(403).json({ error: "Only owners can view their issues" });
    }

    const issues = await prisma.issue.findMany({
      where: { userid: user.id },
      include: { booking: true },
      orderBy: { createdat: "desc" },
    });

    return res.json(issues);
  } catch (err: any) {
    console.error("My issues fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch owner issues", details: err.message });
  }
});

export default router;
