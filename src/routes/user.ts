import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ---------------------
 * GET /api/user/location
 * Get user's saved location (city, state, lat, long)
 * ---------------------
 */
router.get("/location", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest; // ✅ safely cast here

  try {
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: { city: true, state: true, latitude: true, longitude: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Location fetch error:", error);
    return res.status(500).json({ error: "Error fetching location" });
  }
});

/**
 * ---------------------
 * POST /api/user/location
 * Update user location (city, state, lat, long)
 * ---------------------
 */
router.post("/location", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest; // ✅ safely cast again
  const { city, state, latitude, longitude } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: authReq.user.id },
      data: { city, state, latitude, longitude },
      select: { city: true, state: true, latitude: true, longitude: true },
    });

    return res.json({ message: "Location updated", location: updatedUser });
  } catch (error) {
    console.error("Location update error:", error);
    return res.status(500).json({ error: "Error updating location" });
  }
});

export default router;

