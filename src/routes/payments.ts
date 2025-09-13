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
    const bookingCandidates = [body.bookingId, body.booking_id, body.booking];
    const amountCandidates = [body.amount, body.total, body.value];
    const statusCandidate = body.status;

    const { clientKey, fields } = getModelAndFields("Payment");
    if (!clientKey) return res.status(500).json({ error: "Payment model not found in Prisma DMMF" });

    const data: any = {};
    const bookingField = ["bookingId", "booking_id", "booking"].find((n) => fields.includes(n));
    const amountField = ["amount", "total", "value"].find((n) => fields.includes(n));
    const statusField = ["status"].find((n) => fields.includes(n));

    if (bookingField) data[bookingField] = bookingCandidates.find((v) => v !== undefined && v !== null);
    if (amountField) data[amountField] = amountCandidates.find((v) => v !== undefined && v !== null);
    if (statusField && statusCandidate) data[statusField] = statusCandidate;

    const created = await (prisma as any)[clientKey].create({ data } as any);
    return res.json({ message: "Payment recorded successfully", paymentId: created.id });
  } catch (err: any) {
    console.error("payment create error:", err);
    return res.status(500).json({ error: "Failed to record payment", detail: String(err?.message || err) });
  }
});

export default router;

