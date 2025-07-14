import type { MongoDB } from "../mongodb";
import { Router } from "express";
import { CustomError } from "../utils/error/CustomError";
import { adminAuthenticateToken } from "../middlewares/authenticateToken";

export const adminReviewRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const review = db.collection("reviews");
  const router = Router();

  return router
    .get("/getReviewList", adminAuthenticateToken, async (req, res) => {
      try {
        const {
          storePublicId = "",
          limitItemNum = "0",
          startRangeDate = "",
          endRangeDate = "",
          startItemNum = "0",
        } = req.query;
        const stStorePublicId = String(storePublicId);
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

        const customerReview = await review
          .find({
            storePublicId: stStorePublicId,
            $or: [{ parentId: "" }, { parentId: { $exists: false } }],
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          })
          .sort({ date: -1 })
          .skip(Number(startItemNum))
          .limit(Number(limitItemNum))
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

        const searchingAllItemCount = await review.countDocuments({
          storePublicId: stStorePublicId,
          $or: [{ parentId: "" }, { parentId: { $exists: false } }],
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        });

        const todayItemLength = await review.countDocuments({
          storePublicId: stStorePublicId,
          $or: [{ parentId: "" }, { parentId: { $exists: false } }],
          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },
        });

        const grade = await review
          .aggregate([
            { $match: { storePublicId: stStorePublicId, parentId: "" } },
            { $group: { _id: null, totalScore: { $avg: "$score" } } },
          ])
          .toArray();

        if (customerReview) {
          const resultReviewList = new Array(
            customerReview.length > 0 ? customerReview : [],
            adminReview.length > 0 ? adminReview : []
          );
          res.json({
            searchingItemList: resultReviewList,
            searchingAllItemLength: searchingAllItemCount,
            grade: grade[0] ? grade[0].totalScore : 0,
            todayItemLength: todayItemLength,
          });
        } else {
          res.json({
            searchingItemList: [],
            searchingAllItemLength: 0,
            grade: 0,
            todayItemLength: 0,
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .post("/registReviewAns", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const insertAnswer = {
          ...body.registReview,
          date: new Date(new Date(body.registReview.date).toISOString()),
        };

        const exists = await review.insertOne(insertAnswer);

        if (exists) {
          res.json({ ok: true });
        } else {
          throw new CustomError(
            "리뷰 답글을 작성할 수 없습니다.",
            "CANNOT_REGIST_REVIEW_ANSWER"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    });
};
