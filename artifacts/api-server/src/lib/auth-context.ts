import type { Request } from "express";
import { ApiError } from "./api-response";
import {
  getUserFromSessionToken,
  sessionCookieName,
  type AuthenticatedUser,
} from "./auth";

export async function getOptionalAuthenticatedUser(
  req: Request,
): Promise<AuthenticatedUser | null> {
  return getUserFromSessionToken(req.cookies?.[sessionCookieName]);
}

export async function requireAuthenticatedUser(
  req: Request,
): Promise<AuthenticatedUser> {
  const user = await getOptionalAuthenticatedUser(req);
  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
  }
  return user;
}
