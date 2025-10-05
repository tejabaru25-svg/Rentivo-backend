import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ============================================
 *  POST /api/rentivo-ai/ask
 *  User asks AI a question → returns AI reply
 * ============================================
 */
router.post("/ask", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'query' field" });
    }

    const userId = authReq.user?.id ?? null;

    // 🧩 Simple placeholder logic for now
    let response = "";
    let needsHuman = false;

    // Basic keyword detection logic
    if (query.toLowerCase().includes("payment")) {
      response = "💰 Please check your payment status in the Bookings section.";
    } else if (query.toLowerCase().includes("kyc")) {
      response = "🪪 You can upload your KYC documents in the profile section.";
    } else if (query.toLowerCase().includes("refund")) {
      response = "🔄 Refunds are processed within 5–7 business days.";
    } else if (query.toLowerCase().includes("upload")) {
      response = "📸 You can upload items in the Upload tab — step by step.";
    } else if (query.toLowerCase().includes("book") || query.toLowerCase().includes("rent")) {
      response = "📅 To book or rent, tap on an item and click 'Book Now'.";
    } else {
      response = "🤖 I’m forwarding your question to our Rentivo Specialist.";
      needsHuman = true;
    }

    // Save to DB
    const aiQuery = await prisma.aIQuery.create({
      data: {
        userId,
        query,
        response,
        needsHuman,
        status: needsHuman ? "escalated" : "resolved",
      },
    });

    return res.json({
      message: "AI query processed successfully",
      queryId: aiQuery.id,
      response,
      needsHuman,
    });
  } catch (err: any) {
    console.error("AI query error:", err);
    return res.status(500).json({
      error: "Failed to process AI query",
      details: err.message,
    });
  }
});

/**
 * ============================================
 *  GET /api/rentivo-ai/history
 *  Returns all past user AI interactions
 * ============================================
 */
router.get("/history", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    if (!authReq.user) return res.status(401).json({ error: "Unauthorized" });

    const history = await prisma.aIQuery.findMany({
      where: { userId: authReq.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      message: "AI chat history fetched successfully",
      history,
    });
  } catch (err: any) {
    console.error("Fetch AI history error:", err);
    return res.status(500).json({
      error: "Failed to fetch AI history",
      details: err.message,
    });
  }
});

/**
 * ============================================
 *  GET /api/rentivo-ai/all (Admin only)
 *  View all AI queries (for monitoring)
 * ============================================
 */
router.get("/all", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    if (authReq.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const allQueries = await prisma.aIQuery.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return res.json({
      message: "All AI queries fetched successfully",
      data: allQueries,
    });
  } catch (err: any) {
    console.error("Admin AI query fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch AI queries",
      details: err.message,
    });
  }
});

export default router;
