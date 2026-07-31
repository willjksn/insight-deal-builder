export type CreatorErrorCode =
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "NOT_CONFIGURED"
  | "INTERNAL";

export class CreatorError extends Error {
  readonly code: CreatorErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CreatorErrorCode,
    message: string,
    options?: { status?: number; details?: Record<string, unknown> }
  ) {
    super(message);
    this.name = "CreatorError";
    this.code = code;
    this.status = options?.status ?? creatorErrorHttpStatus(code);
    this.details = options?.details;
  }
}

export function creatorErrorHttpStatus(code: CreatorErrorCode): number {
  switch (code) {
    case "NOT_AUTHORIZED":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_FAILED":
      return 400;
    case "NOT_CONFIGURED":
      return 503;
    case "INTERNAL":
      return 500;
    default:
      return 500;
  }
}

export function isCreatorError(err: unknown): err is CreatorError {
  return err instanceof CreatorError;
}
