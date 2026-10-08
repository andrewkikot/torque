export class AppError extends Error {
  constructor(
    public code: "not_found" | "forbidden" | "invalid" | "rate_limited" | "not_configured",
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function notFound(what = "Resource"): never {
  throw new AppError("not_found", `${what} not found`);
}
