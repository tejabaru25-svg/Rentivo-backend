import express from "express";
import prisma from "../prismaClient"; // your prisma client
import cuid from "cuid";

const router = express.Router();

// POST /api/devices
// Body: { token: string, platform: string }
// Needs user auth (req.user.id)
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { token, platform } = req.body;

    if (!token) return res.status(400).json({ error: "FCM token required" });

    await prisma.userDevice.upsert({
      where: { token },
      update: { userId, platform, createdAt: new Date() },
      create: { id: cuid(), userId, token, platform },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Device register error:", err);
    res.status(500).json({ error: "server error" });
  }
});

export default router;
