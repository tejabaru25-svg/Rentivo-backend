import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../authMiddleware";  // ✅ correct path

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Create new item (Owner only)
 */
router.post("/", authenticateToken, async (req: any, res) => {
  try {
    const { title, description, category, pricePerDay, photos, location } = req.body;

    if (!title || !category || !pricePerDay || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const item = await prisma.item.create({
      data: {
        title,
        description,
        category,
        pricePerDay,
        photos,
        location,
        ownerId: req.user.userId, // 👤 taken from token
      },
    });

    return res.json(item);
  } catch (err) {
    console.error("Error creating item:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get all items
 */
router.get("/", async (_req, res) => {
  try {
    const items = await prisma.item.findMany({
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return res.json(items);
  } catch (err) {
    console.error("Error fetching items:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get single item by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!item) return res.status(404).json({ error: "Item not found" });

    return res.json(item);
  } catch (err) {
    console.error("Error fetching item:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
