import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";

import s3Presign from "./routes/s3Presign";
import s3Direct from "./routes/s3Direct";
import authRoutes from "./routes/auth";
import itemRoutes from "./routes/items";
import bookingRoutes from "./routes/booking";  // ✅ merged bookings + payments
import kycRoutes from "./routes/kyc";          // ✅ KYC routes
import issueRoutes from "./routes/issues";     // ✅ Issue routes
import testRoutes from "./routes/test";        // ✅ Test email + SMS routes
import { authenticateToken } from "./authMiddleware";

const app = express();

// -------------------
// Middleware
// -------------------
app.use(cors()); // TODO: restrict to frontend domain later
app.use(express.json());

// -------------------
// Health Check / Root
// -------------------
app.get("/", (_req: Request, res: Response) => {
  return res.json({ ok: true, version: "1.0" });
});

// -------------------
// API Routes
// -------------------
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/bookings", bookingRoutes);   // ✅ now includes booking + payments
app.use("/api/kyc", kycRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/test", testRoutes);

// -------------------
// Protected Test Route
// -------------------
app.get("/api/protected", authenticateToken, (req: Request, res: Response) => {
  return res.json({
    message: "You accessed a protected route!",
    user: (req as any).user,
  });
});

// -------------------
// Upload Routes
// -------------------
app.use("/api/upload", s3Presign);
app.use("/api/upload", s3Direct);

// -------------------
// Debug (non-secret env info)
// -------------------
app.get("/debug/env", (_req: Request, res: Response) => {
  return res.json({
    AWS_REGION: process.env.AWS_REGION || null,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || null,
  });
});

// -------------------
// Start Server
// -------------------
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Rentivo backend listening on port: ${port}`);
});
