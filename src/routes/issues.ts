import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { user_id, booking_id, description } = req.body;

    const issue = await prisma.issue.create({
      data: {
        user_id,
        booking_id,
        description,
        status: "open",
      },
    });

    return res.json({ message: "Issue reported successfully", issueId: issue.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to report issue" });
  }
});

export default router;
