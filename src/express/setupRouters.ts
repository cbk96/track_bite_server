import { Express } from "express";
import * as R from "../routers";

//app.use() 객체는 app객체를 반환한다.
export const setupRouters = (app: Express, ...args: any[]): Express => {
  return app
    .use("/", R.authRouters(...args))
    .use("/file", R.fileUploadRouter(...args))
    .use("/appSetting", R.appSettingRouter(...args))
    .use("/admin/coupon", R.adminCouponRouter(...args))
    .use("/admin/menu", R.adminMenuRouter(...args))
    .use("/admin/option", R.adminOptionRouter(...args))
    .use("/admin/purchase", R.adminPurchaseRouter(...args))
    .use("/admin/review", R.adminReviewRouter(...args))
    .use("/admin/promotion", R.adminPromotionRouter(...args))
    .use("/admin", R.adminRouter(...args))
    .use("/store", R.storeRouters(...args))
    .use("/customer/menu", R.menuPublicRouter(...args))
    .use("/purchase", R.purchaseRouter(...args))
    .use("/coupon", R.couponRouters(...args))
    .use("/review", R.reviewRouter(...args))
    .use("/superadmin", R.superAdminRouter(...args));
};
