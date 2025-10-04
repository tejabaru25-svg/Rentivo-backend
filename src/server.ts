import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";

import s3Presign from "./routes/s3Presign";
import s3Direct from "./routes/s3Direct";
import authRoutes from "./routes/auth";
import itemRoutes from "./routes/items";
import bookingRoutes from "./routes/booking";    // ✅ includes both bookings + payments
import kycRoutes from "./routes/kyc";
import issueRoutes from "./routes/issues";
import testRoutes from "./routes/test";
import devicesRouter from "./routes/devices";
import passwordRoutes from "./routes/password";
import authenticateToken from "./authMiddleware";

// 🟢 NEW: Home page backend routes
import userRoutes from "./routes/user";          // ✅ location APIs
// (later we’ll add notifications.ts and search.ts)

const app = express();

/**
 * =====================
 * Middleware
 * =====================
 */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*", // allow all for now
    credentials: true,
  })
);
app.use(express.json());

/**
 * =====================
 * Health Check
 * =====================
 */
app.get("/", (_req: Request, res: Response) => {
  return res.json({ ok: true, version: "1.0" });
});

/**
 * =====================
 * API Routes
 * =====================
 */
app.use("/api/auth", authRoutes);
app.use("/api/auth", passwordRoutes);        // ✅ forgot/reset password
app.use("/api/items", itemRoutes);
app.use("/api/bookings", bookingRoutes);     // ✅ bookings + payments
app.use("/api/kyc", kycRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/test", testRoutes);
app.use("/api/devices", authenticateToken, devicesRouter);
app.use("/api/user", userRoutes);            // ✅ location APIs

/**
 * =====================
 * Protected Test Route
 * =====================
 */
app.get("/api/protected", authenticateToken, (req: Request, res: Response) => {
  return res.json({
    message: "You accessed a protected route!",
    user: (req as any).user,
  });
});

/**
 * =====================
 * Upload Routes
 * =====================
 */
app.use("/api/upload", s3Presign);
app.use("/api/upload", s3Direct);

/**
 * =====================
 * Debug Info
 * =====================
 */
app.get("/debug/env", (_req: Request, res: Response) => {
  return res.json({
    AWS_REGION: process.env.AWS_REGION || null,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || null,
    NODE_ENV: process.env.NODE_ENV || "not set",
    PORT: process.env.PORT || "not set",
    FRONTEND_URL: process.env.FRONTEND_URL || "not set",
  });
});

/**
 * =====================
 * Start Server
 * =====================
 */
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log("✅ Rentivo backend started successfully");
  console.log(`🚀 Listening on port: ${port}`);
  console.log("🌍 Health check available at /");
});


