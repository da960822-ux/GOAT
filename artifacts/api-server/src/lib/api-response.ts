import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly data: unknown = null,
  ) {
    super(message);
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, "NOT_FOUND", `${req.method} ${req.originalUrl} 경로를 찾을 수 없습니다.`));
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
      data: error.data,
    });
    return;
  }

  const isMalformedJson =
    error instanceof SyntaxError &&
    "status" in error &&
    (error as SyntaxError & { status: number }).status === 400;

  if (!isMalformedJson) {
    req.log?.error({ err: error }, "Unhandled API error");
  }

  res.status(isMalformedJson ? 400 : 500).json({
    success: false,
    code: isMalformedJson ? "INVALID_REQUEST" : "INTERNAL_SERVER_ERROR",
    message: isMalformedJson ? "요청 JSON 형식이 올바르지 않습니다." : "서버 오류가 발생했습니다.",
    data: null,
  });
}
