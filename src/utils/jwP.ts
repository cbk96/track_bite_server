import { Jwt, JwtPayload } from "jsonwebtoken";
import { sign, verify } from "jsonwebtoken";
import type { SignOptions, VerifyOptions } from "jsonwebtoken";

const secret = process.env.SECRET_KEY ?? "ldjkfdkljglksdjhgklsjdfklgjsdlk";

export const jwtSignP = (
  payload: string | Buffer | object,
  options: SignOptions = {}
) =>
  new Promise<string>((resolve, reject) => {
    try {
      const jwt = sign(payload, secret, options);
      resolve(jwt);
    } catch (e) {
      reject(e);
    }
  });

export const jwtVerifyP = <T = JwtPayload>(
  token: string,
  options: VerifyOptions = {}
): Promise<T> => {
  return new Promise((resolve, reject) => {
    try {
      const decoded = verify(token, secret, options);
      resolve(decoded as T);
    } catch (e) {
      reject(e);
    }
  });
};
