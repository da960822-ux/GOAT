import { Router, type IRouter, type Request, type Response } from "express";
import { ApiError } from "../lib/api-response";
import {
  createOauthStart,
  createSession,
  consumeOauthState,
  exchangeCodeForProfile,
  getClearCookieOptions,
  getCookieOptions,
  getFailureRedirect,
  getSuccessRedirect,
  getUserFromSessionToken,
  revokeSessionToken,
  sanitizeInternalRedirect,
  sessionCookieName,
  type AuthProvider,
  upsertUserFromIdentity,
} from "../lib/auth";

const router: IRouter = Router();

function getClientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || null;
}

async function startAuth(req: Request, res: Response, provider: AuthProvider) {
  const redirectTo = sanitizeInternalRedirect(req.query.redirect_to);
  const loginUrl = await createOauthStart(provider, redirectTo);
  res.redirect(loginUrl);
}

async function handleCallback(req: Request, res: Response, provider: AuthProvider) {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;

  if (!code || !state) {
    res.redirect(getFailureRedirect());
    return;
  }

  try {
    const oauthState = await consumeOauthState(provider, state);
    if (!oauthState) {
      res.redirect(getFailureRedirect());
      return;
    }

    const profile = await exchangeCodeForProfile(provider, code);
    const user = await upsertUserFromIdentity(provider, profile);
    const { token } = await createSession({
      userId: user.id,
      userAgent: req.get("user-agent") ?? null,
      ipAddress: getClientIp(req),
    });

    res.cookie(sessionCookieName, token, getCookieOptions());
    res.redirect(getSuccessRedirect(oauthState.redirectTo));
  } catch (error) {
    req.log?.error({ err: error, provider }, "OAuth callback failed");
    res.redirect(getFailureRedirect());
  }
}

router.get("/auth/google/start", (req, res, next) => {
  startAuth(req, res, "google").catch(next);
});

router.get("/auth/google/callback", (req, res) => {
  handleCallback(req, res, "google");
});

router.get("/auth/kakao/start", (req, res, next) => {
  startAuth(req, res, "kakao").catch(next);
});

router.get("/auth/kakao/callback", (req, res) => {
  handleCallback(req, res, "kakao");
});

router.get("/auth/me", async (req, res, next) => {
  try {
    const user = await getUserFromSessionToken(req.cookies?.[sessionCookieName]);
    if (!user) {
      next(new ApiError(401, "UNAUTHENTICATED", "Authentication is required."));
      return;
    }

    res.json({
      success: true,
      code: "SUCCESS",
      message: "Authenticated user loaded.",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", async (req, res, next) => {
  try {
    await revokeSessionToken(req.cookies?.[sessionCookieName]);
    res.clearCookie(sessionCookieName, getClearCookieOptions());
    res.json({
      success: true,
      code: "SUCCESS",
      message: "Logged out.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
