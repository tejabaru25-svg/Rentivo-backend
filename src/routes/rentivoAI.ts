import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import stringSimilarity from "string-similarity";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// 🧠 Knowledge base — 33 common Rentivo Q&A pairs
const FAQ_DATA = [
  { q: "how to upload an item", a: "Go to Upload Tab → Add 3–5 photos → Enter item details → Set price & availability → Review & submit." },
  { q: "how to book an item", a: "Browse or search → Select an item → Choose start & end dates → Confirm & pay securely via Razorpay." },
  { q: "how to cancel a booking", a: "You can cancel a booking before handover through your bookings section. Refunds depend on owner policy." },
  { q: "how to verify kyc", a: "Upload your PAN & Aadhaar (front/back) on the KYC page. Verification usually takes 24–48 hours." },
  { q: "what if the item is damaged", a: "After return, the owner can raise an issue. Our admin compares pre/post trip photos and resolves it." },
  { q: "how does rentivo insurance work", a: "Each booking includes a small insurance fee that goes into the insurance pool to cover damages." },
  { q: "how to withdraw earnings", a: "Owners can withdraw available earnings after booking completion. Transfer to your verified bank account." },
  { q: "can i list multiple items", a: "Yes! You can list multiple items across different categories with unique titles and images." },
  { q: "what is platform fee", a: "A small service fee charged by Rentivo for each booking to maintain platform operations." },
  { q: "how to contact support", a: "You can contact support via the Help section or by raising a ticket in your Rentivo account." },
  { q: "how long does kyc take", a: "KYC verification typically takes between 24 and 48 hours." },
  { q: "can renters raise issues", a: "Only owners can raise damage issues after item return. Renters can contact support if needed." },
  { q: "what are the payment methods", a: "Payments are processed securely via Razorpay — UPI, credit/debit cards, and wallets supported." },
  { q: "can i extend a booking", a: "Yes, renters can request to extend a booking if the item is still available for those dates." },
  { q: "what is the refund policy", a: "Refunds depend on cancellation timing and owner policy. Insurance and platform fees are non-refundable." },
  { q: "is my data safe", a: "Yes! Rentivo uses AWS S3, encrypted connections, and secure payments via Razorpay." },
  { q: "how to reset password", a: "Click 'Forgot Password' on login → Check email → Follow the reset link to set a new password." },
  { q: "how to change phone number", a: "Edit your phone number from your profile page. Verification via OTP may be required." },
  { q: "how to change email", a: "Edit your email in your account settings. We’ll verify the new email via OTP." },
  { q: "how to delete account", a: "You can request account deletion from the Profile → Settings → Delete Account section." },
  { q: "how to become verified owner", a: "Complete your KYC and maintain good ratings for verified owner badge." },
  { q: "how to track my booking", a: "All bookings are visible in your Bookings tab with live status updates." },
  { q: "can i message owner", a: "Yes, you can message the owner directly once a booking request is made." },
  { q: "how to edit my item details", a: "Go to My Listings → Edit → Update title, price, availability, or photos." },
  { q: "how to pause item listing", a: "You can toggle 'available' off in My Listings to hide the item temporarily." },
  { q: "how to view my earnings", a: "Owners can view total and pending earnings in the Earnings tab." },
  { q: "does rentivo charge commission", a: "Yes, a small platform fee per booking — displayed before you confirm." },
  { q: "how to report a problem", a: "Use 'Raise Issue' after return or contact support for help anytime." },
  { q: "is there customer care number", a: "Support is primarily handled via chat and support tickets." },
  { q: "can i use rentivo internationally", a: "Currently Rentivo operates within India, expansion is planned soon." },
  { q: "what is rentivo", a: "Rentivo is a peer-to-peer rental platform to rent and lend items safely." },
  { q: "how does rentivo ai help", a: "Rentivo AI instantly answers questions. If it can’t, it escalates to a human specialist." },
  { q: "what is insurance pool", a: "The insurance pool collects small fees to cover item damage during rentals." }
];

// 🤖 POST /api/rentivo-ai
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    const user = authReq.user;
    const { query } = req.body;

    if (!query) return res.status(400).json({ error: "Missing 'query' field" });

    // Find best matching question
    const allQuestions = FAQ_DATA.map(f => f.q);
    const match = stringSimilarity.findBestMatch(query.toLowerCase(), allQuestions);
    const bestMatch = FAQ_DATA[match.bestMatchIndex];
    const confidence = match.bestMatch.rating;

    let responseText: string;
    let needsHuman = false;

    if (confidence > 0.45) {
      responseText = bestMatch.a;
    } else {
      responseText = "I'm not sure about that. I’ll forward your query to a Rentivo specialist.";
      needsHuman = true;
    }

    // Save to DB
    await prisma.aIQuery.create({
      data: {
        userId: user?.id || null,
        query,
        response: responseText,
        needsHuman,
        status: needsHuman ? "escalated" : "resolved",
      },
    });

    return res.json({
      success: true,
      message: "Response generated successfully",
      confidence,
      response: responseText,
      forwarded: needsHuman,
    });
  } catch (err: any) {
    console.error("Rentivo AI error:", err);
    return res.status(500).json({ error: "Internal error", details: err.message });
  }
});

// 🧾 GET /api/rentivo-ai/history
router.get("/history", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    const queries = await prisma.aIQuery.findMany({
      where: { userId: authReq.user?.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return res.json({ success: true, queries });
  } catch (err: any) {
    console.error("AI history error:", err);
    return res.status(500).json({ error: "Failed to fetch AI history", details: err.message });
  }
});

export default router;


