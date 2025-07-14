import type { MongoDB } from "../mongodb";
import { Router } from "express";
import { CustomError } from "../utils/error/CustomError";
import { adminAuthenticateToken } from "../middlewares/authenticateToken";

export const adminCouponRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const store = db.collection("stores");
  const coupon = db.collection("coupons");
  const couponIssues = db.collection("couponIssues");
  const router = Router();

  const toArray = (value: any) => {
    const array = Array.isArray(value) && value ? value : [];
    return array;
  };
  return router
    .get(
      "/getCouponsdddd/:storeId/:usableSelect/:visibleSelect/:selectedPageNum/:limitItemNum/:startRangeDate/:endRangeDate/:startItemNum",
      adminAuthenticateToken,
      async (req, res) => {
        const {
          storeId,
          startRangeDate,
          endRangeDate,
          startItemNum,
          limitItemNum,
        } = req.params;
        const { usableSelect, visibleSelect } = req.query;
        try {
          const startDate = new Date(startRangeDate);
          const endDate = new Date(endRangeDate);
          const startItemNumParsed = parseInt(startItemNum);
          const limitItemNumParsed = parseInt(limitItemNum);
          const usableSelectToArr = toArray(usableSelect);
          const visibleSelectToArr = toArray(visibleSelect);

          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          const usableSelectItem = usableSelectToArr.map((item) =>
            JSON.parse(item)
          ) as boolean[];
          const visibleSelectItem = visibleSelectToArr.map((item) =>
            JSON.parse(item)
          ) as boolean[];

          const searchingItemList = await coupon
            .find(
              {
                storeId: storeId,
                isUsable: { $in: usableSelectItem },
                isVisible: { $in: visibleSelectItem },
                modifyDate: {
                  $gte: startDate,
                  $lte: endDate,
                },
              },
              { projection: { _id: 0 } }
            )
            .sort({ modifyDate: -1 })
            .skip(startItemNumParsed)
            .limit(limitItemNumParsed)
            .toArray();

          const searchingAllItemLength = await coupon.countDocuments({
            storeId: storeId,
            isUsable: { $in: usableSelect },
            isVisible: { $in: visibleSelect },
            modifyDate: {
              $gte: startDate,
              $lte: endDate,
            },
          });

          const allItemLength = await coupon.countDocuments({
            storeId: storeId,
          });

          const usableId = await coupon
            .find({
              storeId: storeId,
              isUsable: true,
            })
            .project({ _id: 0, couponId: 1 })
            .toArray();

          const visibleId = await coupon
            .find({
              storeId: storeId,
              isVisible: true,
            })
            .project({ _id: 0, couponId: 1 })
            .toArray();

          if (allItemLength) {
            res.json({
              searchingAllItemLength: searchingAllItemLength,
              searchingItemList: searchingItemList,
              allItemLength: allItemLength,
              usableId: usableId,
              visibleId: visibleId,
            });
          } else {
            res.json({
              searchingAllItemLength: 0,
              searchingItemList: [],
              allItemLength: 0,
              usableId: [],
              visibleId: [],
            });
          }
        } catch (e) {
          if (e instanceof Error) {
            res.status(500).json({ ok: false, error: e.message });
          }
        }
      }
    )
    .get("/getCoupons", adminAuthenticateToken, async (req, res) => {
      try {
        const {
          storeId = "",
          usableSelect = [],
          visibleSelect = [],
          startItemNum = "0",
          limitItemNum = "0",
          startRangeDate = "",
          endRangeDate = "",
        } = req.query;

        const arrUsableSelecteds =
          usableSelect && Array.isArray(usableSelect)
            ? (usableSelect as string[])
            : usableSelect
            ? ([usableSelect] as string[])
            : [];
        const arrVisibleSelecteds =
          visibleSelect && Array.isArray(visibleSelect)
            ? (visibleSelect as string[])
            : visibleSelect
            ? ([visibleSelect] as string[])
            : [];
        const stStoreId = String(storeId);
        const startDate = startRangeDate
          ? new Date(startRangeDate as string)
          : new Date();
        const endDate = endRangeDate
          ? new Date(endRangeDate as string)
          : new Date();

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const usableSelects = arrUsableSelecteds.map((item: string) =>
          JSON.parse(item)
        ) as boolean[];
        const visibleSelects = arrVisibleSelecteds.map((item: string) =>
          JSON.parse(item)
        ) as boolean[];

        const searchingItemList = await coupon
          .find(
            {
              storeId: stStoreId,
              isUsable: { $in: usableSelects },
              isVisible: { $in: visibleSelects },
              modifyDate: {
                $gte: startDate,
                $lte: endDate,
              },
            },
            { projection: { _id: 0 } }
          )
          .sort({ modifyDate: -1 })
          .skip(Number(startItemNum))
          .limit(Number(limitItemNum))
          .toArray();

        const searchingAllItemLength = await coupon.countDocuments({
          storeId: stStoreId,
          isUsable: { $in: usableSelects },
          isVisible: { $in: visibleSelects },
          modifyDate: {
            $gte: startDate,
            $lte: endDate,
          },
        });

        const allItemLength = await coupon.countDocuments({
          storeId: stStoreId,
        });

        const usableId = await coupon
          .find({
            storeId: stStoreId,
            isUsable: true,
          })
          .project({ _id: 0, couponId: 1 })
          .toArray();

        const visibleId = await coupon
          .find({
            storeId: stStoreId,
            isVisible: true,
          })
          .project({ _id: 0, couponId: 1 })
          .toArray();

        if (allItemLength) {
          res.json({
            searchingAllItemLength: searchingAllItemLength,
            searchingItemList: searchingItemList,
            allItemLength: allItemLength,
            usableId: usableId,
            visibleId: visibleId,
          });
        } else {
          res.json({
            searchingAllItemLength: 0,
            searchingItemList: [],
            allItemLength: 0,
            usableId: [],
            visibleId: [],
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .post("/getCouponIssues", adminAuthenticateToken, async (req, res) => {
      try {
        const { purchaseId = "" } = req.query;
        const stPurchaseId = String(purchaseId);
        const exists = await couponIssues
          .find(
            {
              purchaseId: stPurchaseId,
            },
            { projection: { _id: 0 } }
          )
          .toArray();
        if (exists) {
          res.json(exists);
        } else {
          res.json([]);
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .post("/addCoupon", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        //스토어 관리자 정보 존재 여부 체크
        const adminExist = await store.findOne({ storeId: body.storeId });
        const insertCoupon = {
          ...body.coupon,
          registDate: new Date(body.coupon.registDate),
          modifyDate: new Date(body.coupon.modifyDate),
          validFrom: new Date(body.coupon.validFrom),
          validUntil: new Date(body.coupon.validUntil),
        };

        if (adminExist) {
          //쿠폰 사용 가능 상태로 전환 가능 여부 체크 (최대값 이상 지정 불가)
          const usableCount = await coupon.countDocuments({
            storeId: body.storeId,
            isUsable: true,
          });

          if (usableCount < 5 || insertCoupon.isUsable === false) {
            const exist = await coupon.insertOne(insertCoupon);
            if (exist) {
              res.json({ ok: true });
            } else {
              throw new CustomError(
                "쿠폰 정보를 저장할 수 없습니다.",
                "CANNOT_SAVE_COUPON"
              );
            }
          } else {
            res.status(200).json({
              ok: false,
              error: "사용 가능 상태로 등록 가능한 쿠폰 수는 최대 5개입니다.",
            });
          }
        } else {
          res.status(200).json({
            ok: false,
            error: "스토어 관리자 정보를 찾을 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .put("/updateCoupon", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const adminExist = await store.findOne({ storeId: body.storeId });
        const insertCoupon = {
          ...body.coupon,
          registDate: new Date(body.coupon.registDate),
          modifyDate: new Date(body.coupon.modifyDate),
          validFrom: new Date(body.coupon.validFrom),
          validUntil: new Date(body.coupon.validUntil),
        };

        if (adminExist) {
          const usableCount = await coupon.countDocuments({
            storeId: body.storeId,
            isUsable: true,
          });

          //수정하는 쿠폰이 이미 사용 가능 상태로 등록되어 있는지 확인하기 위해 사용 가능 상태의 쿠폰들을 검색
          const usableId = await coupon
            .find({
              storeId: body.storeId,
              isUsable: true,
            })
            .project({ _id: 0, couponId: 1 })
            .toArray();

          const usableIdToString = usableId.map(
            (id) => id.couponId
          ) as string[];

          if (
            usableCount < 5 ||
            insertCoupon.isUsable === false ||
            usableIdToString.includes(String(insertCoupon.couponId))
          ) {
            const exist = await coupon.updateOne(
              { couponId: body.coupon.couponId },
              { $set: insertCoupon }
            );
            if (exist.modifiedCount > 0) {
              res.status(200).json({ ok: true });
            } else {
              throw new CustomError(
                "쿠폰 정보를 저장할 수 없습니다.",
                "CANNOT_SAVE_COUPON"
              );
            }
          } else {
            res.status(200).json({
              ok: false,
              error: "사용 가능 상태로 등록 가능한 쿠폰 수는 최대 5개입니다.",
            });
          }
        } else {
          res.status(200).json({
            ok: false,
            error: "스토어 관리자 정보를 찾을 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .delete("/deleteCoupon", adminAuthenticateToken, async (req, res) => {
      try {
        const { couponId = "" } = req.query;
        const stCouponId = String(couponId);
        const exist = await coupon.deleteOne({
          couponId: stCouponId,
        });
        if (exist.deletedCount > 0) {
          res.json({ ok: true });
        } else {
          throw new CustomError(
            "쿠폰을 삭제하는 중 문제가 발생했습니다.",
            "CANNOT_DELETE_COUPON"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    });
};
