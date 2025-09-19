import express from "express";
import prisma from "../prismaClient";

const router = express.Router();

// POST /api/devices
// Body: { token: string, platform: string }
// Needs user auth (req.user.id)
router.post("/", async (req, res) => {
  try {
    // ✅ safe check for user from auth middleware
    if (!(req as any).user || !(req as any).user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = (req as any).user.id;
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ error: "FCM token required" });
    }

    await prisma.userDevice.upsert({
      where: { token },
      update: {
        userId,
        platform,
        createdAt: new Date(),
      },
      create: {
        userId,
        token,
        platform,
      },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Device register error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

export default router;
