import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import s3Presign from "./routes/s3Presign";
import s3Direct from "./routes/s3Direct"; // ✅ new import

const app = express();

app.use(cors());            // enable CORS (later restrict to frontend domain)
app.use(express.json());

// Health check / root endpoint
app.get("/", (_req, res) => res.json({ ok: true, version: "1.0" }));

// Debug endpoint (temporary) - returns non-secret env info
app.get("/debug/env", (_req, res) => {
  return res.json({
    AWS_REGION: process.env.AWS_REGION || null,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || null
  });
});

// S3 presign route
app.use("/api/upload", s3Presign);

// S3 direct upload route ✅
app.use("/api/upload", s3Direct);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Rentivo backend listening on ${port}`);
});
