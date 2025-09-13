import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

// Submit KYC document
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { userId, documentType, documentUrl } = req.body;

    const kyc = await prisma.kYC.create({
      data: {
        userId,
        documentType,
        documentUrl,
        status: "PENDING", // ✅ enum uppercase
      },
    });

    return res.json({
      message: "KYC submitted successfully",
      kycId: kyc.id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to submit KYC" });
  }
});

export default router;
