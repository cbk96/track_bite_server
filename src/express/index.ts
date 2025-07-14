import express from "express";
import { setupRouters } from "./setupRouters";
import path from "path";
import cookieParser from "cookie-parser";
import type { MongoDB } from "../mongodb";
import schedule from "node-schedule";

//(req, res)=>{} 형태의 함수 대신 app객체를 반환
//app.use() 객체는 app객체를 반환한다.
export const createExpressApp = (...args: any[]) => {
  const app = express();
  const { v4: uuidv4 } = require("uuid");
  const cors = require("cors"); //CORS 정책 문제를 우회하기 위해 추가
  const db: MongoDB = args[0];

  app
    .use(cookieParser())
    .use(express.urlencoded({ limit: "10mb", extended: false }))
    .use(express.json({ limit: "10mb" }))
    .use(
      cors({
        //CORS 정책을 우회하기 위해 추가
        credentials: true,
        origin: process.env.CLIENT_URL,
        optionsSuccessStatus: 200,
      })
    )
    .use((req, res, next) => {
      console.log(`url='${req.url}, method=${req.method}`);
      next();
    })
    .use("/src/uploads", express.static(path.join(__dirname, "../uploads")))

    .get("/", (req, res) => {
      res.json({ message: "Hello express World" });
      console.log("on express :", path.join(__dirname, "../uploads"));
    });

  return setupRouters(app, ...args);
};
