import type { MongoDB } from "../mongodb";
import { stringToObjectId } from "../mongodb";
import { Router } from "express";
import * as U from "../utils";
import { CustomError } from "../utils/error/CustomError";
import { JwtPayload } from "jsonwebtoken";
import { customerAuthenticateToken } from "../middlewares/authenticateToken";

export const authRouters = (...args: any[]) => {
  const db: MongoDB = args[0];
  const customer = db.collection("customers");
  const router = Router();

  return router
    .post("/isIdAvailable", async (req, res) => {
      try {
        const { body } = req;
        const exists = await customer
          .find({ customerId: body.customerId })
          .toArray();

        if (exists.length === 0) {
          res.json({ ok: true });
        } else {
          res.json({ ok: false });
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
        const { customerId, password, name, email, tel, address, prefer } =
          body;
        const hashedPass = await U.hashPasswordP(password);
        const newBody = {
          customerId,
          password: hashedPass,
          name,
          email,
          tel,
          address,
          prefer,
          joinDate: new Date(),
          inactive: false,
        };
        const { insertedId } = await customer.insertOne(newBody);
        const registered = await customer.findOne({ _id: insertedId });
        if (registered) {
          res.json({ ok: true, registeredId: registered.customerId });
        } else {
          throw new CustomError(
            "회원가입중 문제가 발생했습니다.",
            "THERE_WAS_A_PROBLEM_SIGNING_UP"
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
        const result = await customer.findOne(
          { customerId: body.customerId },
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
              customerId: rest.customerId,
              role: "customer",
            };

            const loginToken = await U.jwtSignP(payload, { expiresIn: "1h" });
            const accessToken = await U.jwtSignP(payload, { expiresIn: "15m" });

            res.cookie("custLoginToken", loginToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "none",
              path: "/",
              maxAge: 1000 * 60 * 60 * 24 * 7,
            });

            res.json({ ok: true, toLoginInfo: rest, accessToken: accessToken });
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
    .post("/logout", customerAuthenticateToken, async (req, res) => {
      try {
        const token = req.cookies.custLoginToken;

        if (!token) {
          throw new CustomError(
            "로그인 토큰을 찾을 수 없습니다.",
            "LOGIN_TOKEN_NOT_FOUND"
          );
        }
        res.cookie("custLoginToken", "", {
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
    .post("/refreshCustToken", async (req, res) => {
      try {
        const token = req.cookies.custLoginToken;
        const decoded = (await U.jwtVerifyP(token)) as JwtPayload;
        const customerId = decoded.customerId;
        const role = decoded.role;

        const result = await customer.findOne(
          { customerId: customerId },
          { projection: { _id: 0 } }
        );

        if (result && role === "customer") {
          const { password, ...rest } = result;

          const payload = {
            customerId: rest.customerId,
            role: "customer",
          };

          const loginToken = await U.jwtSignP(payload, { expiresIn: "1h" });
          const accessToken = await U.jwtSignP(payload, { expiresIn: "15m" });

          res.cookie("custLoginToken", loginToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            path: "/",
            maxAge: 1000 * 60 * 60 * 24 * 7,
          });

          res.json({ ok: true, toLoginInfo: rest, accessToken: accessToken });
        } else {
          res.json({
            ok: false,
            errMsg: "회원 정보를 찾을 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.json({ ok: false, errMsg: e.message });
        }
      }
    })

    .put("/updateCustomer", customerAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const { _id, password, ...restInBody } = body;
        const updated = await customer.findOneAndUpdate(
          { customerId: restInBody.customerId },
          { $set: restInBody },
          { returnDocument: "after", upsert: false }
        );

        if (updated) {
          const { _id, ...rest } = updated;

          const payload = {
            customerId: rest.customerId,
            role: "customer",
          };

          const loginToken = await U.jwtSignP(payload, { expiresIn: "1h" });
          const accessToken = await U.jwtSignP(payload, { expiresIn: "15m" });

          res.cookie("custLoginToken", loginToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            path: "/",
            maxAge: 1000 * 60 * 60 * 24 * 7,
          });

          res.json({ ok: true, toUpdateInfo: rest, accessToken: accessToken });
        } else {
          throw new CustomError(
            "회원 정보 수정중 문제가 발생했습니다.",
            "AN_ERROR_OCCURRED_WHILE_UPDATING_MEMBER_INFORMATION"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, errMsg: e.message });
        }
      }
    })
    .post("/passchk", async (req, res) => {
      const { body } = req;

      try {
        const result = await customer.findOne(
          { customerId: body.customerId },
          { projection: { _id: 0 } }
        );

        if (result) {
          const isPasswordSame = await U.comparePasswordP(
            body.password,
            result.password
          );
          res.json({ isCustomer: isPasswordSame });
        } else {
          res.json({
            isCustomer: false,
            errMsg: "일치하는 아이디를 찾을 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.json({ errMsg: e.message });
        }
      }
    });
};
