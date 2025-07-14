import { createServer } from "http";
import { createExpressApp } from "./express";
import type { MongoDB } from "./mongodb";
import { connectAndUseDB } from "./mongodb";
import dotenv from "dotenv";
dotenv.config(); // .env 파일 로드

const ConnectCallback = (db: MongoDB) => {
  const port = process.env.PORT ?? 4000;

  createServer(createExpressApp(db)).listen(port, () =>
    console.log(`connect Render:${port}`)
  );
};
const dbName = process.env.DB_NAME ?? "myMdb";
connectAndUseDB(ConnectCallback, dbName);
