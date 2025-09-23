import express, { Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// Helper: only allow these fields in update
const ALLOWED_UPDATE_FIELDS = new Set([
  "title",
  "description",
  "category",
  "priceperday",
  "photos",
  "location",
  "available",
]);

// -------------------
// Create Item
// -------------------
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, priceperday, photos, location } = req.body;
    const userId = req.user?.id; // from JWT

    if (!title || !category || priceperday === undefined || !location) {
      return res
        .status(400)
        .json({ error: "Missing required fields: title, category, priceperday, location" });
    }

    const item = await prisma.item.create({
      data: {
        ownerid: userId,
        title,
        description: description || null,
        category,
        priceperday:
          typeof priceperday === "string" ? parseInt(priceperday, 10) : priceperday,
        photos: Array.isArray(photos) ? photos : photos ? [photos] : [],
        location,
      },
    });

    return res.json({ message: "Item created", item });
  } catch (err: any) {
    console.error("Create item error:", err);
    return res.status(500).json({ error: "Failed to create item", details: err.message });
  }
});

// -------------------
// Get All Items
// -------------------
router.get("/", async (_req, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdat: "desc" },
    });
    return res.json(items);
  } catch (err: any) {
    console.error("Get items error:", err);
    return res.status(500).json({ error: "Failed to fetch items", details: err.message });
  }
});

// -------------------
// Get Single Item by ID
// -------------------
router.get("/:id", async (req, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!item) return res.status(404).json({ error: "Item not found" });
    return res.json(item);
  } catch (err: any) {
    console.error("Get item error:", err);
    return res.status(500).json({ error: "Failed to fetch item", details: err.message });
  }
});

// -------------------
// Update Item
// -------------------
router.put("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.ownerid !== userId)
      return res.status(403).json({ error: "Not authorized" });

    // Build update data only with allowed fields
    const updateData: any = {};
    for (const key of Object.keys(req.body)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        updateData[key] = req.body[key];
      }
    }

    // Ensure priceperday is Int if provided
    if (updateData.priceperday !== undefined) {
      updateData.priceperday =
        typeof updateData.priceperday === "string"
          ? parseInt(updateData.priceperday, 10)
          : updateData.priceperday;
    }

    // Ensure photos is array
    if (updateData.photos && !Array.isArray(updateData.photos)) {
      updateData.photos = [updateData.photos];
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: updateData,
    });

    return res.json({ message: "Item updated", item: updatedItem });
  } catch (err: any) {
    console.error("Update item error:", err);
    return res.status(500).json({ error: "Failed to update item", details: err.message });
  }
});

// -------------------
// Delete Item
// -------------------
router.delete("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.ownerid !== userId)
      return res.status(403).json({ error: "Not authorized" });

    await prisma.item.delete({ where: { id } });
    return res.json({ message: "Item deleted" });
  } catch (err: any) {
    console.error("Delete item error:", err);
    return res.status(500).json({ error: "Failed to delete item", details: err.message });
  }
});

export default router;
