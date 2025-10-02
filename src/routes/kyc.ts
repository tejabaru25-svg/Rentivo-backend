import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/kyc/submit
 * User submits KYC (PAN + Aadhaar).
 */
router.post("/submit", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { panurl, aadhaarfronturl, aadhaarbackurl } = req.body;
    const userid = req.user.id; // from JWT

    if (!panurl || !aadhaarfronturl || !aadhaarbackurl) {
      return res.status(400).json({ error: "All KYC documents are required" });
    }

    const kycRecord = await prisma.kYC.upsert({
      where: { userid },
      update: {
        panurl,
        aadhaarfronturl,
        aadhaarbackurl,
        verified: "pending",
        submittedAt: new Date(), // ✅ FIXED camelCase
      },
      create: {
        userid,
        panurl,
        aadhaarfronturl,
        aadhaarbackurl,
        verified: "pending",
        submittedAt: new Date(), // ✅ FIXED camelCase
      },
    });

    return res.json({ message: "KYC submitted successfully", kyc: kycRecord });
  } catch (err: any) {
    console.error("KYC submit error:", err);
    return res.status(500).json({ error: "KYC failed", details: err.message });
  }
});

export default router;
