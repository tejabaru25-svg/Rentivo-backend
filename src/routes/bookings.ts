import { Router } from "express";
import prisma from "../prismaClient";
import { authenticateToken } from "../authMiddleware";

const router = Router();

function getModelAndFields(modelName: string) {
  const dmmf = (prisma as any)._dmmf;
  if (!dmmf) return { clientKey: null, fields: [] as string[] };
  // find model in DMMF (case-insensitive)
  const modelEntry = Object.values(dmmf.modelMap || {}).find(
    (m: any) => String(m.name).toLowerCase() === modelName.toLowerCase()
  );
  const fields = modelEntry?.fields?.map((f: any) => f.name) || [];
  // find prisma client key for this model (case-insensitive)
  const clientKey = Object.keys(prisma).find((k) => k.toLowerCase() === modelName.toLowerCase());
  return { clientKey, fields };
}

router.post("/", authenticateToken, async (req, res) => {
  try {
    // accept many variants from client
    const body = req.body || {};
    const listingCandidates = [body.listingId, body.listing_id, body.listing];
    const renterCandidates = [body.renterId, body.renter_id, body.renter];
    const startCandidates = [body.startDate, body.start_date, body.start];
    const endCandidates = [body.endDate, body.end_date, body.end];
    const totalCandidates = [body.totalPrice, body.total_price, body.total];

    const { clientKey, fields } = getModelAndFields("Booking");
    if (!clientKey) return res.status(500).json({ error: "Booking model not found in Prisma DMMF" });

    // helper: pick first available value
    const pickVal = (cands: any[]) => cands.find((v) => v !== undefined && v !== null);

    const data: any = {};

    // find appropriate field names in schema
    const listingField = ["listingId", "listing_id", "listing"].find((n) => fields.includes(n));
    const renterField = ["renterId", "renter_id", "renter"].find((n) => fields.includes(n));
    const startField = ["startDate", "start_date", "start"].find((n) => fields.includes(n));
    const endField = ["endDate", "end_date", "end"].find((n) => fields.includes(n));
    const totalField = ["totalPrice", "total_price", "total"].find((n) => fields.includes(n));
    // Map values
    if (listingField) data[listingField] = pickVal(listingCandidates);
    if (renterField) data[renterField] = pickVal(renterCandidates);
    if (startField) {
      const s = pickVal(startCandidates);
      data[startField] = s ? new Date(s) : undefined;
    }
    if (endField) {
      const e = pickVal(endCandidates);
      data[endField] = e ? new Date(e) : undefined;
    }
    if (totalField) data[totalField] = pickVal(totalCandidates);

    // don't force status — let DB default handle it (avoids enum mismatch)
    // create via dynamic prisma model
    const created = await (prisma as any)[clientKey].create({ data } as any);
    return res.json({ message: "Booking created successfully", bookingId: created.id });
  } catch (err: any) {
    console.error("booking create error:", err);
    return res.status(500).json({ error: "Failed to create booking", detail: String(err?.message || err) });
  }
});

export default router;
