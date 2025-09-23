import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";

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

// GET /chat/conversation/:id → fetch messages
router.get("/conversation/:id", authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const convo = conversations[id] || { messages: [], otherUserName: "Unknown" };
  res.json(convo);
});

// POST /chat/send → send new message
router.post("/send", authMiddleware, (req: Request, res: Response) => {
  const { conversationId, text } = req.body;

  if (!conversations[conversationId]) {
    conversations[conversationId] = { messages: [], otherUserName: "Unknown" };
  }

  const user = (req as any).user; // from authMiddleware
  const message: Message = {
    id: Date.now(),
    from: user?.role || "unknown",
    senderName: user?.name || "User",
    text,
    createdAt: new Date(),
  };

  conversations[conversationId].messages.push(message);
  res.json({ message });
});

export default router;
