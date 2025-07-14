import type { MongoDB } from "../mongodb";
import { Router } from "express";
import multer from "multer";
import path from "path";
import { adminAuthenticateToken } from "../middlewares/authenticateToken";
import { supabase } from "../utils/supabaseClient";

export const fileUploadRouter = (...args: any[]) => {
  const router = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }).single("uploadImage");

  return router.post(
    "/uploadImage",
    adminAuthenticateToken,
    async (req, res) => {
      const uploadType = req.query.type as string;
      const uploadPath: Record<string, string> = {
        menu: "menuImage",
        storeInfo: "storeImage",
        promotion: "promotionImage",
      };

      upload(req, res, async (err) => {
        if (err) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              ok: false,
              errorMsg: "파일 용량은 10MB를 초과할 수 없습니다.",
            });
          }
          return res.status(400).json({ ok: false, errorMsg: err.message });
        }

        const { file } = req;

        if (!file) {
          return res.json({
            ok: false,
            errorMsg: "업로드 된 이미지 파일이 없습니다.",
          });
        }

        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
        ) {
          return res.json({
            ok: false,
            errorMsg: "지원하지 않는 파일 형식입니다.",
          });
        }

        try {
          const ext = path.extname(file.originalname);
          const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1e9
          )}${ext}`;

          const filePath = `${uploadPath[uploadType]}/${uniqueName}`;

          const { error: uploadError } = await supabase.storage
            .from("uploadimages")
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
              upsert: true,
            });

          if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            return res.status(500).json({
              ok: false,
              errorMsg: "파일 업로드 중 에러가 발생했습니다.",
            });
          }

          const { data: publicUrl } = supabase.storage
            .from("uploadimages")
            .getPublicUrl(filePath);

          console.log("image path : ", publicUrl.publicUrl);
          res.json({ ok: true, uploadedImgPath: publicUrl.publicUrl });
        } catch (error) {
          if (error instanceof Error) {
            console.log("Supabase server error : ", error.message);
            res.status(500).json({ ok: false, errorMsg: error.message });
          } else {
            res.status(500).json({
              ok: false,
              errorMsg: "이미지 서버에 에러가 발생했습니다.",
            });
          }
        }
      });
    }
  );
};
