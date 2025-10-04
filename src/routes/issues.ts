import express, { Request, Response } from "express";
import { PrismaClient, InsurancePool } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";
import { sendEmail } from "../utils/mailer";
import { sendSMS } from "../utils/sms";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ======================
 * Owner: Create Issue
 * ======================
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { bookingid, description, photos } = req.body;
    const user = authReq.user;

    if (!bookingid || !description) {
      return res.status(400).json({ error: "bookingid and description are required" });
    }
    if (user?.role !== "OWNER") {
      return res.status(403).json({ error: "Only owners can raise issues" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingid },
      include: { item: true },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
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
  const authReq = req as AuthRequest;
  try {
    const { status, resolutionnote, deductAmount } = req.body;
    const user = authReq.user;

    if (user?.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can resolve issues" });
    }
    if (!["APPROVED", "REJECTED", "RESOLVED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const issue = await prisma.issue.findUnique({
      where: { id: req.params.id },
      include: {
        booking: { include: { item: { include: { owner: true } }, renter: true } },
      },
    });
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    // Transaction: update issue and optionally insurance pool
    const result = await prisma.$transaction(async (tx) => {
      const updatedIssue = await tx.issue.update({
        where: { id: req.params.id },
        data: {
          status,
          resolutionnote: resolutionnote ?? null,
          resolvedbyid: user.id,
        },
      });

      let insurancePoolUpdated: InsurancePool | null = null;

      if (status === "APPROVED" && deductAmount && Number(deductAmount) > 0) {
        const amount = Math.floor(Number(deductAmount));

        let pool = await tx.insurancePool.findFirst({ orderBy: { createdAt: "asc" } });
        if (!pool) pool = await tx.insurancePool.create({ data: { balance: 0 } });

        insurancePoolUpdated = await tx.insurancePool.update({
          where: { id: pool.id },
          data: { balance: Math.max(0, pool.balance - amount) },
        });

        await tx.issue.update({
          where: { id: updatedIssue.id },
          data: { insurancepoolid: pool.id },
        });
      }

      return { updatedIssue, insurancePoolUpdated };
    });

    // Notify owner & renter
    const booking = issue.booking;
    const owner = booking?.item?.owner;
    const renter = booking?.renter;
    const item = booking?.item;
    const note = resolutionnote ?? "";

    try {
      if (owner?.email) {
        await sendEmail(
          owner.email,
          `Issue ${status} — ${item?.title}`,
          `<p>Issue for booking <b>${booking?.id}</b> has been marked <b>${status}</b>.</p><p>${note}</p>`
        );
      }
      if (renter?.email) {
        await sendEmail(
          renter.email,
          `Issue ${status} — ${item?.title}`,
          `<p>Your booking <b>${booking?.id}</b> has an issue marked <b>${status}</b> by admin.</p><p>${note}</p>`
        );
      }
    } catch (e) {
      console.error("Email notify error:", e);
    }

    try {
      if (owner?.phone) await sendSMS(owner.phone, `Issue ${status} for booking ${booking?.id}: ${note}`);
      if (renter?.phone) await sendSMS(renter.phone, `Issue ${status} for booking ${booking?.id}: ${note}`);
    } catch (e) {
      console.error("SMS notify error:", e);
    }

    return res.json({
      message: "Issue resolved successfully",
      issue: result.updatedIssue,
      insurancePool: result.insurancePoolUpdated,
    });
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
  const authReq = req as AuthRequest;
  try {
    const user = authReq.user;
    if (user?.role !== "ADMIN") return res.status(403).json({ error: "Only admins can view all issues" });

    const issues = await prisma.issue.findMany({
      include: { booking: true, user: true, resolvedby: true, insurancepool: true },
      orderBy: { createdAt: "desc" },
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
  const authReq = req as AuthRequest;
  try {
    const user = authReq.user;
    if (user?.role !== "OWNER") return res.status(403).json({ error: "Only owners can view their issues" });

    const issues = await prisma.issue.findMany({
      where: { userid: user.id },
      include: { booking: true, resolvedby: true, insurancepool: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json(issues);
  } catch (err: any) {
    console.error("My issues fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch owner issues", details: err.message });
  }
});

export default router;


