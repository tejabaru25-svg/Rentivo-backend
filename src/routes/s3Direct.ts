import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();
const upload = multer(); // handles multipart/form-data

const s3 = new S3Client({
  region: (process.env.AWS_REGION || "").trim(),
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || "").trim()
  }
});

// POST /api/upload/direct
router.post("/direct", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const Key = `uploads/${Date.now()}_${req.file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: (process.env.AWS_S3_BUCKET || "").trim(),
      Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "private"
    });

    await s3.send(command);

    return res.json({
      message: "Upload OK",
      key: Key,
      bucket: process.env.AWS_S3_BUCKET
    });
  } catch (err) {
    console.error("Direct upload error:", err);
    return res.status(500).json({ error: "Direct upload failed" });
  }
});

export default router;
