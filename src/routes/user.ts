import express, { Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// Get user location
router.get("/location", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { city: true, state: true, latitude: true, longitude: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error fetching location" });
  }
});

// Update user location
router.post("/location", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { city, state, latitude, longitude } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { city, state, latitude, longitude },
      select: { city: true, state: true, latitude: true, longitude: true }
    });

    res.json({ message: "Location updated", location: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Error updating location" });
  }
});

export default router;
