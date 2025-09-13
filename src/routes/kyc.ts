import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { user_id, document_type, document_url } = req.body;

    const kyc = await prisma.kyc.create({
      data: {
        user_id,
        document_type,
        document_url,
        status: "pending",
      },
    });

    return res.json({ message: "KYC submitted successfully", kycId: kyc.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to upload KYC" });
  }
});

export default router;
