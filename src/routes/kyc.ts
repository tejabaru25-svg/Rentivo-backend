import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

function getModelAndFields(modelName: string) {
  const dmmf = (prisma as any)._dmmf;
  if (!dmmf) return { clientKey: null, fields: [] as string[] };
  const modelEntry = Object.values(dmmf.modelMap || {}).find(
    (m: any) => String(m.name).toLowerCase() === modelName.toLowerCase()
  );
  const fields = modelEntry?.fields?.map((f: any) => f.name) || [];
  const clientKey = Object.keys(prisma).find((k) => k.toLowerCase() === modelName.toLowerCase());
  return { clientKey, fields };
}

router.post("/", authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    const userCandidates = [body.userId, body.user_id, body.user];
    const docTypeCandidates = [body.documentType, body.document_type, body.documentTypeName];
    const docUrlCandidates = [body.documentUrl, body.document_url, body.document];

    // Note: model could be named KYC or kYC in prisma; we search case-insensitively
    const { clientKey, fields } = getModelAndFields("KYC");
    if (!clientKey) {
      // fallback: try 'Kyc' or 'Kyc' variants
      const { clientKey: ck2, fields: f2 } = getModelAndFields("Kyc");
      if (!ck2) return res.status(500).json({ error: "KYC model not found in Prisma DMMF" });
      (clientKey as any) = ck2;
      (fields as any) = f2;
    }

    const data: any = {};
    const userField = ["userId", "user_id", "user"].find((n) => fields.includes(n));
    const docTypeField = ["documentType", "document_type", "documentTypeName"].find((n) => fields.includes(n));
    const docUrlField = ["documentUrl", "document_url", "document"].find((n) => fields.includes(n));
    const statusField = ["status"].find((n) => fields.includes(n));

    if (userField) data[userField] = userCandidates.find((v) => v !== undefined && v !== null);
    if (docTypeField) data[docTypeField] = docTypeCandidates.find((v) => v !== undefined && v !== null);
    if (docUrlField) data[docUrlField] = docUrlCandidates.find((v) => v !== undefined && v !== null);
    if (statusField) {
      // leave out to use DB default, or set "PENDING" if you must
    }

    const created = await (prisma as any)[Object.keys(prisma).find(k => k.toLowerCase() === "kyc")!].create({ data } as any);
    return res.json({ message: "KYC submitted successfully", kycId: created.id });
  } catch (err: any) {
    console.error("kyc create error:", err);
    return res.status(500).json({ error: "Failed to submit KYC", detail: String(err?.message || err) });
  }
});

export default router;
