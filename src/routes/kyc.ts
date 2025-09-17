import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../authMiddleware";
import authMiddleware from "../authMiddleware";

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/kyc/submit
 * User submits KYC (PAN + Aadhaar).
 */
router.post("/submit", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { panUrl, aadhaarFrontUrl, aadhaarBackUrl } = req.body;
    const userId = req.user.id; // from JWT

    if (!panUrl || !aadhaarFrontUrl || !aadhaarBackUrl) {
      return res.status(400).json({ error: "All KYC documents are required" });
    }

    const kycRecord = await prisma.kyc.create({
      data: {
        userid: userId,
        panurl: panUrl,
        aadhaarfronturl: aadhaarFrontUrl,
        aadhaarbackurl: aadhaarBackUrl,
        verified: "pending", // default status
        submittedat: new Date(),
        createdat: new Date(),
      },
    });

    return res.json({ message: "KYC submitted successfully", kyc: kycRecord });
  } catch (err: any) {
    console.error("KYC create error:", err);
    return res.status(500).json({ error: "KYC failed", details: err.message });
  }
});

/**
 * GET /api/kyc/status
 * User checks their own KYC status
 */
router.get("/status", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const kyc = await prisma.kyc.findFirst({
      where: { userid: userId },
      orderBy: { submittedat: "desc" }, // in case user submitted multiple times
    });

    if (!kyc) {
      return res.status(404).json({ message: "No KYC found for this user" });
    }

    return res.json({
      status: kyc.verified,
      panUrl: kyc.panurl,
      aadhaarFrontUrl: kyc.aadhaarfronturl,
      aadhaarBackUrl: kyc.aadhaarbackurl,
      submittedAt: kyc.submittedat,
    });
  } catch (err: any) {
    console.error("KYC status error:", err);
    return res.status(500).json({ error: "Failed to fetch KYC status", details: err.message });
  }
});

/**
 * GET /api/kyc/
 * Admin fetch all KYC records
 */
router.get("/", async (_req, res) => {
  try {
    const kycs = await prisma.kyc.findMany({
      include: { user: true },
    });
    return res.json(kycs);
  } catch (err: any) {
    console.error("KYC fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch KYC", details: err.message });
  }
});

export default router;
