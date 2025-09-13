import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

// Report an issue
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { userId, bookingId, description } = req.body;

    const issue = await prisma.issue.create({
      data: {
        userId,
        bookingId,
        description,
        status: "OPEN", // ✅ enum uppercase
      },
    });

    return res.json({
      message: "Issue reported successfully",
      issueId: issue.id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to report issue" });
  }
});

export default router;
