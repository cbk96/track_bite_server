import type { MongoDB } from "../mongodb";
import { Router } from "express";
import { CustomError } from "../utils/error/CustomError";
import { adminAuthenticateToken } from "../middlewares/authenticateToken";

export const adminPurchaseRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const purchase = db.collection("purchases");
  const router = Router();

  return router
    .get("/getPurchaseList", adminAuthenticateToken, async (req, res) => {
      try {
        const {
          storePublicId = "",
          paymentSelect = [],
          purStatusSelect = [],
          limitItemNum = "0",
          startRangeDate = "",
          endRangeDate = "",
          startItemNum = "0",
        } = req.query;
        const stStorePublicId = String(storePublicId);
        const paymentSelects =
          paymentSelect && Array.isArray(paymentSelect)
            ? (paymentSelect as string[])
            : paymentSelect
            ? ([paymentSelect] as string[])
            : [];
        const purStatusSelects =
          purStatusSelect && Array.isArray(purStatusSelect)
            ? (purStatusSelect as string[])
            : purStatusSelect
            ? ([purStatusSelect] as string[])
            : [];

        const startDate = startRangeDate
          ? new Date(startRangeDate as string)
          : new Date();
        const endDate = endRangeDate
          ? new Date(endRangeDate as string)
          : new Date();

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const startOfToday = new Date();
        const endOfToday = new Date();

        startOfToday.setHours(0, 0, 0, 0);
        endOfToday.setHours(23, 59, 59, 999);

        //패키지 아이디 기준으로 그룹화해서 반환
        //그룹으로 묶은후 정렬을 위해 임의의 latestDate라는 필드를 만들어서 각 그룹의 첫번째 date 값을 주게함
        const exists = await purchase
          .aggregate([
            {
              $match: {
                storePublicId: stStorePublicId,
                date: {
                  $gte: startDate,
                  $lte: endDate,
                },
                paymentMethod: { $in: paymentSelects },
                purStatus: { $in: purStatusSelects },
              },
            },
            { $sort: { date: -1 } }, //그룹으로 묶기전에 날짜 기준으로 정렬
            {
              //그룹화
              $group: {
                _id: "$purchasePackageId",
                latestDate: { $first: "$date" },
                doc: { $first: "$$ROOT" },
              },
            },
            { $sort: { latestDate: -1 } }, //latestDate를 기준으로 그룹 정렬
            { $skip: Number(startItemNum) },
            ...(Number(limitItemNum) > 0
              ? [{ $limit: Number(limitItemNum) }]
              : []),
            {
              $project: {
                _id: 0,
                purchasePackageId: "$_id",
              },
            },
            {
              $lookup: {
                from: "purchases",
                let: { ppId: "$purchasePackageId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$purchasePackageId", "$$ppId"] },
                    },
                  },
                  { $sort: { date: -1 } },
                  { $limit: 1 },
                ],
                as: "docs",
              },
            },
            { $unwind: "$docs" },
            { $replaceRoot: { newRoot: "$docs" } },
          ])
          .toArray();

        const searchingItems = await purchase
          .find({
            storePublicId: stStorePublicId,
            date: {
              $gte: startDate,
              $lte: endDate,
            },
            paymentMethod: { $in: paymentSelects },
            purStatus: { $in: purStatusSelects },
          })
          .toArray();

        const searchingAllPk = await purchase
          .aggregate([
            {
              $match: {
                storePublicId: stStorePublicId,
                date: {
                  $gte: startDate,
                  $lte: endDate,
                },
                paymentMethod: { $in: paymentSelects },
                purStatus: { $in: purStatusSelects },
              },
            },
            {
              $group: {
                _id: "$purchasePackageId",
              },
            },
            {
              $count: "uniquePackageCount",
            },
          ])
          .toArray();

        const todayItem = await purchase
          .aggregate([
            {
              $match: {
                storePublicId: stStorePublicId,
                date: {
                  $gte: startOfToday,
                  $lte: endOfToday,
                },
              },
            },
            {
              $group: {
                _id: "$purchasePackageId",
              },
            },
            {
              $count: "uniquePackageCount",
            },
          ])
          .toArray();

        const searchingAllPkLength = searchingAllPk[0]?.uniquePackageCount ?? 0;

        const todayItemItemCount = todayItem[0]?.uniquePackageCount ?? 0;

        if (exists) {
          console.log("startItemNum : ", startItemNum);
          console.log("limitItemNum : ", limitItemNum);
          res.json({
            searchingPkList: exists,
            searchingItems: searchingItems,
            searchingAllPkLength: searchingAllPkLength,
            todayItemLength: todayItemItemCount,
          });
        } else {
          res.json({
            searchingPkList: [],
            searchingAllList: [],
            todayItemLength: 0,
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .put("/updatePurchase", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const exists = await purchase.updateMany(
          {
            storePublicId: body.storePublicId,
            purchasePackageId: body.purchasePackageId,
          },
          { $set: { purStatus: body.purStatus } }
        );
        if (exists) {
          res.json({ ok: true });
        } else {
          throw new CustomError(
            "주문 상태를 변경할 수 없습니다.",
            "CANNOT_CHANGE_PURCHASE_INFO"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    });
};
