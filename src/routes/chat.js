// routes/chat.js
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");

// In-memory store (later replace with DB)
let conversations = {};

// GET /chat/conversation/:id → fetch messages
router.get("/conversation/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const convo = conversations[id] || { messages: [], otherUserName: "Unknown" };
  res.json(convo);
});

// POST /chat/send → send new message
router.post("/send", authMiddleware, (req, res) => {
  const { conversationId, text } = req.body;

  if (!conversations[conversationId]) {
    conversations[conversationId] = { messages: [], otherUserName: "Unknown" };
  }

  const message = {
    id: Date.now(),
    from: req.user.role, // from token
    senderName: req.user.name,
    text,
    createdAt: new Date(),
  };

  conversations[conversationId].messages.push(message);
  res.json({ message });
});

module.exports = router;
