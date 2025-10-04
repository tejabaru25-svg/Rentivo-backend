import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Only allow these fields in updates
const ALLOWED_UPDATE_FIELDS = new Set([
  "title",
  "description",
  "category",
  "priceperday",
  "photos",
  "location",
  "available",
]);

/**
 * ======================
 * POST /api/items
 * Create a new item
 * ======================
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    if (!authReq.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { title, description, category, priceperday, photos, location } = authReq.body;

    if (!title || !category || priceperday === undefined || !location) {
      return res.status(400).json({
        error: "Missing required fields: title, category, priceperday, location",
      });
    }

    const item = await prisma.item.create({
      data: {
        ownerid: authReq.user.id,
        title,
        category,
        location,
        priceperday:
          typeof priceperday === "string" ? parseInt(priceperday, 10) : priceperday,
        photos: Array.isArray(photos) ? photos : photos ? [photos] : [],
        ...(description ? { description } : {}),
      },
    });

    return res.json({ message: "Item created successfully", item });
  } catch (err: any) {
    console.error("Create item error:", err);
    return res.status(500).json({
      error: "Failed to create item",
      details: err.message,
    });
  }
});

/**
 * ======================
 * GET /api/items
 * Fetch all items
 * ======================
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(items);
  } catch (err: any) {
    console.error("Get items error:", err);
    return res.status(500).json({
      error: "Failed to fetch items",
      details: err.message,
    });
  }
});

/**
 * ======================
 * GET /api/items/:id
 * Fetch single item
 * ======================
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.json(item);
  } catch (err: any) {
    console.error("Get item error:", err);
    return res.status(500).json({
      error: "Failed to fetch item",
      details: err.message,
    });
  }
});

/**
 * ======================
 * PUT /api/items/:id
 * Update item
 * ======================
 */
router.put("/:id", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    if (!authReq.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.ownerid !== authReq.user.id) {
      return res.status(403).json({ error: "Not authorized to update this item" });
    }

    const updateData: Record<string, any> = {};
    for (const key of Object.keys(req.body)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) updateData[key] = req.body[key];
    }

    if (updateData.priceperday !== undefined) {
      updateData.priceperday =
        typeof updateData.priceperday === "string"
          ? parseInt(updateData.priceperday, 10)
          : updateData.priceperday;
    }

    if (updateData.photos && !Array.isArray(updateData.photos)) {
      updateData.photos = [updateData.photos];
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: updateData,
    });

    return res.json({ message: "Item updated successfully", item: updatedItem });
  } catch (err: any) {
    console.error("Update item error:", err);
    return res.status(500).json({
      error: "Failed to update item",
      details: err.message,
    });
  }
});

/**
 * ======================
 * DELETE /api/items/:id
 * Delete item
 * ======================
 */
router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    if (!authReq.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.ownerid !== authReq.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this item" });
    }

    await prisma.item.delete({ where: { id } });
    return res.json({ message: "Item deleted successfully" });
  } catch (err: any) {
    console.error("Delete item error:", err);
    return res.status(500).json({
      error: "Failed to delete item",
      details: err.message,
    });
  }
});

export default router;



