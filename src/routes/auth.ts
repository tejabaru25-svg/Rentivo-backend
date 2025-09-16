import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"; // ⚠️ Make sure JWT_SECRET is set in Render

// -------------------
// Debug Route (to view all users)
// -------------------
router.get("/debug", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true, 
        createdat: true,   // ✅ lowercase to match schema
        updatedat: true,   // ✅ lowercase to match schema
        isverified: true,  // ✅ lowercase to match schema
        role: true 
      }
    });
    return res.json(users);
  } catch (err: any) {
    console.error("Debug error:", err);
    return res.status(500).json({ error: "Debug failed" });
  }
});

// -------------------
// Signup Route
// -------------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Check if phone already exists
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return res.status(400).json({ error: "Phone number already registered" });
      }
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordhash: hash,  // ✅ match Supabase column
        role: "RENTER",      // ✅ default role since role is String now
      },
    });

    return res.json({ message: "Signup successful", userId: user.id });
  } catch (err: any) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Signup failed", details: err.message });
  }
});

// -------------------
// Login Route
// -------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials (user not found)" });
    }

    // Check password
    const isMatch = await bcrypt
