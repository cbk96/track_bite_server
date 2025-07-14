import type { MongoDB } from "../mongodb";
import { Router } from "express";
import { CustomError } from "../utils/error/CustomError";
import { adminAuthenticateToken } from "../middlewares/authenticateToken";

export const adminPromotionRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const store = db.collection("stores");
  const eventInfo = db.collection("eventInfos");
  const router = Router();

  return router
    .get("/notification", adminAuthenticateToken, async (req, res) => {
      try {
        const { storeId = "" } = req.query;
        const stStoreId = String(storeId);

        const result = await store.findOne({ storeId: stStoreId });
        if (result) {
          const noti = result.notification;
          res.json({ ok: true, notification: noti });
        } else {
          res.json({ ok: false, notification: "" });
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, errMsg: e.message });
      }
    })
    .put("/updateNotification", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const exists = await store.updateOne(
          { storeId: body.storeId },
          { $set: { notification: body.notification } }
        );

        if (exists.modifiedCount > 0) {
          const resultLoginInfo = await store.findOne(
            { storeId: body.storeId },
            { projection: { _id: 0 } }
          );
          if (resultLoginInfo) {
            res.json({ ok: true, updatedNoti: resultLoginInfo.notification });
          }
        } else {
          res.json({
            ok: false,
            errorMsg: "공지 사항을 수정할 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) res.json({ ok: false, errorMsg: e.message });
      }
    })
    .get("/getStoreEventInfo", adminAuthenticateToken, async (req, res) => {
      try {
        const { storeId } = req.query;
        const stStoreId = String(storeId);

        const resultInfos = await eventInfo
          .find({ storeId: stStoreId })
          .project({ _id: 0 })
          .toArray();
        if (resultInfos.length > 0) {
          res.json(resultInfos);
        } else {
          throw new CustomError(
            "이벤트 정보를 찾을 수 없습니다.",
            "CANNOT_FOUND_EVENT_INFO"
          );
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .post("/addEvent", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const insertEvent = {
          ...body.eventInfo,
          date: new Date(body.eventInfo.date),
        };
        const exists = await eventInfo.insertOne(insertEvent);
        if (exists.insertedId !== undefined) {
          const resultInfos = await eventInfo
            .find({ storeId: body.eventInfo.storeId })
            .project({ _id: 0 })
            .toArray();

          if (resultInfos) res.json(resultInfos);
        } else {
          throw new CustomError(
            "이벤트 정보를 등록할 수 없습니다.",
            "CANNOT_REGIST_EVENT_INFO"
          );
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    })
    .put("/updateEvent", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const insertEvent = {
          ...body.eventInfo,
          date: new Date(body.eventInfo.date),
        };

        const exists = await eventInfo.updateOne(
          { storeId: body.eventInfo.storeId, eventId: body.eventInfo.eventId },
          { $set: insertEvent }
        );
        if (exists) {
          const resultInfos = await eventInfo
            .find({ storeId: body.eventInfo.storeId })
            .project({ _id: 0 })
            .toArray();

          if (resultInfos) res.json(resultInfos);
        } else {
          throw new CustomError(
            "이벤트 정보를 수정할 수 없습니다.",
            "CANNOT_EDIT_EVENT_INFO"
          );
        }
      } catch (e) {
        if (e instanceof Error) res.json([]);
      }
    })
    .delete("/deleteEvent", adminAuthenticateToken, async (req, res) => {
      try {
        const { storeId = "", eventId = "" } = req.query;
        const stStoreId = String(storeId);
        const stEventId = String(eventId);
        const exists = await eventInfo.deleteOne({
          storeId: stStoreId,
          eventId: stEventId,
        });
        if (exists.deletedCount > 0) {
          const resultInfos = await eventInfo
            .find({ storeId: stStoreId })
            .project({ _id: 0 })
            .toArray();

          if (resultInfos) res.json(resultInfos);
        } else {
          throw new CustomError(
            "이벤트 정보를 삭제할 수 없습니다.",
            "CANNOT_DELETE_EVENT_INFO"
          );
        }
      } catch (e) {
        if (e instanceof Error)
          res.status(500).json({ ok: false, error: e.message });
      }
    });
};
