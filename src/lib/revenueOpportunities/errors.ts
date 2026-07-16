export type RevenueErrorCode =
  | "FEATURE_DISABLED"
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "DUPLICATE_OPPORTUNITY"
  | "INSUFFICIENT_EVIDENCE"
  | "LOW_CONFIDENCE"
  | "APPROVAL_REQUIRED"
  | "WORKFLOW_UNAVAILABLE"
  | "GMAIL_NOT_CONFIGURED"
  | "BUDGET_EXCEEDED"
  | "CONVERSION_FAILED";

export class RevenueOpportunityError extends Error {
  readonly code: RevenueErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: RevenueErrorCode,
    message: string,
    options?: { status?: number; details?: Record<string, unknown> }
  ) {
    super(message);
    this.name = "RevenueOpportunityError";
    this.code = code;
    this.status = options?.status ?? revenueErrorHttpStatus(code);
    this.details = options?.details;
  }
}

export function revenueErrorHttpStatus(code: RevenueErrorCode): number {
  switch (code) {
    case "NOT_AUTHORIZED":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "FEATURE_DISABLED":
      return 503;
    case "VALIDATION_FAILED":
    case "DUPLICATE_OPPORTUNITY":
    case "INSUFFICIENT_EVIDENCE":
    case "LOW_CONFIDENCE":
    case "APPROVAL_REQUIRED":
      return 400;
    case "WORKFLOW_UNAVAILABLE":
    case "GMAIL_NOT_CONFIGURED":
      return 503;
    case "BUDGET_EXCEEDED":
      return 429;
    case "CONVERSION_FAILED":
      return 500;
    default:
      return 500;
  }
}

export function isRevenueOpportunityError(err: unknown): err is RevenueOpportunityError {
  return err instanceof RevenueOpportunityError;
}
