export class CustomError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "CustomError";
    this.code = code;

    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
