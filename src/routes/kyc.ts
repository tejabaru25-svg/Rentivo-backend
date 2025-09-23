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
        createdat: new Date(),
      },
    });

    return res.json({ message: "KYC submitted successfully", kyc: kycRecord });
  } catch (err: any) {
    console.error("KYC submit error:", err);
    return res.status(500).json({ error: "KYC failed", details: err.message });
  }
});

/**
 * GET /api/kyc/status
 * User checks their own KYC status
 */
router.get("/status", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const kyc = await prisma.kYC.findFirst({
      where: { userid: userId },
      orderBy: { submittedat: "desc" },
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
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const kycs = await prisma.kYC.findMany({
      include: { user: true },
    });
    return res.json(kycs);
  } catch (err: any) {
    console.error("KYC fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch KYC", details: err.message });
  }
});

/**
 * POST /api/kyc/review
 * Admin approves or rejects a KYC submission
 */
router.post("/review", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const { userid, status } = req.body;

    if (!userid || !status) {
      return res.status(400).json({ error: "userid and status are required" });
    }

    if (!["approved", "rejected"].includes(status.toLowerCase())) {
      return res.status(400).json({ error: "Invalid status. Use 'approved' or 'rejected'" });
    }

    const updatedKyc = await prisma.kYC.update({
      where: { userid },
      data: { verified: status.toLowerCase() },
    });

    return res.json({
      message: `KYC ${status} successfully`,
      kyc: updatedKyc,
    });
  } catch (err: any) {
    console.error("KYC review error:", err);
    return res.status(500).json({ error: "Failed to review KYC", details: err.message });
  }
});

export default router;
