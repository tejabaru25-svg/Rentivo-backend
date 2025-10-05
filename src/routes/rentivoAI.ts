import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import stringSimilarity from "string-similarity";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Rentivo AI Question Base (33 Questions)
const knowledgeBase: Record<string, string> = {
  "how to list my item": "Go to Upload → Add photos → Enter details → Set price → Review → Publish.",
  "how to delete my listing": "Open your profile, go to 'My Listings', tap the item, and choose Delete.",
  "how to edit my item": "Open 'My Listings', select the item, and click 'Edit Item'.",
  "what is kyc": "KYC means verifying your identity using PAN and Aadhaar for security.",
  "how to verify my kyc": "Go to Profile → KYC Verification → Upload your PAN and Aadhaar images.",
  "how long does kyc take": "KYC approval usually takes 24–48 hours.",
  "how to book an item": "Open an item page, choose dates, and tap Book Now.",
  "how to cancel a booking": "Go to My Bookings → Select booking → Cancel.",
  "how do refunds work": "Refunds are processed to your source account within 5–7 days.",
  "what if the item is damaged": "The owner raises an issue with pre and post-trip photos. Admin reviews and resolves.",
  "how to raise an issue": "Only owners can raise an issue after return via the Issue Center.",
  "how to contact support": "Go to Profile → Help → Create Ticket or use Rentivo AI chat.",
  "can renters raise issues": "No, only owners can raise issues after return if damage is found.",
  "how to withdraw money": "Once rental is complete, your earnings are auto-deposited in 2–3 days.",
  "is payment secure": "Yes. Payments are handled by Razorpay with encryption.",
  "can i chat with renter": "Yes, chat is available once booking is confirmed.",
  "how to upload more than 1 photo": "You can upload up to 5 photos during listing creation.",
  "how to set item availability": "In upload step 3, set start and end dates for availability.",
  "how to extend booking": "Go to My Bookings → Select booking → Extend Date.",
  "what happens after booking ends": "Owner confirms return → system verifies → payment released.",
  "what if renter doesn't return": "Admin intervenes via issue center and compares photos.",
  "how to reset password": "Go to Login → Forgot Password → Enter email → Reset link sent.",
  "how to change phone number": "Currently not supported. Contact support for manual update.",
  "how to report a bug": "Go to Profile → Help → Report Issue.",
  "how to check my earnings": "Go to Profile → My Earnings → Overview tab.",
  "can i rent my vehicle": "Yes, if it meets platform guidelines and is verified.",
  "is insurance included": "Yes. Rentivo provides damage coverage via insurance pool.",
  "how to view booking history": "Go to My Bookings → Past tab.",
  "how to see upcoming bookings": "Go to My Bookings → Upcoming tab.",
  "how to verify renter": "Renter KYC is auto-verified by admin before booking.",
  "how to upload documents": "Go to KYC Section → Upload PAN & Aadhaar → Submit.",
  "how to delete account": "Contact support via ticket → Request account deletion.",
  "how to contact admin": "Go to Help → Contact Admin or type your issue here."
};

// ✅ Helper: Find the best matching answer
function getAnswer(question: string): { answer: string; confidence: number } {
  const keys = Object.keys(knowledgeBase);
  const { bestMatch } = stringSimilarity.findBestMatch(question.toLowerCase(), keys);
  const best = bestMatch.target;
  return { answer: knowledgeBase[best], confidence: bestMatch.rating };
}

/**
 * POST /api/rentivo-ai/ask
 * Ask a question to Rentivo AI
 */
router.post("/ask", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // Check if answered before
    const cached = await prisma.aiQuery.findUnique({ where: { query: question } });
    if (cached && cached.response) {
      return res.json({
        message: "✅ Cached Answer",
        answer: cached.response,
        fromCache: true,
      });
    }

    // Find best match
    const { answer, confidence } = getAnswer(question);

    let responseText: string;
    let needsHuman = false;

    if (confidence >= 0.65) {
      responseText = answer;
    } else {
      responseText =
        "I'm not entirely sure. I'll forward this to a Rentivo specialist for review.";
      needsHuman = true;
    }

    // Store query
    await prisma.aiQuery.create({
      data: {
        query: question,
        response: responseText,
        userId: authReq.user?.id,
        needsHuman,
      },
    });

    return res.json({
      message: "🤖 Rentivo AI Response",
      answer: responseText,
      confidence,
      needsHuman,
    });
  } catch (err: any) {
    console.error("AI query error:", err);
    return res.status(500).json({
      error: "AI query failed",
      details: err.message,
    });
  }
});

export default router;

