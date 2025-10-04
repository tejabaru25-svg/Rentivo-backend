// src/routes/home.ts
import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ======================
 * Get Home Page Data
 * ======================
 * Returns:
 * - Top searches
 * - Recommended items near user
 * - Recent items
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    // ✅ Get user's city/state for location-based recommendations
    const user = authReq.user
      ? await prisma.user.findUnique({
          where: { id: authReq.user.id },
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        })
      : null;

    // ✅ Top Searches
    const topSearches = await prisma.topSearch.findMany({
      orderBy: { count: "desc" }, // ✅ fixed key name
      take: 6,
    });

    // ✅ Build location filter safely
    const orConditions = [];
    if (user?.city)
      orConditions.push({
        location: { contains: user.city, mode: "insensitive" as const },
      });
    if (user?.state)
      orConditions.push({
        location: { contains: user.state, mode: "insensitive" as const },
      });

    // ✅ Recommendations
    let recommendations;
    if (orConditions.length > 0) {
      recommendations = await prisma.item.findMany({
        where: { OR: orConditions },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
    } else {
      recommendations = await prisma.item.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      });
    }

    // ✅ Recently added items
    const recentItems = await prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return res.json({
      message: "Home data fetched successfully",
      userLocation: user ? { city: user.city, state: user.state } : null,
      topSearches,
      recommendations,
      recentItems,
    });
  } catch (err: any) {
    console.error("Home route error:", err);
    return res.status(500).json({
      error: "Failed to fetch home data",
      details: err.message,
    });
  }
});

export default router;




