import type { MongoDB } from "../mongodb";
import { stringToObjectId } from "../mongodb";
import { Router } from "express";
import { CustomError } from "../utils/error/CustomError";
import * as U from "../utils";
import { customerAuthenticateToken } from "../middlewares/authenticateToken";

export const couponRouters = (...args: any[]) => {
  const db: MongoDB = args[0];
  const store = db.collection("stores");
  const coupon = db.collection("coupons");
  const couponIssues = db.collection("couponIssues");
  const router = Router();

  type CouponIssue = {
    couponIssueId: string;
    couponId: string;
    purchaseId?: string;
    storePublicId: string;
    customerId: string;
    used: boolean;
    discountPrice: number;
  };

  return router
    .get("/getCoupons", async (req, res) => {
      try {
        const {
          isUsable = "false",
          isVisible = "false",
          storePublicId = "",
          today = "",
        } = req.query;
        const stStorePublicId = String(storePublicId);
        const toBoolIsUsable = U.toBoolean(isUsable as string);
        const toBoolIsVisble = U.toBoolean(isVisible as string);
        const toDatatoday = today ? new Date(today as string) : null;
        const adminInfo = await store.findOne({
          storePublicId: stStorePublicId,
        });
        if (adminInfo) {
          const exists = await coupon
            .find({
              storeId: adminInfo.storeId,
              isUsable: toBoolIsUsable,
              isVisible: toBoolIsVisble,
              validFrom: { $lte: toDatatoday },
              validUntil: { $gte: toDatatoday },
            })
            .toArray();
          if (exists) {
            res.json(exists);
          } else {
            res.json([]);
          }
        } else {
          res.status(400).json({ error: "스토어 정보를 조회할 수 없습나다." });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getCouponIssues", customerAuthenticateToken, async (req, res) => {
      try {
        const { storePublicId = "", customerId = "" } = req.query;
        const stStorePublicId = String(storePublicId);
        const stCustomerId = String(customerId);
        const searchFilter: any = {
          customerId: stCustomerId,
        };
        if (stStorePublicId !== "") {
          searchFilter.storePublicId = stStorePublicId;
        }
        const exists = await couponIssues
          .find(searchFilter, { projection: { _id: 0 } })
          .toArray();

        if (exists) {
          res.json(exists);
        } else {
          res.json([]);
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json([]);
        }
      }
    })
    .get("/getAllCouponIssues", customerAuthenticateToken, async (req, res) => {
      try {
        const { customerId = "", skip = "0", limit = "0" } = req.query;
        const stCustomerId = String(customerId);
        const exists = await couponIssues
          .find({ customerId: stCustomerId }, { projection: { _id: 0 } })
          .skip(Number(skip))
          .limit(Number(limit))
          .toArray();

        if (exists) {
          res.json(exists);
        } else {
          res.json([]);
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .post(
      "/downloadCouponIssues",
      customerAuthenticateToken,
      async (req, res) => {
        const { body } = req;
        try {
          const coupons: CouponIssue = body;
          const exists = await couponIssues.insertOne(coupons);

          if (exists.insertedId) {
            res.status(200).json("쿠폰 다운로드가 완료되었습니다.");
          } else {
            throw new CustomError(
              "쿠폰을 다운로드 할 수 없습니다.",
              "CANNOT_DOWNLOAD_COUPON"
            );
          }
        } catch (e) {
          if (e instanceof Error) {
            res.status(500).json({ ok: false, error: e.message });
          }
        }
      }
    )
    .put("/updateCouponIssues", customerAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const coupons: CouponIssue[] = body;
        const bulkOps = coupons.map((coupon) => ({
          updateOne: {
            filter: { couponIssueId: coupon.couponIssueId },
            update: { $set: coupon },
            upsert: false,
          },
        }));

        const exists = await couponIssues.bulkWrite(bulkOps);
        if (exists) {
          const restCoupon = await couponIssues
            .find(
              {
                storePublicId: body[0].storePublicId,
                customerId: body[0].customerId,
              },
              { projection: { _id: 0 } }
            )
            .toArray();
          if (restCoupon) {
            res.json(restCoupon);
          } else {
            throw new CustomError(
              "쿠폰 정보를 변경할 수 없습니다.",
              "CANNOT_CHANGE_COUPON_ISSUES"
            );
          }
        } else {
          throw new CustomError(
            "쿠폰 정보를 변경할 수 없습니다.",
            "CANNOT_CHANGE_COUPON_ISSUES"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    });
};
