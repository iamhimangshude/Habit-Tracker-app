export class ErrorResponse extends Error {
  constructor(status, message, errors = [], stack = "") {
    super(message);
    this.status = status;
    this.success = false;
    this.data = null;
    this.errors = errors;
    this.stack = stack
      ? stack
      : Error.captureStackTrace(this, this.constructor);
  }
}
