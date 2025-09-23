import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// ✅ Extend Request type to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    name?: string;
    email?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET is not set in environment variables!");
  // In production, fail fast:
  // throw new Error("JWT_SECRET missing");
}

/**
 * Middleware to authenticate JWT tokens
 */
function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Access denied, token missing" });
  }

  // ✅ Must be "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Invalid auth header format" });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
      id: string;
      role: string;
      name?: string;
      email?: string;
    };

    // ✅ Attach decoded payload to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
    };

    return next();
  } catch (err) {
    console.error("JWT verify failed:", err);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export default authenticateToken;
