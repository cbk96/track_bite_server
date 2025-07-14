import type { MongoDB } from "../mongodb";
import { Router } from "express";
import { CustomError } from "../utils/error/CustomError";

export const menuPublicRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const store = db.collection("stores");
  const menuGroups = db.collection("menuGroups");
  const menus = db.collection("menus");
  const optionGroup = db.collection("optionGroups");
  const option = db.collection("options");
  const router = Router();

  return router
    .get("/getMenuGroupPublicInfo", async (req, res) => {
      try {
        const { storePublicId = "" } = req.query;
        const stStorePublicId = String(storePublicId);
        const adminExists = await store.findOne({
          storePublicId: stStorePublicId,
        });
        if (adminExists) {
          const exists = await menuGroups
            .find({ storeId: adminExists.storeId })
            .sort({ order: 1 })
            .project({ _id: 0 })
            .project({ storeId: 0 })
            .toArray();

          if (exists) {
            for (let i: number = 0; i < exists.length; i++) {
              const menuGroupId: string = exists[i].menuGroupId;
              const menuCount = await menus.countDocuments({ menuGroupId });

              const { ...allElement } = exists[i];
              exists[i] = { ...allElement, menuCount };
            }

            res.json({ ok: true, menuGroupPublic: exists });
          } else {
            res.json({ ok: true, menuGroupPublic: [] });
          }
        } else {
          res.status(400).json({
            error: "가게 정보를 가져올 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })

    .get("/getMenuPublicInfo", async (req, res) => {
      try {
        const { storePublicId = "" } = req.query;
        const stStorePublicId = String(storePublicId);
        const adminExists = await store.findOne({
          storePublicId: stStorePublicId,
        });
        if (adminExists) {
          const exists = await menus
            .find(
              { storeId: adminExists.storeId },
              { projection: { _id: 0, storeId: 0 } }
            )
            .sort({ order: 1 })
            .toArray();

          if (exists) {
            res.json({ ok: true, menuPublic: exists });
          } else {
            res.json({ ok: true, menuPublic: [] });
          }
        } else {
          res.status(400).json({
            error: "가게 정보를 가져올 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getOptionGroupPublicInfo", async (req, res) => {
      try {
        const { storePublicId } = req.query;
        const stStorePublicId = String(storePublicId);
        const adminExists = await store.findOne({
          storePublicId: stStorePublicId,
        });
        if (adminExists) {
          const exists = await optionGroup
            .find(
              { storeId: adminExists.storeId },
              { projection: { _id: 0, storeId: 0 } }
            )
            .sort({ order: 1 })
            .toArray();

          if (exists) {
            res.json({ ok: true, optionGroupsPublic: exists });
          } else {
            res.json({ ok: true, optionGroupsPublic: [] });
          }
        } else {
          res.json({ ok: true, optionGroupsPublic: [] });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getOptionPublicInfo", async (req, res) => {
      try {
        const { storePublicId } = req.query;
        const stStorePublicId = String(storePublicId);
        const adminExists = await store.findOne({
          storePublicId: stStorePublicId,
        });
        if (adminExists) {
          const exists = await option
            .find(
              { storeId: adminExists.storeId },
              { projection: { _id: 0, storeId: 0 } }
            )
            .sort({ order: 1 })
            .toArray();

          if (exists) {
            res.json({ ok: true, optionsPublic: exists });
          } else {
            res.json({ ok: true, optionsPublic: [] });
          }
        } else {
          res.status(400).json({
            error: "가게 정보를 가져올 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    });
};
