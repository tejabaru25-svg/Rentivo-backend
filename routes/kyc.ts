import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware, { AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Submit KYC
router.post("/submit", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { panUrl, aadhaarFrontUrl, aadhaarBackUrl } = req.body;
    const userId = req.user.id; // from JWT middleware

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
  } catch (error) {
    console.error("KYC Submit Error:", error);
    return res.status(500).json({ error: "Failed to submit KYC" });
  }
});

export default router;
