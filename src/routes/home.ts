import express, { Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ============================
 * 🏡 HOME PAGE ROUTES
 * ============================
 */

/**
 * ✅ Get Home Page Data
 * Includes:
 * - Top Searches
 * - Recommended Items
 * - Nearby Items (if user location available)
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Fetch user location
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { city: true, state: true, latitude: true, longitude: true },
    });

    // Get Top 5 searches
    const topSearches = await prisma.topSearch.findMany({
      orderBy: { count: "desc" },
      take: 5,
    });

    // Get Recommended items (based on popularity or price)
    const recommended = await prisma.item.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, city: true, state: true } },
      },
    });

    // Get Nearby Items (if user has location)
    let nearby: any[] = [];
    if (user?.latitude && user?.longitude) {
      const allItems = await prisma.item.findMany({
        include: {
          owner: { select: { id: true, name: true, city: true, state: true } },
        },
      });

      // Simple distance calculation (Haversine formula)
      const deg2rad = (deg: number) => deg * (Math.PI / 180);
      const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) *
            Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      nearby = allItems
        .map((item) => ({
          ...item,
          distance: item.owner?.latitude
            ? distance(user.latitude!, user.longitude!, item.owner.latitude!, item.owner.longitude!)
            : 9999,
        }))
        .filter((item) => item.distance < 50) // within 50 km radius
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);
    }

    return res.json({
      message: "Home data fetched successfully",
      topSearches,
      recommended,
      nearby,
    });
  } catch (err: any) {
    console.error("Home fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch home data", details: err.message });
  }
});

/**
 * ✅ Search Endpoint (tracks popular searches)
 * Example: /api/home/search?query=bike
 */
router.get("/search", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // Log or increment top search term
    const existing = await prisma.topSearch.findUnique({ where: { term: query.toLowerCase() } });

    if (existing) {
      await prisma.topSearch.update({
        where: { term: query.toLowerCase() },
        data: { count: { increment: 1 }, lastUsedAt: new Date() },
      });
    } else {
      await prisma.topSearch.create({
        data: { term: query.toLowerCase() },
      });
    }

    // Fetch matching items
    const results = await prisma.item.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, city: true, state: true } },
      },
    });

    return res.json({ message: "Search successful", results });
  } catch (err: any) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Search failed", details: err.message });
  }
});

/**
 * ✅ Get Top Searches (popular trends)
 */
router.get("/top-searches", async (_req, res: Response) => {
  try {
    const topSearches = await prisma.topSearch.findMany({
      orderBy: { count: "desc" },
      take: 10,
    });
    res.json(topSearches);
  } catch (err: any) {
    console.error("Top searches error:", err);
    res.status(500).json({ error: "Failed to fetch top searches", details: err.message });
  }
});

export default router;
