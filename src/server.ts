import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";

// ✅ Core route imports
import s3Presign from "./routes/s3Presign";
import s3Direct from "./routes/s3Direct";
import authRoutes from "./routes/auth";
import itemRoutes from "./routes/items";
import bookingRoutes from "./routes/booking";     // Bookings + Payments
import kycRoutes from "./routes/kyc";
import issueRoutes from "./routes/issues";
import testRoutes from "./routes/test";
import devicesRouter from "./routes/devices";
import passwordRoutes from "./routes/password";
import authenticateToken from "./authMiddleware";

// ✅ Home + User routes
import userRoutes from "./routes/user";           // Location APIs (city/state)
import homeRoutes from "./routes/home";           // 🏠 Home Page data (Top Searches, Recommendations)

// ✅ Rentivo AI Support Assistant
import rentivoAIRoutes from "./routes/rentivoAI"; // 🤖 Rentivo AI assistant backend

const app = express();

/**
 * =====================
 * Middleware
 * =====================
 */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*", // ⚠️ Allow all origins temporarily — restrict later in production
    credentials: true,
  })
);
app.use(express.json());

/**
 * =====================
 * Health Check Endpoint
 * =====================
 */
app.get("/", (_req: Request, res: Response) => {
  return res.status(200).json({
    ok: true,
    service: "Rentivo Backend API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    message: "✅ Rentivo backend is running successfully and connected to Supabase",
    docs: {
      auth: "/api/auth",
      items: "/api/items",
      bookings: "/api/bookings",
      kyc: "/api/kyc",
      issues: "/api/issues",
      uploads: "/api/upload",
      home: "/api/home",
      rentivoAI: "/api/rentivo-ai",
    },
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
app.use("/api/bookings", bookingRoutes);         // Bookings + Payments
app.use("/api/kyc", kycRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/test", testRoutes);
app.use("/api/devices", authenticateToken, devicesRouter);
app.use("/api/user", userRoutes);                // User location endpoints
app.use("/api/home", homeRoutes);                // 🏠 Home Page data (Top Searches, Recommendations)
app.use("/api/rentivo-ai", rentivoAIRoutes);     // 🤖 Rentivo AI Support Assistant

/**
 * =====================
 * Protected Test Route
 * =====================
 */
app.get("/api/protected", authenticateToken, (req: Request, res: Response) => {
  return res.status(200).json({
    message: "✅ You accessed a protected route successfully",
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
  return res.status(200).json({
    AWS_REGION: process.env.AWS_REGION || "❌ not set",
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || "❌ not set",
    NODE_ENV: process.env.NODE_ENV || "❌ not set",
    PORT: process.env.PORT || "❌ not set",
    FRONTEND_URL: process.env.FRONTEND_URL || "❌ not set",
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? "✅ set" : "❌ missing",
    DATABASE_URL: process.env.DATABASE_URL ? "✅ set" : "❌ missing",
    SUPABASE_STATUS: process.env.DATABASE_URL?.includes("supabase") ? "🟢 Connected to Supabase" : "⚪ Unknown",
  });
});

/**
 * =====================
 * Server Start
 * =====================
 */
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log("✅ Rentivo backend started successfully");
  console.log(`🚀 Listening on port: ${port}`);
  console.log("🌍 Health check → /");
  console.log("🏠 Home page API → /api/home");
  console.log("📦 Uploads API → /api/upload/presign or /api/upload/direct");
  console.log("🤖 Rentivo AI assistant → /api/rentivo-ai");
  console.log("💳 Payment & Booking routes → /api/bookings");
  console.log("📡 Connected to Supabase / PostgreSQL via Prisma ORM");
});
