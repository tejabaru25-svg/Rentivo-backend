// src/routes/home.ts
import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ======================
 * Get Home Page Data
 * ======================
 * Returns:
 * - Top searched keywords (from TopSearch table)
 * - Recommended items (based on user's city/state)
 * - Recently listed items
 */
router.get(
  "/",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userReq = req as AuthRequest;

      // ✅ Get user's location for recommendations
      const user = userReq.user
        ? await prisma.user.findUnique({
            where: { id: userReq.user.id },
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

      /* ======================
         🔹 Top Searches
      ====================== */
      const topSearches = await prisma.topSearch.findMany({
        orderBy: { searchCount: "desc" },
        take: 6,
        select: {
          keyword: true,
          searchCount: true,
          lastUsedAt: true,
        },
      });

      /* ======================
         🔹 Recommended Items
      ====================== */
      let recommendations: any[] = [];

      if (user?.city || user?.state) {
        recommendations = await prisma.item.findMany({
          where: {
            OR: [
              user.city
                ? { location: { contains: user.city, mode: "insensitive" } }
                : undefined,
              user.state
                ? { location: { contains: user.state, mode: "insensitive" } }
                : undefined,
            ].filter(Boolean),
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            title: true,
            category: true,
            priceperday: true,
            photos: true,
            location: true,
            createdAt: true,
          },
        });
      } else {
        // fallback — newest items globally
        recommendations = await prisma.item.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            title: true,
            category: true,
            priceperday: true,
            photos: true,
            location: true,
            createdAt: true,
          },
        });
      }

      /* ======================
         🔹 Recently Added Items
      ====================== */
      const recentItems = await prisma.item.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          category: true,
          priceperday: true,
          photos: true,
          location: true,
          createdAt: true,
        },
      });

      /* ======================
         ✅ Response
      ====================== */
      return res.json({
        message: "Home page data fetched successfully",
        userLocation: user
          ? {
              city: user.city ?? null,
              state: user.state ?? null,
              latitude: user.latitude ?? null,
              longitude: user.longitude ?? null,
            }
          : null,
        topSearches,
        recommendations,
        recentItems,
      });
    } catch (err: any) {
      console.error("❌ Home page fetch error:", err);
      return res.status(500).json({
        error: "Failed to fetch home page data",
        details: err.message || err,
      });
    }
  }
);

export default router;



