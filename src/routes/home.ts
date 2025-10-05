import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ======================
 * HOME PAGE BACKEND
 * ======================
 * Returns:
 * - Top searched items
 * - Recommendations (based on location)
 * - Recently added items
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    // ✅ 1️⃣ Get user's location if logged in
    const user = authReq.user
      ? await prisma.user.findUnique({
          where: { id: authReq.user.id },
          select: { city: true, state: true, latitude: true, longitude: true },
        })
      : null;

    // ✅ 2️⃣ Top Searches (using searchCount)
    const topSearches = await prisma.topSearch.findMany({
      orderBy: { searchCount: "desc" },
      take: 6,
    });

    // ✅ 3️⃣ Recommendations (based on user city/state)
    let recommendations = [];
    if (user?.city || user?.state) {
      recommendations = await prisma.item.findMany({
        where: {
          OR: [
            user.city ? { location: { contains: user.city, mode: "insensitive" } } : undefined,
            user.state ? { location: { contains: user.state, mode: "insensitive" } } : undefined,
          ].filter(Boolean) as any, // ✅ removes undefined safely
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

    // ✅ 4️⃣ Recently added items
    const recentItems = await prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return res.json({
      message: "Home page data fetched successfully",
      topSearches,
      recommendations,
      recentItems,
      userLocation: user ? { city: user.city, state: user.state } : null,
    });
  } catch (err: any) {
    console.error("Home page fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch home page data",
      details: err.message,
    });
  }
});

export default router;






