import type { MongoDB } from "../mongodb";
import { Router } from "express";

export const appSettingRouter = (...args: any[]) => {
  const db: MongoDB = args[0];
  const secureAppSetting = db.collection("SecureAppSettings");
  const router = Router();
  const publicId = "getAppInfo";

  return router
    .get("/getAppSetting", async (req, res) => {
      try {
        const exists = await secureAppSetting.findOne(
          { publicId },
          { projection: { _id: 0 } }
        );

        if (exists) {
          res.json({ ok: true, appInfo: exists });
        } else {
          res.json({
            ok: false,
            errorMsg: "앱 정보를 가져올 수 없습니다.",
          });
        }
      } catch (e) {
        if (e instanceof Error) res.json({ ok: false, errorMsg: e.message });
      }
    })
    .get("/keep", async (req, res) => {
      const date = new Date();
      const nowYear = date.getFullYear();
      const nowMonth = date.getMonth();
      const nowDay = date.getDate();
      const nowHours = date.getHours();
      const nowMinutes = date.getMinutes();
      const nowSecond = date.getSeconds();
      console.log(
        nowYear +
          "-" +
          nowMonth +
          "-" +
          nowDay +
          " " +
          nowHours +
          ":" +
          nowMinutes +
          ":" +
          nowSecond
      );

      res.status(200).json({ ok: true });
    });
};
