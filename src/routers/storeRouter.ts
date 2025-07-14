import type { MongoDB } from "../mongodb";
import { stringToObjectId } from "../mongodb";
import { Router } from "express";

export const storeRouters = (...args: any[]) => {
  const db: MongoDB = args[0];
  const store = db.collection("stores");
  const operatingHours = db.collection("operatingHours");
  const eventInfo = db.collection("eventInfos");
  const purchase = db.collection("purchases");
  const router = Router();

  return router
    .get("/", async (req, res) => {
      const {
        sigunguCode = "",
        storeName = "",
        category = "",
        skip = "0",
        limit = "0",
      } = req.query;
      const stSigunguCode = String(sigunguCode);
      const stStoreName = String(storeName).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const stCategory = String(category);
      try {
        const filter: any = {
          "address.sigunguCode": {
            $regex: "^" + stSigunguCode.slice(0, 2),
          },
          storeName: { $regex: stStoreName, $options: "i" },
        };

        if (stCategory.trim() !== "empty" && stCategory.trim() !== "") {
          filter.category = stCategory;
        }

        const exists = await store
          .find(filter, { projection: { _id: 0, storeId: 0, password: 0 } })
          .sort({ heroBannerPath: -1, joinDate: -1 }) // <- 핵심 정렬
          .skip(Number(skip))
          .limit(Number(limit))
          .toArray();

        if (exists && String(stSigunguCode).trim() !== "") {
          res.json(exists);
        } else {
          res.json([]);
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .get("/popular", async (req, res) => {
      try {
        const { prefer = "", sigunguCode = "" } = req.query;
        const stSigunguCode = String(sigunguCode);
        const stPrefer = String(prefer);

        const topStores = await purchase
          .aggregate([
            // 1. 시군구 코드로 필터링
            {
              $match: {
                "address.sigunguCode": {
                  $regex: "^" + stSigunguCode.slice(0, 2),
                },
              },
            },
            // 2. purchasePackageId 기준으로 중복 제거
            {
              $group: {
                _id: "$purchasePackageId",
                storePublicId: { $first: "$storePublicId" },
              },
            },
            // 3. storePublicId 기준으로 몇 개의 unique purchasePackageId가 있는지 카운트
            {
              $group: {
                _id: "$storePublicId",
                uniquePackageCount: { $sum: 1 },
              },
            },
            // 4. 정렬 및 제한
            { $sort: { uniquePackageCount: -1 } },
            { $limit: 8 },
            // 5. store 컬렉션 조인
            {
              $lookup: {
                from: "stores",
                localField: "_id",
                foreignField: "storePublicId",
                as: "store",
              },
            },
            { $unwind: "$store" },
            // 6. 필요한 필드만 출력
            {
              $project: {
                _id: 0,
                storePublicId: "$_id",
                storeName: "$store.storeName",
                logoPath: "$store.logoPath",
                heroBannerPath: "$store.heroBannerPath",
                category: "$store.category",
                reviewCount: "$store.reviewCount",
                reviewScore: "$store.reviewScore",
                totalOrdered: "$uniquePackageCount",
              },
            },
          ])
          .toArray();

        const preferStores = await purchase
          .aggregate([
            // 1. 시군구 코드로 필터링
            {
              $match: {
                "address.sigunguCode": {
                  $regex: "^" + stSigunguCode.slice(0, 2),
                },
              },
            },
            // 2. purchasePackageId 기준으로 중복 제거
            {
              $group: {
                _id: "$purchasePackageId",
                storePublicId: { $first: "$storePublicId" },
              },
            },
            // 3. storePublicId 기준으로 몇 개의 unique purchasePackageId가 있는지 카운트
            {
              $group: {
                _id: "$storePublicId",
                uniquePackageCount: { $sum: 1 },
              },
            },
            // 4. 정렬 및 제한
            { $sort: { uniquePackageCount: -1 } },
            { $limit: 8 },
            // 5. store 컬렉션 조인
            {
              $lookup: {
                from: "stores",
                localField: "_id",
                foreignField: "storePublicId",
                as: "store",
              },
            },
            {
              $match: {
                "store.category": stPrefer,
              },
            },
            { $unwind: "$store" },
            // 6. 필요한 필드만 출력
            {
              $project: {
                _id: 0,
                storePublicId: "$_id",
                storeName: "$store.storeName",
                logoPath: "$store.logoPath",
                heroBannerPath: "$store.heroBannerPath",
                category: "$store.category",
                reviewCount: "$store.reviewCount",
                reviewScore: "$store.reviewScore",
                totalOrdered: "$uniquePackageCount",
              },
            },
          ])
          .toArray();

        if (topStores) {
          res.json({ topStores, preferStores: preferStores ?? [] });
        } else {
          res.json({ topStores: [], preferStores: [] });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getStoreInfo", async (req, res) => {
      try {
        const { storePublicId } = req.query;
        const stStorePublicId = String(storePublicId);
        const exists = await store.findOne(
          {
            storePublicId: stStorePublicId,
          },
          { projection: { _id: 0 } }
        );
        if (exists) {
          res.json({ ok: true, storeInfo: exists });
        } else {
          res.json({ ok: false, errMsg: "스토어 정보를 찾을 수 없습니다." });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getOpHours", async (req, res) => {
      try {
        const { storePublicId } = req.query;
        const stStorePublicId = String(storePublicId);
        const storeInfo = await store.findOne({
          storePublicId: stStorePublicId,
        });

        if (storeInfo) {
          const exists = await operatingHours
            .find(
              {
                storeId: storeInfo.storeId,
              },
              { projection: { _id: 0, storeId: 0 } }
            )
            .sort({ order: 1 })
            .toArray();
          if (exists) {
            res.json({ ok: true, opHours: exists });
          } else {
            res.json({ ok: false });
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getStoreEventInfo", async (req, res) => {
      try {
        const { storePublicId } = req.query;
        const stStorePublicId = String(storePublicId);
        const exists = await store.findOne({
          storePublicId: stStorePublicId,
        });
        if (exists) {
          const resultInfos = await eventInfo
            .find({ storeId: exists.storeId })
            .toArray();
          if (resultInfos.length > 0) {
            res.json(resultInfos);
          } else {
            res.json([]);
          }
        } else {
          res.json([]);
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    });
};
