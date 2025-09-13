import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import s3Presign from "./routes/s3Presign";
import s3Direct from "./routes/s3Direct";
import authRoutes from "./routes/auth";
import itemRoutes from "./routes/items";
import bookingRoutes from "./routes/bookings";
import paymentRoutes from "./routes/payments";
import kycRoutes from "./routes/kyc";
import issueRoutes from "./routes/issues";
import { authenticateToken } from "./authMiddleware";

const app = express();

app.use(cors()); // enable CORS (later restrict to frontend domain)
app.use(express.json());

// Health check / root endpoint
app.get("/", (_req, res) => res.json({ ok: true, version: "1.0" }));

// Auth routes
app.use("/api/auth", authRoutes);

// Item routes
app.use("/api/items", itemRoutes);

// Booking, Payment, KYC, Issues routes
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/issues", issueRoutes);

// Protected test route
app.get("/api/protected", authenticateToken, (req, res) => {
  return res.json({
    message: "You accessed a protected route!",
    user: (req as any).user,
  });
});

// S3 routes
app.use("/api/upload", s3Presign);
app.use("/api/upload", s3Direct);

// Debug endpoint (temporary)
app.get("/debug/env", (_req, res) => {
  return res.json({
    AWS_REGION: process.env.AWS_REGION || null,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || null,
  });
});

// ✅ FIX: Ensure Render detects the correct port
const port = Number(process.env.PORT) || 4000;

console.log("⚡ Preparing to start Rentivo backend...");

app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Rentivo backend listening on port: ${port}`);
});
