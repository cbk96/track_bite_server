import type { MongoDB } from "../mongodb";
import { Router } from "express";
import { CustomError } from "../utils/error/CustomError";
import { adminAuthenticateToken } from "../middlewares/authenticateToken";

export const adminMenuRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const menuGroups = db.collection("menuGroups");
  const menus = db.collection("menus");
  const purchase = db.collection("purchases");
  const router = Router();

  type MenuGroup = {
    storeId: string;
    menuGroupId: string;
    menuGroupName: string;
    order: number;
    menuCount?: number;
  };

  type Menu = {
    menuId: string;
    menuName: string;
    storeId: string;
    menuGroupId: string;
    price: number;
    menuDescrip: string;
    imagePath: string;
    optionGroupId?: string[]; //OptionGroup의 optionGroupId 참조
    saleStatus: string;
    order: number;
  };

  return router
    .get("/getMenuGroups", adminAuthenticateToken, async (req, res) => {
      try {
        const { storeId = "" } = req.query;
        const stStoreId = String(storeId);
        const exists = await menuGroups
          .find({ storeId: stStoreId }, { projection: { _id: 0 } })
          .sort({ order: 1 })
          .toArray();

        if (exists) {
          for (let i: number = 0; i < exists.length; i++) {
            const menuGroupId: string = exists[i].menuGroupId;
            const menuCount = await menus.countDocuments({ menuGroupId });

            const { ...allElement } = exists[i];
            exists[i] = { ...allElement, menuCount };
          }

          res.json({ ok: true, menuGroups: exists });
        } else {
          res.status(200).json({ ok: true, menuGroups: [] });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .post("/addMenuGroup", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const exists = await menuGroups.insertOne({
          storeId: body.storeId,
          menuGroupId: body.menuGroupId,
          menuGroupName: body.menuGroupName,
          order: body.order,
        });

        //const insertedId = exists.insertedId;
        const resultMenuGroups = await menuGroups
          .find({ storeId: body.storeId }, { projection: { _id: 0 } })
          .sort({ order: 1 })
          .toArray();

        res.json({ ok: true, menuGroups: resultMenuGroups });
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .put("/updateMenuGroup", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const bulkOps = body.map((group: MenuGroup) => ({
          updateOne: {
            filter: { menuGroupId: group.menuGroupId },
            update: { $set: group },
          },
        }));
        const resultMenuGroups = await menuGroups.bulkWrite(bulkOps);
        if (resultMenuGroups) {
          const updatedMenuGroups = await menuGroups
            .find({ storeId: body[0].storeId }, { projection: { _id: 0 } })
            .sort({ order: 1 })
            .toArray();
          if (updatedMenuGroups) {
            res.json({ ok: true, menuGroups: updatedMenuGroups });
          } else {
            throw new CustomError(
              "메뉴 그룹을 불러오는 중 문제가 발생했습니다.",
              "CANNOT_FOUND_MENU_GROUP"
            );
          }
        } else {
          throw new CustomError(
            "메뉴 그룹을 수정할 수 없습니다.",
            "CANNOT_EDIT_MENU_GROUP"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .delete("/deleteMenuGroup", adminAuthenticateToken, async (req, res) => {
      try {
        const { menuGroupId = "", storeId = "" } = req.query;
        const stMenuGroupId = String(menuGroupId);
        const stStroeId = String(storeId);
        const existGroups = await menuGroups.deleteMany({
          menuGroupId: stMenuGroupId,
        });
        await menus.deleteMany({
          menuGroupId: stStroeId,
        });

        const restMenuGroups = await menuGroups
          .find(
            { menuGroupId: { $ne: stMenuGroupId }, storeId: stStroeId },
            { projection: { _id: 0 } }
          )
          .sort({ order: 1 })
          .toArray();

        if (existGroups.deletedCount > 0 && restMenuGroups) {
          res.json({ ok: true, menuGroups: restMenuGroups });
        } else {
          throw new CustomError(
            "메뉴그룹과 메뉴 삭제중 문제가 발생했습니다.",
            "CANNOT_REMOVE_MENU_GROUP"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/popular", adminAuthenticateToken, async (req, res) => {
      try {
        const { storePublicId = "" } = req.query;
        const stStorePublicId = String(storePublicId);
        const topMenus = await purchase
          .aggregate([
            { $match: { storePublicId: stStorePublicId } },
            {
              $group: {
                _id: "$menu.menuId",
                totalOrdered: { $sum: "$quanti" },
              },
            },
            { $sort: { totalOrdered: -1 } },
            { $limit: 3 },
            {
              $lookup: {
                from: "menus",
                localField: "_id",
                foreignField: "menuId",
                as: "menu",
              },
            },
            { $unwind: "$menu" },
            {
              $project: {
                _id: 0,
                menuId: "$_id",
                menuName: "$menu.menuName",
                imagePath: "$menu.imagePath",
                totalOrdered: 1,
              },
            },
          ])
          .toArray();

        if (topMenus && topMenus.length > 0) {
          res.json({ ok: true, topMenus });
        } else {
          res.json({ ok: false, topMenus: [] });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .post("/addMenu", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const exists = await menus.insertOne(body);

        //const insertedId = exists.insertedId;
        const resultMenus = await menus
          .find({ storeId: body.storeId }, { projection: { _id: 0 } })
          .sort({ order: 1 })
          .toArray();

        res.json({ ok: true, menus: resultMenus });
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getMenus", adminAuthenticateToken, async (req, res) => {
      try {
        const { storeId = "" } = req.query;
        const stStoreId = String(storeId);
        const exists = await menus
          .find({ storeId: stStoreId }, { projection: { _id: 0 } })
          .sort({ order: 1 })
          .toArray();

        if (exists) {
          res.json({ ok: true, menus: exists });
        } else {
          res.status(200).json({ ok: true, menus: [] });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .put("/updateMenu", adminAuthenticateToken, async (req, res) => {
      const { body } = req;

      try {
        const bulkOps = body.map((menu: Menu) => ({
          updateOne: {
            filter: { menuId: menu.menuId },
            update: { $set: menu },
          },
        }));
        const resultMenu = await menus.bulkWrite(bulkOps);
        if (resultMenu) {
          const exists = await menus
            .find({ storeId: body[0].storeId }, { projection: { _id: 0 } })
            .sort({ order: 1 })
            .toArray();
          if (exists) {
            res.json({ ok: true, menus: exists });
          } else {
            throw new CustomError(
              "메뉴를 수정하는 중 문제가 발생했습니다.",
              "CANNOT_FOUND_MENU_GROUP"
            );
          }
        } else {
          throw new CustomError(
            "메뉴를 수정하는 중 문제가 발생했습니다.",
            "CANNOT_FOUND_MENU_GROUP"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .delete("/deleteMenu", adminAuthenticateToken, async (req, res) => {
      try {
        const { menuId = "", storeId = "" } = req.query;
        const stMenuid = String(menuId);
        const stStroeId = String(storeId);
        const existMenus = await menus.deleteMany({
          menuId: stMenuid,
        });

        const restMenus = await menus
          .find(
            {
              menuId: { $ne: stMenuid },
              storeId: stStroeId,
            },
            { projection: { _id: 0 } }
          )
          .sort({ order: 1 })
          .toArray();

        if (existMenus.deletedCount > 0 && restMenus) {
          res.json({ ok: true, menus: restMenus });
        } else {
          throw new CustomError(
            "메뉴 삭제 중 문제가 발생했습니다.",
            "CANNOT_REMOVE_MENU"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    });
};
