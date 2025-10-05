import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";

// ✅ Core route imports
import s3Presign from "./routes/s3Presign";
import s3Direct from "./routes/s3Direct";
import authRoutes from "./routes/auth";
import itemRoutes from "./routes/items";
import bookingRoutes from "./routes/booking";     // bookings + payments
import kycRoutes from "./routes/kyc";
import issueRoutes from "./routes/issues";
import testRoutes from "./routes/test";
import devicesRouter from "./routes/devices";
import passwordRoutes from "./routes/password";
import authenticateToken from "./authMiddleware";

// ✅ Home + User routes
import userRoutes from "./routes/user";           // location API (city/state)
import homeRoutes from "./routes/home";           // 🏠 Home Page API (top searches, recommendations)

// ✅ NEW: Rentivo AI Support Assistant
import rentivoAIRoutes from "./routes/rentivoAI"; // 🤖 Rentivo AI assistant backend

const app = express();

/**
 * =====================
 * Middleware
 * =====================
 */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*", // ⚠️ Allow all for now — restrict in production
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
  return res.json({
    ok: true,
    service: "Rentivo Backend",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * =====================
 * API Routes
 * =====================
 */
app.use("/api/auth", authRoutes);
app.use("/api/auth", passwordRoutes);            // Forgot/reset password
app.use("/api/items", itemRoutes);
app.use("/api/bookings", bookingRoutes);         // Bookings + payments
app.use("/api/kyc", kycRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/test", testRoutes);
app.use("/api/devices", authenticateToken, devicesRouter);
app.use("/api/user", userRoutes);                // User location endpoints
app.use("/api/home", homeRoutes);                // 🏠 Home page data (top searches, recommendations)
app.use("/api/rentivo-ai", rentivoAIRoutes);     // 🤖 Rentivo AI Assistant API

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
 * Upload Routes (AWS S3)
 * =====================
 */
app.use("/api/upload", s3Presign);
app.use("/api/upload", s3Direct);

/**
 * =====================
 * Debug Environment Info
 * =====================
 */
app.get("/debug/env", (_req: Request, res: Response) => {
  return res.json({
    AWS_REGION: process.env.AWS_REGION || null,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || null,
    NODE_ENV: process.env.NODE_ENV || "not set",
    PORT: process.env.PORT || "not set",
    FRONTEND_URL: process.env.FRONTEND_URL || "not set",
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? "✅ set" : "❌ missing",
    DATABASE_URL: process.env.DATABASE_URL ? "✅ set" : "❌ missing",
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
  console.log("🏠 Home API available at /api/home");
  console.log("🤖 Rentivo AI available at /api/rentivo-ai");
  console.log("📦 Supabase/Postgres connected via Prisma ORM");
});
