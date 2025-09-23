// src/routes/chat.ts
import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/chat/start
 * Ensure a conversation exists between owner and renter.
 * Caller (from token) can provide ownerId or renterId.
 */
router.post("/start", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const callerId = req.user?.id;
    if (!callerId) return res.status(401).json({ error: "Unauthorized" });

    let { ownerId, renterId } = req.body as { ownerId?: string; renterId?: string };

    if (!ownerId && !renterId) {
      return res.status(400).json({ error: "ownerId or renterId required" });
    }

    // Infer missing side
    if (ownerId && !renterId) renterId = callerId;
    if (renterId && !ownerId) ownerId = callerId;

    if (!ownerId || !renterId) {
      return res.status(400).json({ error: "Both ownerId and renterId are required" });
    }
    if (ownerId === renterId) {
      return res.status(400).json({ error: "ownerId and renterId cannot be the same" });
    }

    // Find or create conversation
    let convo = await prisma.conversation.findFirst({ where: { ownerId, renterId } });
    if (!convo) {
      convo = await prisma.conversation.create({ data: { ownerId, renterId } });
    }

    return res.json({ conversationId: convo.id, conversation: convo });
  } catch (err: any) {
    console.error("Chat start error:", err);
    return res.status(500).json({ error: "Failed to start conversation", details: err.message });
  }
});

/**
 * GET /api/chat/conversation/:id
 * Fetch all messages for a conversation
 */
router.get("/conversation/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const callerId = req.user?.id;

    const convo = await prisma.conversation.findUnique({
      where: { id },
      include: { owner: true, renter: true },
    });
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    // Ensure caller is part of this conversation
    if (callerId !== convo.ownerId && callerId !== convo.renterId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    const formatted = messages.map((m) => ({
      id: m.id,
      text: m.text,
      from: (m.sender?.role || "").toLowerCase() === "owner" ? "owner" : "renter",
      senderName: m.sender?.name || "User",
      createdAt: m.createdAt.toISOString(),
    }));

    return res.json({ conversation: convo, messages: formatted });
  } catch (err: any) {
    console.error("Chat fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch messages", details: err.message });
  }
});

/**
 * POST /api/chat/send
 * Save a new message in the database
 */
router.post("/send", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const callerId = req.user?.id;
    const { conversationId, text } = req.body as { conversationId?: string; text?: string };

    if (!callerId) return res.status(401).json({ error: "Unauthorized" });
    if (!conversationId || !text) {
      return res.status(400).json({ error: "conversationId and text are required" });
    }

    const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    // Ensure caller is part of this conversation
    if (callerId !== convo.ownerId && callerId !== convo.renterId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const message = await prisma.message.create({
      data: { conversationId, senderId: callerId, text },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    const formatted = {
      id: message.id,
      text: message.text,
      from: (message.sender?.role || "").toLowerCase() === "owner" ? "owner" : "renter",
      senderName: message.sender?.name || "User",
      createdAt: message.createdAt.toISOString(),
    };

    return res.json({ message: formatted });
  } catch (err: any) {
    console.error("Chat send error:", err);
    return res.status(500).json({ error: "Failed to send message", details: err.message });
  }
});

export default router;
