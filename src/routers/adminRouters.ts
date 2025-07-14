import type { MongoDB } from "../mongodb";
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as U from "../utils";
import { CustomError } from "../utils/error/CustomError";
import type { OperatingHours } from "../types/types";
import { JwtPayload } from "jsonwebtoken";
import { adminAuthenticateToken } from "../middlewares/authenticateToken";

export const adminRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const store = db.collection("stores");
  const operatingHours = db.collection("operatingHours");
  const router = Router();

  return router
    .post("/isIdAvailable", async (req, res) => {
      try {
        const { body } = req;
        const exists = await store.find({ [body.key]: body.adminId }).toArray();

        if (exists.length === 0) {
          res.json({ isIdAvailable: true });
        } else {
          res.json({ isIdAvailable: false });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .post("/signup", async (req, res) => {
      const { body } = req;

      try {
        const {
          storeId,
          storePublicId,
          password,
          storeName,
          name,
          address,
          tel,
          category,
          businessType,
          businessNumber,
          paymentMethod,
          minOrderAmount,
          deliveryFee,
        } = body;
        const hashedPass = await U.hashPasswordP(password);
        const newBody = {
          storeId,
          storePublicId,
          password: hashedPass,
          storeName,
          name,
          address,
          tel,
          category,
          businessType,
          businessNumber,
          paymentMethod,
          minOrderAmount,
          deliveryFee,
          joinDate: new Date(),
          inactive: false,
        };
        const { insertedId } = await store.insertOne(newBody);
        const registered = await store.findOne({ _id: insertedId });
        if (registered) {
          res.json({ ok: true, registeredStoreName: registered.storeName });
        } else {
          throw new CustomError(
            "가맹점 등록중 문제가 발생했습니다.",
            "FAILED_TO_REGISTER_MERCHANT"
          );
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, errMsg: e.message });
      }
    })
    .post("/login", async (req, res) => {
      const { body } = req;

      try {
        const result = await store.findOne(
          { storeId: body.storeId },
          { projection: { _id: 0 } }
        );

        if (result) {
          const isPasswordSame = await U.comparePasswordP(
            body.password,
            result.password
          );
          if (isPasswordSame) {
            const { password, ...rest } = result;

            const payload = {
              storeId: rest.storeId,
              role: "admin",
            };

            const loginToken = await U.jwtSignP(payload, { expiresIn: "1h" });
            const accessToken = await U.jwtSignP(payload, {
              expiresIn: "15m",
            });

            res.cookie("adminLoginToken", loginToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "none",
              path: "/",
              maxAge: 1000 * 60 * 60 * 24 * 7,
            });

            res.json({
              ok: true,
              toLoginInfo: rest,
              accessToken: accessToken,
            });
          } else {
            res.json({
              ok: false,
              errMsg: "비밀번호가 일치하지 않습니다.",
            });
          }
        } else {
          res.json({
            ok: false,
            errMsg: "일치하는 아이디를 찾을 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.json({ ok: false, errMsg: e.message });
        }
      }
    })
    .post("/logout", adminAuthenticateToken, async (req, res) => {
      try {
        const token = req.cookies.adminLoginToken;

        if (!token) {
          throw new CustomError(
            "로그인 토큰을 찾을 수 없습니다.",
            "LOGIN_TOKEN_NOT_FOUND"
          );
        }
        res.cookie("adminLoginToken", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "none",
          path: "/",
          maxAge: 0,
        });

        res.json({
          ok: true,
        });
      } catch (e) {
        if (e instanceof Error) {
          res.json({ ok: false, errMsg: e.message });
        }
      }
    })
    .post("/refreshAdminToken", async (req, res) => {
      try {
        const token = req.cookies.adminLoginToken;
        const decoded = (await U.jwtVerifyP(token)) as JwtPayload;
        const storeId = decoded.storeId;
        const role = decoded.role;

        const result = await store.findOne(
          { storeId: storeId },
          { projection: { _id: 0 } }
        );

        if (result && role === "admin") {
          const { password, ...rest } = result;

          const payload = {
            storeId: rest.storeId,
            role: "admin",
          };

          const loginToken = await U.jwtSignP(payload, { expiresIn: "1h" });
          const accessToken = await U.jwtSignP(payload, {
            expiresIn: "15m",
          });

          res.cookie("adminLoginToken", loginToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            path: "/",
            maxAge: 1000 * 60 * 60 * 24 * 7,
          });

          res.json({
            ok: true,
            toLoginInfo: rest,
            accessToken: accessToken,
          });
        } else {
          res.json({
            ok: false,
            errMsg: "일치하는 아이디를 찾을 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.json({ ok: false, errMsg: e.message });
        }
      }
    })
    .post("/passchk", async (req, res) => {
      const { body } = req;

      try {
        const result = await store.findOne(
          { storeId: body.storeId },
          { projection: { _id: 0 } }
        );

        if (result) {
          const isPasswordSame = await U.comparePasswordP(
            body.password,
            result.password
          );
          res.json({ isAdmin: isPasswordSame });
        } else {
          res.json({
            isAdmin: false,
            errMsg: "일치하는 아이디를 찾을 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.json({ errMsg: e.message });
        }
      }
    })
    .put("/updateAdmin", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const { _id, password, ...restInBody } = body;
        const updated = await store.findOneAndUpdate(
          { storeId: restInBody.storeId },
          { $set: restInBody },
          { returnDocument: "after", upsert: false }
        );

        if (updated) {
          const { _id, ...rest } = updated;

          const payload = {
            storeId: rest.storeId,
            role: "admin",
          };

          const loginToken = await U.jwtSignP(payload, { expiresIn: "1h" });
          const accessToken = await U.jwtSignP(payload, {
            expiresIn: "15m",
          });

          res.cookie("adminLoginToken", loginToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            path: "/",
            maxAge: 1000 * 60 * 60 * 24 * 7,
          });

          res.json({
            ok: true,
            toUpdateInfo: rest,
            accessToken: accessToken,
          });
        } else {
          throw new CustomError(
            "스토어 정보 수정중 문제가 발생했습니다.",
            "AN_ERROR_OCCURRED_WHILE_UPDATING_STORE_INFORMATION"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, errMsg: e.message });
        }
      }
    })
    .put("/updateOPHours", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const bulkOps = body.operatingHours.map((doc: OperatingHours) => ({
          updateOne: {
            filter: { storeId: body.storeId, day: doc.day },
            update: { $set: { ...doc, storeId: body.storeId } },
            upsert: true,
          },
        }));

        const updateResult = await operatingHours.bulkWrite(bulkOps);

        if (updateResult) {
          const updatedOPHours = await operatingHours
            .find(
              { storeId: body.storeId },
              { projection: { _id: 0, storeId: 0 } }
            )
            .toArray();

          if (updatedOPHours) {
            res.json({ ok: true, operatingHours: updatedOPHours });
          } else {
            res.json({
              ok: false,
              errMsg: "영업시간 수정중 문제가 발생했습니다.",
            });
          }
        } else {
          throw new CustomError(
            "영업시간 수정중 문제가 발생했습니다.",
            "FAILED_TO_UPDATE_BUSINESS_HOURS"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, errMsg: e.message });
        }
      }
    });
};
