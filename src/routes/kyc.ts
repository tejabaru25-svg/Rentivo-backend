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
    const { panUrl, aadhaarFrontUrl, aadhaarBackUrl } = req.body;
    const userId = req.user?.id; // from JWT

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!panUrl || !aadhaarFrontUrl || !aadhaarBackUrl) {
      return res.status(400).json({ error: "All KYC documents are required" });
    }

    const kycRecord = await prisma.kYC.upsert({
      where: { userid: userId },
      update: {
        panurl: panUrl,
        aadhaarfronturl: aadhaarFrontUrl,
        aadhaarbackurl: aadhaarBackUrl,
        verified: "pending",
        submittedat: new Date(),
      },
      create: {
        userid: userId,
        panurl: panUrl,
        aadhaarfronturl: aadhaarFrontUrl,
        aadhaarbackurl: aadhaarBackUrl,
        verified: "pending",
        submittedat: new Date(),
      },
    });

    return res.json({ message: "KYC submitted successfully", kyc: kycRecord });
  } catch (err: any) {
    console.error("KYC submit error:", err);
    return res.status(500).json({ error: "KYC failed", details: err.message });
  }
});

export default router;
