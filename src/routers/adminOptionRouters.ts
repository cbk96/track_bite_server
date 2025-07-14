import type { MongoDB } from "../mongodb";
import { Router } from "express";
import { CustomError } from "../utils/error/CustomError";
import { adminAuthenticateToken } from "../middlewares/authenticateToken";

export const adminOptionRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const optionGroups = db.collection("optionGroups");
  const options = db.collection("options");
  const menus = db.collection("menus");
  const router = Router();

  type OptionGroup = {
    storeId: string;
    optionGroupId: string;
    optionGroupName: string;
    required: boolean; //필수 여부
    selectionType: "single" | "multi"; //단일, 복수 선택여부
    order: number;
    optionCount?: number;
  };

  type Option = {
    optionId: string;
    optionGroupId: string;
    storeId: string;
    optionName: string;
    price: number;
    order: number;
  };

  return router
    .get("/getOptionGroups", adminAuthenticateToken, async (req, res) => {
      try {
        const { storeId } = req.query;
        const stStoreId = String(storeId);
        const exists = await optionGroups
          .find({ storeId: stStoreId }, { projection: { _id: 0 } })
          .sort({ order: 1 })
          .toArray();

        if (exists) {
          for (let i: number = 0; i < exists.length; i++) {
            const optionGroupId: string = exists[i].optionGroupId;
            const optionCount = await options.countDocuments({ optionGroupId });
            const { ...allElement } = exists[i];
            exists[i] = { ...allElement, optionCount };
          }
          res.json({ ok: true, optionGroups: exists });
        } else {
          throw new CustomError(
            "옵션 그룹을 불러오는 중 문제가 발생했습니다.",
            "CANNOT_FOUND_OPTION_GROUP"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .post("/addOptionGroup", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        await optionGroups.insertOne(body);

        const resultOptionGroups = await optionGroups
          .find({ storeId: body.storeId }, { projection: { _id: 0 } })
          .sort({ order: 1 })
          .toArray();
        res.json({ ok: true, optionGroups: resultOptionGroups });
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .put("/updateOptionGroup", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      const bulkOps = body.map((group: OptionGroup) => ({
        updateOne: {
          filter: { optionGroupId: group.optionGroupId },
          update: { $set: group },
        },
      }));

      try {
        const resultMOptionGroups = await optionGroups.bulkWrite(bulkOps);
        if (resultMOptionGroups) {
          const exist = await optionGroups
            .find({ storeId: body[0].storeId }, { projection: { _id: 0 } })
            .sort({ order: 1 })
            .toArray();
          if (exist) {
            res.json({ ok: true, optionGroups: exist });
          } else {
            throw new CustomError(
              "옵션 그룹을 불러오는 중 문제가 발생했습니다.",
              "CANNOT_FOUND_OPTION_GROUP"
            );
          }
        } else {
          throw new CustomError(
            "옵션 그룹을 수정하는 중 문제가 발생했습니다.",
            "CANNOT_EDIT_OPTION_GROUP"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.json({ ok: false, errorMsg: e.message });
        }
      }
    })
    .delete("/deleteOptionGroup", adminAuthenticateToken, async (req, res) => {
      try {
        const { optionGroupId = "", storeId = "" } = req.query;
        const stOptionGroupId = String(optionGroupId);
        const stStoreId = String(storeId);
        const existGroups = await optionGroups.deleteMany({
          optionGroupId: stOptionGroupId,
        });
        await options.deleteMany({
          optionGroupId: stOptionGroupId,
        });
        const restOptionGroups = await optionGroups
          .find(
            {
              optionGroupId: { $ne: stOptionGroupId },
              storeId: stStoreId,
            },
            { projection: { _id: 0 } }
          )
          .sort({ order: 1 })
          .toArray();

        //옵션이 연결된 메뉴에서 옵션 제거
        await menus.updateMany(
          {
            optionGroupId: { $in: [stOptionGroupId] },
          },
          { $pull: { optionGroupId: stOptionGroupId as any } }
        );

        if (existGroups.deletedCount > 0 && restOptionGroups)
          res.json({ ok: true, optionGroups: restOptionGroups });
        else {
          throw new CustomError(
            "옵션 그룹과 옵션 삭제중 문제가 발생했습니다.",
            "CANNOT_REMOVE_OPTION_GROUP_AND_OPTION"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .post("/addOption", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      try {
        const exists = await options.insertOne(body);

        const resultOptions = await options
          .find({ storeId: body.storeId }, { projection: { _id: 0 } })
          .sort({ order: 1 })
          .toArray();

        if (exists && resultOptions) {
          console.log("option add success");
          res.json({
            ok: true,
            options: resultOptions,
          });
        } else {
          throw new CustomError(
            "옵션을 저장하는 중 문제가 발생했습니다.",
            "CANNOT_SAVE_OPTION"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .get("/getOptions", adminAuthenticateToken, async (req, res) => {
      try {
        const { storeId } = req.query;
        const stStoreId = String(storeId);
        const exists = await options
          .find({ storeId: stStoreId }, { projection: { _id: 0 } })
          .sort({ order: 1 })
          .toArray();

        if (exists) {
          res.json({ ok: true, options: exists });
        } else {
          res.json({ ok: true, options: [] });
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .put("/updateOption", adminAuthenticateToken, async (req, res) => {
      const { body } = req;
      const bulkOps = body.map((option: Option) => ({
        updateOne: {
          filter: { optionId: option.optionId },
          update: { $set: option },
        },
      }));

      try {
        const resultOptions = await options.bulkWrite(bulkOps);
        if (resultOptions) {
          const exist = await options
            .find({ storeId: body[0].storeId }, { projection: { _id: 0 } })
            .sort({ order: 1 })
            .toArray();
          if (exist) {
            res.json({ ok: true, options: exist });
          } else {
            throw new CustomError(
              "옵션 정보를 수정하는 중 문제가 발생했습니다.",
              "CANNOT_EDI_OPTION"
            );
          }
        } else {
          throw new CustomError(
            "옵션 정보를 수정하는 중 문제가 발생했습니다.",
            "CANNOT_EDI_OPTION"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    })
    .delete("/deleteOption", adminAuthenticateToken, async (req, res) => {
      try {
        const { optionId = "", storeId = "" } = req.query;
        const stOptionId = String(optionId);
        const stStoreId = String(storeId);
        const existOptions = await options.deleteMany({
          optionId: stOptionId,
        });

        const restOptions = await options
          .find({ optionId: { $ne: stOptionId }, storeId: stStoreId })
          .toArray();
        if (existOptions.deletedCount > 0 && restOptions) {
          res.json({ ok: true, options: restOptions });
        } else {
          throw new CustomError(
            "옵션 삭제중 문제가 발생했습니다.",
            "CANNOT_DELETE_OPTION"
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    });
};
