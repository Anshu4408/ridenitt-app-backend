import { NextFunction, Request, Response } from "express";
import { createAccessToken, verifyAccessToken, verifyRefreshToken } from '../services/auth.service';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const accessToken = req.cookies["access-token"] || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : undefined) || req.headers["x-access-token"];
  const refreshToken = req.cookies["refresh-token"] || req.headers["x-refresh-token"];

  if (!accessToken || !refreshToken) {
    res.status(401).json({
      error: "Please login.",
      data: null
    });

    return;
  }

  let payload = await verifyAccessToken(accessToken as string);
  
  if (!payload) {
    payload = await verifyRefreshToken(refreshToken as string);

    if (!payload) {
      res.status(401).json({
        error: "Please login",
        data: null
      });

      return;
    }

    const newAccessToken = await createAccessToken(payload.userId);

    res.setHeader("x-new-access-token", newAccessToken);

    res.cookie("access-token", newAccessToken, {
      httpOnly: false,
      secure: false, // Always false for local
      sameSite: "lax", // Lax for local
      expires: new Date(Date.now() + 1000 * 60 * 60)
    });
  }

  req.userId = payload.userId;

  next();
};