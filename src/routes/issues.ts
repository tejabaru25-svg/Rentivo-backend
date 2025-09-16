import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Create issue
router.post("/", async (req, res) => {
  try {
    const { userid, bookingid, description, photos } = req.body;

    const issue = await prisma.issue.create({
      data: {
        userid,
        bookingid,
        description,
        photos,
      },
    });

    return res.json(issue);
  } catch (err: any) {
    console.error("Issue create error:", err);
    return res.status(500).json({ error: "Issue creation failed", details: err.message });
  }
});

// Get all issues
router.get("/", async (_req, res) => {
  try {
    const issues = await prisma.issue.findMany({
      include: { user: true },
    });
    return res.json(issues);
  } catch (err: any) {
    console.error("Issue fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch issues", details: err.message });
  }
});

export default router;
