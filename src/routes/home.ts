import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ======================
 * Get Home Page Data
 * ======================
 * This returns:
 * - Top 6 searched items
 * - Recommended items based on user's location (if available)
 * - Recently listed items
 */
router.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userReq = req as AuthRequest; // ✅ safely cast to AuthRequest type

    // ✅ get user's city/state for location-based suggestions
    const user = userReq.user
      ? await prisma.user.findUnique({
          where: { id: userReq.user.id },
          select: { id: true, name: true, city: true, state: true, latitude: true, longitude: true },
        })
      : null;

    // 🔹 Top searches
    const topSearches = await prisma.topSearch.findMany({
      orderBy: { searchCount: "desc" },
      take: 6,
    });

    // 🔹 Recommendations based on location (if available)
    let recommendations = [];
    if (user?.city || user?.state) {
      recommendations = await prisma.item.findMany({
        where: {
          OR: [
            { location: { contains: user.city ?? "", mode: "insensitive" } },
            { location: { contains: user.state ?? "", mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
    } else {
      // fallback: just show newest items
      recommendations = await prisma.item.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      });
    }

    // 🔹 Recently added items
    const recentItems = await prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return res.json({
      message: "Home page data fetched successfully",
      userLocation: user ? { city: user.city, state: user.state } : null,
      topSearches,
      recommendations,
      recentItems,
    });
  } catch (err: any) {
    console.error("Home page fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch home page data", details: err.message });
  }
});

export default router;


