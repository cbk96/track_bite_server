import { MongoClient, Db } from "mongodb";
import { CustomError } from "../utils/error/CustomError";
export type MongoDB = Db;
export type ConnectCallback = (db: MongoDB) => void;

export const connectAndUseDB = async (
  callback: ConnectCallback,
  dbName: string,
  mongoUrl: string | undefined = process.env.MONGODB_URI //"mongodb://localhost:27017"
) => {
  let connection;
  try {
    if (!mongoUrl)
      throw new CustomError(
        "MONGODB_URI 환경변수가 설정되지 않았습니다.",
        "MONGODB_URI_NOT_DEFINED"
      );
    connection = await MongoClient.connect(mongoUrl);
    const db: Db = connection.db(dbName);
    callback(db);
  } catch (e) {
    if (e instanceof Error) {
      console.log(e.message);
    }
  }
};
