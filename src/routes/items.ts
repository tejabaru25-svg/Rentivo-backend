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

/**
 * Update item by ID (Owner only)
 */
router.put("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, pricePerDay, photos, location, available } = req.body;

    // Check item exists
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Item not found" });

    // Ensure only owner can update
    if (existing.ownerId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to update this item" });
    }

    const updated = await prisma.item.update({
      where: { id },
      data: { title, description, category, pricePerDay, photos, location, available },
    });

    return res.json(updated);
  } catch (err) {
    console.error("Error updating item:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Delete item by ID (Owner only)
 */
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Item not found" });

    if (existing.ownerId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to delete this item" });
    }

    await prisma.item.delete({ where: { id } });

    return res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("Error deleting item:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

