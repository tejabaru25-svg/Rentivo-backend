import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import stringSimilarity from "string-similarity";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ======================
 * Rentivo AI - FAQ Answering
 * ======================
 * Supports:
 * - /api/rentivo-ai/ask  → user asks question
 * - /api/rentivo-ai/load → admin loads all default FAQs
 */

// 🔹 1️⃣ Load all predefined FAQs (admin use)
router.post("/load", async (_req: Request, res: Response) => {
  try {
    const faqs = [
      {
        question: "What is Rentivo?",
        answer: "Rentivo is a rental marketplace where you can rent or list items like cameras, vehicles, electronics, and more — safely and easily.",
        tags: ["home", "info"],
      },
      {
        question: "How do I upload an item for rent?",
        answer: "Tap the “+ Upload” tab → Add 3–5 photos → Fill title, description, category, and price → Set availability → Submit.",
        tags: ["upload", "listing"],
      },
      {
        question: "How many photos can I upload?",
        answer: "You can upload up to 5 photos per item.",
        tags: ["upload", "photos"],
      },
      {
        question: "How do I book an item?",
        answer: "Go to the item page → select your dates → tap “Book Now” → complete payment securely with Razorpay.",
        tags: ["booking", "rent"],
      },
      {
        question: "Why do I need to complete KYC?",
        answer: "KYC keeps transactions safe and builds trust between owners and renters.",
        tags: ["kyc", "verification"],
      },
      {
        question: "My item was damaged after a rental. What do I do?",
        answer: "Owners can raise an issue after return → Rentivo Admin will compare before/after photos and decide.",
        tags: ["issues", "damage"],
      },
      {
        question: "Can I talk to a human?",
        answer: "Yes. If Rentivo AI cannot solve your issue, it will escalate to a specialist who responds within 24 hours.",
        tags: ["ai", "support"],
      },
    ];

    await prisma.rentivoAI.createMany({
      data: faqs,
      skipDuplicates: true,
    });

    return res.json({ message: "✅ Rentivo AI FAQs loaded successfully", count: faqs.length });
  } catch (err: any) {
    console.error("Load FAQs error:", err);
    return res.status(500).json({ error: "Failed to load default FAQs", details: err.message });
  }
});

// 🔹 2️⃣ Ask the AI endpoint
router.post("/ask", async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Fetch all stored FAQs
    const faqs = await prisma.rentivoAI.findMany();

    if (faqs.length === 0) {
      return res.json({
        message: "AI database is empty. Please run /api/rentivo-ai/load first.",
      });
    }

    // Compare similarity
    const allQuestions = faqs.map((faq) => faq.question);
    const matches = stringSimilarity.findBestMatch(question, allQuestions);
    const bestMatch = faqs[matches.bestMatchIndex];

    // Confidence score
    const confidence = matches.bestMatch.rating;

    if (confidence > 0.5) {
      return res.json({
        success: true,
        confidence: confidence.toFixed(2),
        answer: bestMatch.answer,
        sourceQuestion: bestMatch.question,
      });
    } else {
      return res.json({
        success: false,
        confidence: confidence.toFixed(2),
        message:
          "I'm not fully sure about this question. Transferring to a Rentivo specialist for review.",
      });
    }
  } catch (err: any) {
    console.error("AI ask error:", err);
    return res.status(500).json({ error: "AI query failed", details: err.message });
  }
});

export default router;
