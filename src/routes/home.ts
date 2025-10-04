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
 * - Top 6 searched terms
 * - Recommended items (based on user location)
 * - Recently added items
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    // ✅ get user info for recommendations
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

    /**
     * 🔹 1. Top Searches
     * Sorted by "count" column (defined in schema)
     */
    const topSearches = await prisma.topSearch.findMany({
      orderBy: { count: "desc" as any }, // ✅ fix type mismatch
      take: 6,
    });

    /**
     * 🔹 2. Recommendations (based on location)
     */
    let recommendations: any[] = [];

    if (user?.city || user?.state) {
      recommendations = await prisma.item.findMany({
        where: {
          OR: [
            user?.city ? { location: { contains: user.city, mode: "insensitive" } } : undefined,
            user?.state ? { location: { contains: user.state, mode: "insensitive" } } : undefined,
          ].filter(Boolean) as any, // ✅ Prisma type-safe filter fix
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
    } else {
      recommendations = await prisma.item.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      });
    }

    /**
     * 🔹 3. Recently Added Items
     */
    const recentItems = await prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return res.json({
      message: "Home page data fetched successfully",
      userLocation: user
        ? { city: user.city, state: user.state, latitude: user.latitude, longitude: user.longitude }
        : null,
      topSearches,
      recommendations,
      recentItems,
    });
  } catch (err: any) {
    console.error("🏠 Home page fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch home page data",
      details: err.message,
    });
  }
});

export default router;





