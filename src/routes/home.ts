import express, { Request, Response } from "express";
import { PrismaClient, Item, TopSearch } from "@prisma/client";
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
          select: {
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        })
      : null;

    // ✅ 2️⃣ Top Searches (sorted by searchCount)
    const topSearches: TopSearch[] = await prisma.topSearch.findMany({
      orderBy: { searchCount: "desc" },
      take: 6,
    });

    // ✅ 3️⃣ Recommendations (explicitly typed)
    let recommendations: Item[] = [];

    if (user?.city || user?.state) {
      const filters: any[] = [];

      if (user.city) {
        filters.push({
          location: { contains: user.city, mode: "insensitive" },
        });
      }

      if (user.state) {
        filters.push({
          location: { contains: user.state, mode: "insensitive" },
        });
      }

      recommendations = await prisma.item.findMany({
        where: { OR: filters.length > 0 ? filters : undefined },
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
    const recentItems: Item[] = await prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // ✅ 5️⃣ Return combined data
    return res.json({
      message: "🏠 Home page data fetched successfully",
      topSearches,
      recommendations,
      recentItems,
      userLocation: user
        ? {
            city: user.city ?? null,
            state: user.state ?? null,
            latitude: user.latitude ?? null,
            longitude: user.longitude ?? null,
          }
        : null,
    });
  } catch (err: any) {
    console.error("❌ Home page fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch home page data",
      details: err.message,
    });
  }
});

export default router;








