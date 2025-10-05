import express, { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route GET /search?q=keyword
 * @desc Search listings by title, description, category, or location
 * @access Public
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Search query is required" });
    }

    const results = await prisma.listing.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        price: true,
        category: true,
        location: true,
        imageUrl: true,
        createdAt: true,
        ownerId: true,
      },
    });

    res.json({ count: results.length, results });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error during search" });
  }
});

export default router;
