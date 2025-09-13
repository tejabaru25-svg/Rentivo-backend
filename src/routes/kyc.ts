import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

// Submit KYC documents
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { userId, panUrl, aadhaarFrontUrl, aadhaarBackUrl } = req.body;

    const kyc = await prisma.kYC.create({
      data: {
        userId,
        panUrl,
        aadhaarFrontUrl,
        aadhaarBackUrl,
        verified: false,
        submittedAt: new Date(),
      },
    });

    return res.json({
      message: "KYC submitted successfully",
      kycId: kyc.id,
    });
  } catch (error) {
    console.error("KYC error:", error);
    return res.status(500).json({ error: "Failed to submit KYC" });
  }
});

export default router;
