import type { MongoDB } from "../mongodb";
import { Router } from "express";
import type * as T from "../types/types";
import { CustomError } from "../utils/error/CustomError";
import { customerAuthenticateToken } from "../middlewares/authenticateToken";

export const purchaseRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const cart = db.collection("carts");
  const purchase = db.collection("purchases");
  const review = db.collection("reviews");
  const limitCartItemlength = 20;

  const router = Router();

  return router
    .put("/addCart", async (req, res) => {
      const { body } = req;

      try {
        const existsCarts = await cart
          .find({ customerId: body.cart.customerId })
          .toArray();

        const sameStoreChk = existsCarts.find(
          (cart) => cart.storePublicId === body.cart.storePublicId
        );

        if (existsCarts.length === 0 || sameStoreChk !== undefined) {
          if (existsCarts.length < limitCartItemlength) {
            const insertCart = { ...body.cart, date: new Date(body.cart.date) };
            const exists = await cart.insertOne(insertCart);
            if (exists) {
              const resultCart = await cart
                .find(
                  {
                    storePublicId: body.cart.storePublicId,
                    customerId: body.cart.customerId,
                  },
                  { projection: { _id: 0 } }
                )
                .toArray();
              res.status(200).json({ ok: true, carts: resultCart });
            } else {
              throw new CustomError(
                "장바구니 저장중 문제가 발생했습니다.",
                "CANNOT_SAVE_CART_FORM"
              );
            }
          } else {
            const resultCart = await cart
              .find(
                {
                  storePublicId: body.cart.storePublicId,
                  customerId: body.cart.customerId,
                },
                { projection: { _id: 0 } }
              )
              .toArray();
            res.status(200).json({
              ok: false,
              resultMsg:
                "장바구니애는 " +
                limitCartItemlength +
                "개의 메뉴만 담을 수 있습니다.",
              carts: resultCart,
            });
          }
        } else {
          const resultCart = await cart
            .find(
              {
                customerId: body.cart.customerId,
              },
              { projection: { _id: 0 } }
            )
            .toArray();
          console.log("resultCart :", resultCart.length);
          res.status(200).json({
            ok: false,
            resultMsg:
              "이미 다른 가게의 메뉴가 담겨 있어 이 메뉴를 추가할 수 없습니다.",
            carts: resultCart ?? [],
          });
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .post("/getCartOne", async (req, res) => {
      const { body } = req;
      try {
        const exist = await cart.findOne(
          { customerId: body.customerId, cartId: body.cartId },
          { projection: { _id: 0 } }
        );

        if (exist) {
          res.json(exist);
        } else {
          throw new CustomError(
            "장바구니를 불러오는 중 문제가 발생했습니다.",
            "CANNOT_FETCH_CART_FORM"
          );
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .get("/getCartList", async (req, res) => {
      const { customerId = "" } = req.query;
      const stCustomerId = String(customerId);
      try {
        const exists = await cart
          .find({ customerId: stCustomerId }, { projection: { _id: 0 } })
          .sort({ date: 1 })
          .toArray();

        if (exists) {
          res.json({ ok: true, carts: exists });
        } else {
          throw new CustomError(
            "장바구니를 불러오는 중 문제가 발생했습니다.",
            "CANNOT_FETCH_CART_FORM"
          );
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .delete("/removeCartItem", async (req, res) => {
      const { cartId = "" } = req.query;
      const stCartId = String(cartId);
      try {
        const exists = await cart.findOneAndDelete({
          cartId: stCartId,
        });

        if (exists) {
          const resultCart = await cart
            .find({ customerId: exists.customerId })
            .toArray();
          res.json({ ok: true, carts: resultCart });
        } else {
          throw new CustomError(
            "장바구니 항목 삭제중 문제가 발생했습니다.",
            "CANNOT_DELETE_CART_ITEM"
          );
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .post("/removeCartItems", async (req, res) => {
      const { body } = req;
      try {
        const delteAllCart = await cart.deleteMany({
          customerId: body.customerId,
        });

        if (delteAllCart.deletedCount > 0) {
          res.json({ ok: true });
        } else {
          throw new CustomError(
            "장바구니 삭제중 문제가 발생했습니다.",
            "CANNOT_REMOVE_CART"
          );
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .put("/editCartItemQuanti", async (req, res) => {
      const { body } = req;
      try {
        const exists = await cart.findOneAndUpdate(
          { cartId: body.cartId },
          { $set: { quanti: body.quanti } },
          { returnDocument: "after" }
        );

        if (exists) {
          const resultCart = await cart
            .find({ customerId: exists.customerId })
            .toArray();
          res.json({ ok: true, carts: resultCart });
        } else {
          res.json({ ok: true, carts: [] });
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })

    .get("/getPurchaseList", customerAuthenticateToken, async (req, res) => {
      const {
        customerId = "",
        startRangeDate = "",
        endRangeDate = "",
        skip = "0",
        limit = "0",
      } = req.query;
      try {
        const stCustomerId = String(customerId);
        const startDate = new Date(startRangeDate as string);
        const endDate = new Date(endRangeDate as string);

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const exists = await purchase
          .aggregate([
            {
              $match: {
                customerId: stCustomerId,
                date: {
                  $gte: startDate,
                  $lte: endDate,
                },
              },
            },
            { $sort: { date: -1 } }, //그룹으로 묶기전에 날짜 기준으로 정렬
            {
              $group: {
                _id: "$purchasePackageId",
                latestDate: { $first: "$date" },
              },
            }, //그룹화
            { $sort: { latestDate: -1 } }, //latestDate를 기준으로 그룹 정렬
            { $skip: Number(skip) },
            { $limit: Number(limit) },
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
            { $addFields: { docs: { $arrayElemAt: ["$docs", 0] } } },
            { $replaceRoot: { newRoot: "$docs" } },
          ])
          .toArray();

        const purPackIds = exists.map(
          (exists) => exists.purchasePackageId
        ) as string[];

        const allmenus = await purchase
          .find(
            {
              purchasePackageId: { $in: purPackIds },
            },
            {
              projection: {
                _id: 0,
                purchaseId: 1,
                purchasePackageId: 1,
                menu: 1,
              },
            }
          )
          .sort({ date: -1 })
          .toArray();

        const reviews = await review
          .find(
            { purchasePackageId: { $in: purPackIds } },
            { projection: { _id: 0 } }
          )
          .toArray();

        if (exists && allmenus && reviews) {
          res.json({
            SearchingResult: exists,
            SearchingMenus: allmenus,
            reviews: reviews,
          });
        } else {
          res.json({
            SearchingResult: [],
            SearchingMenus: [],
            reviews: [],
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({
            SearchingResult: [],
            SearchingMenus: [],
            reviews: [],
          });
        }
      }
    })
    .get("/getAllPurchaseList", customerAuthenticateToken, async (req, res) => {
      try {
        const { purchasePackageId } = req.query;
        const stPurchasePackageId = String(purchasePackageId);
        const exists = await purchase
          .find({ purchasePackageId: stPurchasePackageId })
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
    .get("/getPurchaseCount", customerAuthenticateToken, async (req, res) => {
      try {
        const { customerId } = req.query;
        const stCustomerId = String(customerId);
        const exists = await purchase
          .aggregate([
            {
              $match: {
                customerId: stCustomerId,
              },
            }, //그룹으로 묶기전에 날짜 기준으로 정렬
            {
              $group: {
                _id: "$purchasePackageId",
              },
            }, //그룹화
            {
              $count: "total",
            },
          ])
          .toArray();
        const count = exists.length > 0 ? exists[0].total : 0;

        if (count) {
          res.json(count);
        } else {
          res.json(0);
        }
      } catch (e) {
        if (e instanceof Error) res.status(500).json(0);
      }
    })
    .post("/addPurchase", async (req, res) => {
      const { body } = req;
      try {
        const purchases: T.Purchase[] = body.purchases;
        const insertPurchase = purchases.map((purchase) => ({
          ...purchase,
          date: new Date(purchase.date),
        }));
        const exists = await purchase.insertMany(insertPurchase);

        if (exists.insertedCount > 0) {
          res.json({ ok: true });
        } else {
          throw new CustomError(
            "주문 처리중 문제가 발생했습니다.",
            "ORDER_PROCESSING_FAILED"
          );
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    });
};
