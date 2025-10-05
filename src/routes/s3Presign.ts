import express, { Request, Response } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = express.Router();

/**
 * ============================
 * AWS S3 CLIENT CONFIGURATION
 * ============================
 */
const s3 = new S3Client({
  region: (process.env.AWS_REGION || "").trim(),
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
  },
});

/**
 * ============================
 * POST /api/upload/presign
 * ============================
 * Generates a presigned URL for uploading to S3.
 * The frontend sends: { filename: "photo.jpg", contentType: "image/jpeg" }
 */
router.post("/presign", async (req: Request, res: Response) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res
        .status(400)
        .json({ error: "filename and contentType are required" });
    }

    // 🧩 Clean filename (remove spaces/special chars)
    const safeFilename = String(filename)
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const Key = `uploads/${Date.now()}_${safeFilename}`;

    // ✅ Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: (process.env.AWS_S3_BUCKET || "").trim(),
      Key,
      ContentType: contentType,
      ACL: "private", // restrict public access
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // valid for 1 hour

    return res.json({
      message: "Presigned URL generated successfully",
      url,
      key: Key,
      bucket: process.env.AWS_S3_BUCKET,
    });
  } catch (err: any) {
    console.error("❌ Presign error:", err);
    return res.status(500).json({
      error: "Failed to create presigned URL",
      details: err.message,
    });
  }
});

export default router;

