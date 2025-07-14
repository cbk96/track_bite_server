import type { MongoDB } from "../mongodb";
import { Router } from "express";
import { CustomError } from "../utils/error/CustomError";
import { customerAuthenticateToken } from "../middlewares/authenticateToken";

export const reviewRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const review = db.collection("reviews");
  const store = db.collection("stores");
  const router = Router();

  return router
    .get("/getReviewList", async (req, res) => {
      const { storePublicId = "", skip = "0", limit = "0" } = req.query;
      const stStorePublicId = String(storePublicId);

      try {
        const customerReview = await review
          .find({
            storePublicId: stStorePublicId,
            $or: [{ parentId: "" }, { parentId: { $exists: false } }],
          })
          .sort({ date: -1 })
          .skip(Number(skip))
          .limit(Number(limit))
          .project({ _id: 0 })
          .toArray();

        const reviewIds = customerReview.map(
          (creview) => creview.reviewId
        ) as string[];

        const adminReview = await review
          .find({
            parentId: { $in: reviewIds },
          })
          .project({ _id: 0 })
          .toArray();

        const grade = await review
          .aggregate([
            { $match: { storePublicId: stStorePublicId, parentId: "" } },
            { $group: { _id: null, totalScore: { $avg: "$score" } } },
          ])
          .toArray();

        const allReviewLength = await review.countDocuments({
          storePublicId: stStorePublicId,
          $or: [{ parentId: "" }, { parentId: { $exists: false } }],
        });

        if (customerReview) {
          res.json({
            customerReviw: customerReview.length > 0 ? customerReview : [],
            adminReview: adminReview.length > 0 ? adminReview : [],
            totalScroe: grade[0] ? grade[0].totalScore : 0,
            allReviewLength,
          });
        } else {
          res.json({ ok: true });
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .post("/registReview", customerAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const insertReview = {
          ...body.registReview,
          date: new Date(new Date(body.registReview.date).toISOString()),
        };

        const exists = await review.insertOne(insertReview);

        if (exists) {
          const storeTotalScroe = await review
            .aggregate([
              {
                $match: {
                  storePublicId: insertReview.storePublicId,
                  $or: [{ parentId: "" }, { parentId: { $exists: false } }],
                  score: { $exists: true, $ne: null },
                },
              },
              {
                $group: {
                  _id: null,
                  totalScore: { $avg: { $ifNull: ["$score", 0] } },
                  totalCount: { $sum: 1 },
                },
              },
            ])
            .toArray();

          store.updateOne(
            { storePublicId: insertReview.storePublicId },
            {
              $set: {
                reviewCount: storeTotalScroe[0]?.totalCount || 0,
                reviewScore: storeTotalScroe[0]?.totalScore || 0,
              },
            }
          );

          res.json({ ok: true });
        } else {
          throw new CustomError(
            "리뷰를 작성할 수 없습니다.",
            "CANNOT_REGIST_REVIEW"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    });
};
