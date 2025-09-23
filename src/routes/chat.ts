import { Router, Response } from "express";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = Router();

// Temporary in-memory store (later replace with DB)
interface Message {
  id: number;
  from: string;
  senderName: string;
  text: string;
  createdAt: Date;
}

interface Conversation {
  messages: Message[];
  otherUserName: string;
}

const conversations: Record<string, Conversation> = {};

/**
 * GET /chat/conversation/:id
 * Fetch messages in a conversation
 */
router.get(
  "/conversation/:id",
  authenticateToken,
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const convo = conversations[id] || { messages: [], otherUserName: "Unknown" };
    res.json(convo);
  }
);

/**
 * POST /chat/send
 * Send a new message
 */
router.post("/send", authenticateToken, (req: AuthRequest, res: Response) => {
  const { conversationId, text } = req.body;

  if (!conversationId || !text) {
    return res.status(400).json({ error: "conversationId and text are required" });
  }

  if (!conversations[conversationId]) {
    conversations[conversationId] = { messages: [], otherUserName: "Unknown" };
  }

  const user = req.user || {};
  const message: Message = {
    id: Date.now(),
    from: user.role || "unknown",
    senderName: user.name || "User",
    text,
    createdAt: new Date(),
  };

  conversations[conversationId].messages.push(message);
  res.json({ message });
});

export default router;
