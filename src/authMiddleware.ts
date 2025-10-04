import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

/**
 * 🔐 Authenticated Request interface
 * (We’ll use this for strong typing in protected routes)
 */
export interface AuthRequest extends Request {
  user: {
    id: string;
    role: string;
    name?: string;
    email?: string;
  };
}

// ✅ JWT secret
const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET is not set in environment variables!");
  // throw new Error("JWT_SECRET missing");
}

/**
 * ✅ Authentication Middleware
 * Checks Authorization header, verifies JWT,
 * attaches decoded payload to req.user, then calls next().
 */
const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    res.status(401).json({ error: "Access denied, token missing" });
    return;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({ error: "Invalid authorization header format" });
    return;
  }

  const token = parts[1];

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
      id: string;
      role: string;
      name?: string;
      email?: string;
    };

    // Attach decoded data to request object
    (req as AuthRequest).user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
    };

    // Continue to next middleware or route handler
    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err);
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

export default authenticateToken;


