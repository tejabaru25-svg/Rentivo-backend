import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ------------------------------
 * 🏠 GET /api/home/feed
 * Returns recommended + nearby items for homepage
 * ------------------------------
 */
router.get("/feed", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Fetch user with location
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
      },
    });

    // Fetch all active items
    const items = await prisma.item.findMany({
      where: { available: true },
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
    });

    // If user has a location, prioritize nearby items
    let nearbyItems = items;
    if (user?.latitude && user?.longitude) {
      nearbyItems = items.filter((item: any) => {
        // Dummy distance check for now — later we’ll replace with haversine formula
        return item.location?.toLowerCase()?.includes(user.city?.toLowerCase() || "");
      });
    }

    // Limit number of items shown
    const feed = nearbyItems.slice(0, 10);

    return res.json({
      message: "Home feed fetched successfully",
      userLocation: {
        city: user?.city,
        state: user?.state,
      },
      feed,
    });
  } catch (err: any) {
    console.error("Feed fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch home feed", details: err.message });
  }
});

/**
 * ------------------------------
 * 🔍 GET /api/home/search
 * Search for items by title, category, or location
 * ------------------------------
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.query?.toString().trim();
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Search items by title, category, description, or location
    const results = await prisma.item.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Update TopSearch table
    const existing = await prisma.topSearch.findUnique({ where: { term: query } });
    if (existing) {
      await prisma.topSearch.update({
        where: { term: query },
        data: { count: { increment: 1 }, lastUsedAt: new Date() },
      });
    } else {
      await prisma.topSearch.create({ data: { term: query } });
    }

    return res.json({ message: "Search results fetched", query, results });
  } catch (err: any) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Search failed", details: err.message });
  }
});

/**
 * ------------------------------
 * 🔝 GET /api/home/top-searches
 * Get trending top search keywords
 * ------------------------------
 */
router.get("/top-searches", async (_req: Request, res: Response) => {
  try {
    const searches = await prisma.topSearch.findMany({
      orderBy: { count: "desc" },
      take: 10,
    });
    return res.json({ message: "Top searches fetched", searches });
  } catch (err: any) {
    console.error("Top searches error:", err);
    return res.status(500).json({ error: "Failed to fetch top searches", details: err.message });
  }
});

/**
 * ------------------------------
 * 💡 GET /api/home/recommendations
 * Get recommended or trending items
 * ------------------------------
 */
router.get("/recommendations", async (_req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: { available: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return res.json({ message: "Recommendations fetched", items });
  } catch (err: any) {
    console.error("Recommendations error:", err);
    return res.status(500).json({ error: "Failed to fetch recommendations", details: err.message });
  }
});

export default router;

