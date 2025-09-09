import express from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

// GET /api/upload/presign?filename=photo.jpg&contentType=image/jpeg
router.get("/presign", async (req, res) => {
  try {
    const filename = String(req.query.filename || "");
    const contentType = String(req.query.contentType || "");

    if (!filename || !contentType) {
      return res.status(400).json({ error: "filename and contentType required" });
    }

    // Make filename safe
    const safeFilename = filename.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    const Key = `uploads/${Date.now()}_${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key,
      ContentType: contentType,
      ACL: "private"
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

    return res.json({ url, key: Key, bucket: process.env.AWS_S3_BUCKET });
  } catch (err) {
    console.error("Presign error:", err);
    return res.status(500).json({ error: "Failed to create presigned URL" });
  }
});

export default router;
