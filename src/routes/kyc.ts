import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken, { AuthRequest } from "../authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ===========================
 * POST /api/kyc/submit
 * User submits KYC documents
 * ===========================
 */
router.post("/submit", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    if (!authReq.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { panurl, aadhaarfronturl, aadhaarbackurl } = authReq.body;
    const userid = authReq.user.id;

    if (!panurl || !aadhaarfronturl || !aadhaarbackurl) {
      return res.status(400).json({ error: "All KYC documents are required" });
    }

    // ✅ Upsert ensures we either create or update the user's KYC entry
    const kycRecord = await prisma.kYC.upsert({
      where: { userid },
      update: {
        panurl,
        aadhaarfronturl,
        aadhaarbackurl,
        verified: "pending",
        submittedAt: new Date(),
      },
      create: {
        userid,
        panurl,
        aadhaarfronturl,
        aadhaarbackurl,
        verified: "pending",
        submittedAt: new Date(),
      },
    });

    return res.json({
      message: "KYC submitted successfully",
      kyc: kycRecord,
    });
  } catch (err: any) {
    console.error("KYC submit error:", err);
    return res.status(500).json({
      error: "KYC submission failed",
      details: err.message,
    });
  }
});

/**
 * ===========================
 * GET /api/kyc/status
 * Fetch user's KYC status
 * ===========================
 */
router.get("/status", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    if (!authReq.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userid = authReq.user.id;
    const kyc = await prisma.kYC.findUnique({ where: { userid } });

    if (!kyc) {
      return res.status(404).json({ error: "KYC record not found" });
    }

    return res.json({ message: "KYC status fetched", kyc });
  } catch (err: any) {
    console.error("KYC status fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch KYC status",
      details: err.message,
    });
  }
});

export default router;

