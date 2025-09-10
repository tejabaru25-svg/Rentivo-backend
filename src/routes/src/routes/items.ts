import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// Create item (Owner only)
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
        photos: photos || [],
        location,
        ownerId: req.user.userId
      }
    });

    res.json(item);
  } catch (err) {
    console.error("Create item error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// Get all items (public)
router.get("/", async (_req, res) => {
  try {
    const items = await prisma.item.findMany({
      include: { owner: { select: { id: true, name: true, email: true } } }
    });
    res.json(items);
  } catch (err) {
    console.error("Get items error:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// Get single item by ID
router.get("/:id", async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: { owner: { select: { id: true, name: true, email: true } } }
    });

    if (!item) return res.status(404).json({ error: "Item not found" });

    res.json(item);
  } catch (err) {
    console.error("Get item error:", err);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

export default router;
