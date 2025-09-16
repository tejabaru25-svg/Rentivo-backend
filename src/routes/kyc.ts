import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Submit KYC
router.post("/", async (req, res) => {
  try {
    const { userid, panurl, aadhaarfronturl, aadhaarbackurl } = req.body;

    const kyc = await prisma.kYC.create({
      data: {
        userid,
        panurl,
        aadhaarfronturl,
        aadhaarbackurl,
        verified: false,
        submittedat: new Date(),
      },
    });

    return res.json(kyc);
  } catch (err: any) {
    console.error("KYC create error:", err);
    return res.status(500).json({ error: "KYC failed", details: err.message });
  }
});

// Get all KYC
router.get("/", async (_req, res) => {
  try {
    const kycs = await prisma.kYC.findMany({ include: { user: true } });
    return res.json(kycs);
  } catch (err: any) {
    console.error("KYC fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch KYC", details: err.message });
  }
});

export default router;
