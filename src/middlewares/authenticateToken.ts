import { Request, Response, NextFunction } from "express";
import { jwtVerifyP } from "../utils";

// 인증 미들웨어
function authenticateTokenFactory<
  T extends string,
  P extends Record<string, string>
>(reqKey: T, payloadKey: keyof P) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const GRACE_PERIOD = 60;
    const authHeader = req.headers["authorization"];
    // "Bearer 토큰값" 형태에서 토큰만 추출
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ o: false });
      return;
    } // 토큰 없으면 Unauthorized

    try {
      const payload = await jwtVerifyP<P>(token);
      const currentTime = Math.floor(Date.now() / 1000); // 현재 시간(초)

      if (!payload[payloadKey]) {
        res.status(403).json({ ok: false });
        return;
      }

      if (payload.exp && Number(payload.exp) <= currentTime + GRACE_PERIOD) {
        // 이미 만료된 경우(실제로 verify가 통과한다면 exp 확인용)
        res.status(401).json({ ok: false, message: "Token expired" });
        return;
      }

      (req as any)[reqKey] = { [payloadKey]: payload[payloadKey] };
      next();
    } catch (error) {
      if (error instanceof Error) {
        console.log("error : ", error.message);
        if (error.message === "jwt expired") {
          res.status(401).json({ ok: false });
        } else {
          res.status(403).json({ ok: false });
          return;
        }
      } else {
        res.status(403).json({ ok: false });
        return;
      }
    }
  };
}

export const customerAuthenticateToken = authenticateTokenFactory(
  "customer",
  "customerId"
);
export const adminAuthenticateToken = authenticateTokenFactory(
  "store",
  "storeId"
);
export const superAdminAuthenticateToken = authenticateTokenFactory(
  "superAdmin",
  "sAdminId"
);
