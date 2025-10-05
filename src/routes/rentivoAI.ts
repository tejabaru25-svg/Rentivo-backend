import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";
import stringSimilarity from "string-similarity";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ==========================
 * Load 33 FAQs into Database
 * ==========================
 */
router.post("/load", async (_req: Request, res: Response) => {
  try {
    const faqs = [
      { query: "What is Rentivo?", response: "Rentivo is a peer-to-peer rental marketplace that lets users rent or list products securely." },
      { query: "Is Rentivo free to use?", response: "Yes, creating an account and browsing listings is free. Small platform fees apply per successful transaction." },
      { query: "Where is Rentivo available?", response: "Rentivo is available across India, starting with major cities like Hyderabad, Bengaluru, and Mumbai." },
      { query: "Is Rentivo safe and verified?", response: "Yes. Every user must complete KYC before listing or booking, ensuring full verification and safety." },
      { query: "Who can use Rentivo?", response: "Anyone aged 18+ with valid KYC documents (PAN and Aadhaar) can rent or list items." },

      { query: "How do I upload my item?", response: "Go to the Upload tab → Add 3–5 photos → Enter title, category, description, price per day → Submit." },
      { query: "What type of items can I list on Rentivo?", response: "You can list electronics, cameras, tools, fashion, furniture, vehicles, and more — anything legal to rent." },
      { query: "Is there a photo limit for uploads?", response: "Yes. You can upload up to 5 photos per item." },
      { query: "How do I set my item price?", response: "In step 3 of upload, enter a fair daily rental price based on your item’s value and category." },
      { query: "Can I edit or delete my listed item later?", response: "Yes. Go to 'My Listings' → Choose item → Tap 'Edit' or 'Delete'." },

      { query: "How do I set my item’s availability?", response: "In step 3 of upload, select your start and end dates. You can update these anytime." },
      { query: "Can renters see my address?", response: "No. Only your city and approximate location are shown until a booking is confirmed." },
      { query: "Can I pause my listing temporarily?", response: "Yes. You can mark your item as unavailable anytime in your item settings." },

      { query: "How do I book an item?", response: "Select an item → Choose your dates → Click 'Book Now' → Complete payment securely via Razorpay." },
      { query: "When is my payment charged?", response: "Payment is processed immediately through Razorpay at the time of booking." },
      { query: "Does Rentivo hold the payment?", response: "Yes. Rentivo holds the payment securely until the booking is completed and verified." },
      { query: "Can I cancel a booking?", response: "Yes, but cancellation policies may vary by owner. Refunds depend on the owner’s terms." },
      { query: "How does the owner receive payment?", response: "After the renter completes the booking and no issues are raised, payment is released to the owner." },

      { query: "Why is KYC required?", response: "To ensure security and prevent fraud. Both owners and renters must complete KYC before transacting." },
      { query: "Which documents are required for KYC?", response: "PAN card and Aadhaar card (front and back)." },
      { query: "How long does KYC verification take?", response: "Usually within 24–48 hours after submission." },

      { query: "What if an item is damaged?", response: "The owner can raise an issue after return. Admin compares pre-trip and post-trip photos and resolves." },
      { query: "Who pays for damages?", response: "If the renter is responsible, the insurance pool or renter’s security deposit covers the cost." },
      { query: "What is Rentivo Insurance Pool?", response: "A shared protection fund built from small contributions on each booking to cover damage claims." },
      { query: "Can renters raise issues?", response: "No. Only the owner can raise issues if damage is found upon return." },
      { query: "What happens if an issue is raised?", response: "The case is reviewed by Rentivo admin with photos and notes. A decision is made within 72 hours." },

      { query: "Can I chat with the owner or renter?", response: "Yes. Once a booking request is made, both parties can chat securely within the app." },
      { query: "How do I contact Rentivo support?", response: "Go to Help → Support → Submit your query or use the chat option to reach Rentivo specialists." },
      { query: "Can Rentivo AI answer my questions?", response: "Yes. Rentivo AI provides instant answers. If unsure, it escalates your query to a human specialist." },
      { query: "What happens if Rentivo AI doesn’t understand my question?", response: "It marks your query as 'escalated' and sends it to our human support team within 24 hours." },
      { query: "How do I reset my password?", response: "Go to Login → 'Forgot Password' → Enter your email or phone → Follow reset instructions." },
      { query: "Can I delete my account?", response: "Yes. Go to Profile → Settings → Delete Account. All your data will be permanently removed." },
      { query: "Is my data secure with Rentivo?", response: "Absolutely. Rentivo uses AWS, encrypted storage, and secure API practices to protect all user data." },
    ];

    for (const faq of faqs) {
      await prisma.aIQuery.upsert({
        where: { query: faq.query },
        update: { response: faq.response },
        create: { query: faq.query, response: faq.response, needsHuman: false },
      });
    }

    res.json({ message: "✅ 33 FAQs loaded successfully", count: faqs.length });
  } catch (err: any) {
    console.error("AI load error:", err);
    res.status(500).json({ error: "Failed to load FAQs", details: err.message });
  }
});

/**
 * ==========================
 * Ask AI a Question
 * ==========================
 */
router.post("/ask", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Question required" });

    // ✅ Fetch all known queries
    const faqs = await prisma.aIQuery.findMany({ where: { needsHuman: false } });
    const allQueries = faqs.map((f) => f.query);

    // ✅ Find best match
    const match = stringSimilarity.findBestMatch(question.toLowerCase(), allQueries);
    const best = match.bestMatch;

    if (best.rating >= 0.55) {
      // ✅ Return matched response
      const answer = faqs.find((f) => f.query === best.target)?.response || "Sorry, I don’t have that info yet.";
      await prisma.aIQuery.create({
        data: {
          userId: req.user?.id,
          query: question,
          response: answer,
          needsHuman: false,
          status: "resolved",
        },
      });
      return res.json({ from: "AI", confidence: best.rating, answer });
    } else {
      // ⚠️ Escalate to human support
      const created = await prisma.aIQuery.create({
        data: {
          userId: req.user?.id,
          query: question,
          response: null,
          needsHuman: true,
          status: "escalated",
        },
      });
      return res.json({
        from: "AI",
        confidence: best.rating,
        message: "Your query has been forwarded to a Rentivo specialist.",
        ticketId: created.id,
      });
    }
  } catch (err: any) {
    console.error("AI ask error:", err);
    res.status(500).json({ error: "AI query failed", details: err.message });
  }
});

export default router;
