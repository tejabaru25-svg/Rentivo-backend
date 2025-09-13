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
    const bookingCandidates = [body.bookingId, body.booking_id, body.booking];
    const descCandidates = [body.description, body.desc];

    const { clientKey, fields } = getModelAndFields("Issue");
    if (!clientKey) return res.status(500).json({ error: "Issue model not found in Prisma DMMF" });

    const data: any = {};
    const userField = ["userId", "user_id", "user"].find((n) => fields.includes(n));
    const bookingField = ["bookingId", "booking_id", "booking"].find((n) => fields.includes(n));
    const descField = ["description", "desc"].find((n) => fields.includes(n));
    const statusField = ["status"].find((n) => fields.includes(n));

    if (userField) data[userField] = userCandidates.find((v) => v !== undefined && v !== null);
    if (bookingField) data[bookingField] = bookingCandidates.find((v) => v !== undefined && v !== null);
    if (descField) data[descField] = descCandidates.find((v) => v !== undefined && v !== null);
    if (statusField) {
      // omit to use DB default if present
    }

    const created = await (prisma as any)[clientKey].create({ data } as any);
    return res.json({ message: "Issue reported successfully", issueId: created.id });
  } catch (err: any) {
    console.error("issue create error:", err);
    return res.status(500).json({ error: "Failed to report issue", detail: String(err?.message || err) });
  }
});

export default router;
