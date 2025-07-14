import type { MongoDB } from "../mongodb";
import { Router } from "express";
import * as U from "../utils";
import { superAdminAuthenticateToken } from "../middlewares/authenticateToken";

export const superAdminRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const appManager = db.collection("appManagers");
  const purchase = db.collection("purchases");
  const store = db.collection("stores");
  const customer = db.collection("customers");
  const router = Router();

  return router
    .post("/login", async (req, res) => {
      const { body } = req;
      console.log(body.sAdminId);
      console.log(body.password);

      try {
        const result = await appManager.findOne(
          { sAdminId: body.sAdminId },
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
              sAdminId: rest.sAdminId,
              role: "superAdmin",
            };

            const accessToken = await U.jwtSignP(payload, { expiresIn: "15m" });

            res.json({
              ok: true,
              toLoginInfo: { sAdminId: rest.sAdminId },
              accessToken: accessToken,
            });
          } else {
            res.json({
              ok: false,
              errMsg: "잘못된 값입니다.",
            });
          }
        } else {
          res.json({
            ok: false,
            errMsg: "잘못된 값입니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          console.log("error : ", e.message);
          res.json({ ok: false, errorMessage: e.message });
        }
      }
    })
    .get("/getPurchaseList", superAdminAuthenticateToken, async (req, res) => {
      try {
        const { limitItemNum = "0", startItemNum = "0" } = req.query;

        //패키지 아이디 기준으로 그룹화해서 반환
        //그룹으로 묶은후 정렬을 위해 임의의 latestDate라는 필드를 만들어서 각 그룹의 첫번째 date 값을 주게함
        const exists = await purchase
          .aggregate([
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

        const searchingAllPk = await purchase
          .aggregate([
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

        const purchaseLength = searchingAllPk
          ? searchingAllPk[0].uniquePackageCount
          : 0;

        if (exists) {
          console.log("startItemNum : ", startItemNum);
          console.log("limitItemNum : ", limitItemNum);
          res.json({
            searchingList: exists,
            allSearchinhgLength: purchaseLength,
          });
        } else {
          res.json({
            searchingList: [],
            allSearchinhgLength: 0,
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getStoreList", superAdminAuthenticateToken, async (req, res) => {
      try {
        const { limitItemNum = "0", startItemNum = "0" } = req.query;

        const exists = await store
          .find({})
          .sort({ joinDate: -1 })
          .skip(Number(startItemNum))
          .limit(Number(limitItemNum))
          .toArray();

        const searchingAllPk = await store.countDocuments();

        if (exists) {
          res.json({
            searchingList: exists,
            allSearchinhgLength: searchingAllPk ?? 0,
          });
        } else {
          res.json({
            searchingList: [],
            allSearchinhgLength: 0,
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getCustomerList", superAdminAuthenticateToken, async (req, res) => {
      try {
        const { limitItemNum = "0", startItemNum = "0" } = req.query;

        const exists = await customer
          .find({})
          .sort({ joinDate: -1 })
          .skip(Number(startItemNum))
          .limit(Number(limitItemNum))
          .toArray();

        const searchingAllPk = await customer.countDocuments();

        if (exists) {
          res.json({
            searchingList: exists,
            allSearchinhgLength: searchingAllPk ?? 0,
          });
        } else {
          res.json({
            searchingList: [],
            allSearchinhgLength: 0,
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    });
};
