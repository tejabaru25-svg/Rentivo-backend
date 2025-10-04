import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

/**
 * 🔐 Extended Request type with a guaranteed `user` object.
 * We remove the optional `?` so TS knows it's always defined
 * once the middleware runs successfully.
 */
export interface AuthRequest extends Request {
  user: {
    id: string;
    role: string;
    name?: string;
    email?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET as string;

// ⚠️ Warn immediately if missing secret key
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET is not set in environment variables!");
  // In production, you could force-crash to prevent startup:
  // throw new Error("JWT_SECRET missing");
}

/**
 * ✅ JWT Authentication Middleware
 * Checks Authorization header → verifies token → attaches user to req.user
 */
function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Access denied, token missing" });
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Invalid authorization header format" });
  }

  const token = parts[1];

  try {
    // Decode and verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
      id: string;
      role: string;
      name?: string;
      email?: string;
    };

    // Attach decoded data to request object
    req.user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
    };

    // Continue to the next middleware/route
    return next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export default authenticateToken;

