import crypto from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db, oauthStatesTable, sessionsTable, userIdentitiesTable, usersTable } from "@workspace/db";

export type AuthProvider = "google" | "kakao";

export type ProviderProfile = {
  subject: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  provider: AuthProvider;
};

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const providerScopes: Partial<Record<AuthProvider, string[]>> = {
  google: ["openid", "email", "profile"],
};

const requiredEnvByProvider: Record<AuthProvider, { clientId: string; clientSecret?: string }> = {
  google: {
    clientId: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecret: "GOOGLE_OAUTH_CLIENT_SECRET",
  },
  kakao: {
    clientId: "KAKAO_REST_API_KEY",
    clientSecret: "KAKAO_OAUTH_CLIENT_SECRET",
  },
};

export const sessionCookieName = "goat.sid";
export const sessionMaxAgeSeconds = SESSION_TTL_MS / 1000;

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionMaxAgeSeconds * 1000,
  };
}

export function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export function createRandomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function timingSafeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function getAuthBaseUrl() {
  return getRequiredEnv("AUTH_BASE_URL").replace(/\/+$/, "");
}

function getProviderClient(provider: AuthProvider) {
  const config = requiredEnvByProvider[provider];
  const clientSecret = config.clientSecret ? process.env[config.clientSecret]?.trim() : undefined;
  return {
    clientId: getRequiredEnv(config.clientId),
    clientSecret: clientSecret || undefined,
  };
}

export function getRedirectUri(provider: AuthProvider) {
  return `${getAuthBaseUrl()}/api/auth/${provider}/callback`;
}

export function sanitizeInternalRedirect(value: unknown) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }

  try {
    const parsed = new URL(value, "https://goat.local");
    if (parsed.origin !== "https://goat.local") {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function getSuccessRedirect(redirectTo: string | null) {
  return redirectTo ?? process.env.AUTH_SUCCESS_REDIRECT_URL ?? "/";
}

export function getFailureRedirect() {
  return process.env.AUTH_FAILURE_REDIRECT_URL ?? "/login?auth=failed";
}

export async function createOauthStart(provider: AuthProvider, redirectTo: string | null) {
  const { clientId } = getProviderClient(provider);
  const state = createRandomToken();
  const stateHash = hashToken(state);

  await db.insert(oauthStatesTable).values({
    stateHash,
    provider,
    redirectTo,
    expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
  });

  const authorizeUrl =
    provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL("https://kauth.kakao.com/oauth/authorize");

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", getRedirectUri(provider));
  authorizeUrl.searchParams.set("response_type", "code");
  const scopes = providerScopes[provider];
  if (scopes && scopes.length > 0) {
    authorizeUrl.searchParams.set("scope", scopes.join(" "));
  }
  authorizeUrl.searchParams.set("state", state);

  if (provider === "google") {
    authorizeUrl.searchParams.set("access_type", "online");
    authorizeUrl.searchParams.set("prompt", "select_account");
  }

  return authorizeUrl.toString();
}

export async function consumeOauthState(provider: AuthProvider, state: string) {
  const stateHash = hashToken(state);
  const [row] = await db
    .select()
    .from(oauthStatesTable)
    .where(
      and(
        eq(oauthStatesTable.stateHash, stateHash),
        eq(oauthStatesTable.provider, provider),
        gt(oauthStatesTable.expiresAt, new Date()),
        isNull(oauthStatesTable.usedAt),
      ),
    )
    .limit(1);

  if (!row || !timingSafeEqualText(row.stateHash, stateHash)) {
    return null;
  }

  const [used] = await db
    .update(oauthStatesTable)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(oauthStatesTable.id, row.id),
        isNull(oauthStatesTable.usedAt),
        gt(oauthStatesTable.expiresAt, new Date()),
      ),
    )
    .returning();

  return used ?? null;
}

async function requestToken(provider: AuthProvider, code: string) {
  const { clientId, clientSecret } = getProviderClient(provider);
  const endpoint =
    provider === "google" ? "https://oauth2.googleapis.com/token" : "https://kauth.kakao.com/oauth/token";
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: getRedirectUri(provider),
    code,
  });
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`${provider} token request failed with ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error(`${provider} token response did not include access_token`);
  }

  return data.access_token;
}

async function fetchProviderProfile(provider: AuthProvider, accessToken: string): Promise<ProviderProfile> {
  const endpoint =
    provider === "google"
      ? "https://www.googleapis.com/oauth2/v3/userinfo"
      : "https://kapi.kakao.com/v2/user/me";

  const response = await fetch(endpoint, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`${provider} profile request failed with ${response.status}`);
  }

  const data = await response.json();

  if (provider === "google") {
    const profile = data as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!profile.sub) {
      throw new Error("google profile did not include sub");
    }
    return {
      subject: profile.sub,
      email: profile.email ?? null,
      displayName: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
    };
  }

  const profile = data as {
    id?: number | string;
    kakao_account?: {
      email?: string;
      profile?: {
        nickname?: string;
        profile_image_url?: string;
        thumbnail_image_url?: string;
      };
    };
    properties?: {
      nickname?: string;
      profile_image?: string;
      thumbnail_image?: string;
    };
  };

  if (profile.id === undefined || profile.id === null) {
    throw new Error("kakao profile did not include id");
  }

  return {
    subject: String(profile.id),
    email: profile.kakao_account?.email ?? null,
    displayName: profile.kakao_account?.profile?.nickname ?? profile.properties?.nickname ?? null,
    avatarUrl:
      profile.kakao_account?.profile?.profile_image_url ??
      profile.kakao_account?.profile?.thumbnail_image_url ??
      profile.properties?.profile_image ??
      profile.properties?.thumbnail_image ??
      null,
  };
}

export async function exchangeCodeForProfile(provider: AuthProvider, code: string) {
  const accessToken = await requestToken(provider, code);
  return fetchProviderProfile(provider, accessToken);
}

export async function upsertUserFromIdentity(provider: AuthProvider, profile: ProviderProfile) {
  return db.transaction(async (tx) => {
    const [identity] = await tx
      .select({ user: usersTable, identity: userIdentitiesTable })
      .from(userIdentitiesTable)
      .innerJoin(usersTable, eq(userIdentitiesTable.userId, usersTable.id))
      .where(
        and(
          eq(userIdentitiesTable.provider, provider),
          eq(userIdentitiesTable.providerSubject, profile.subject),
        ),
      )
      .limit(1);

    if (identity) {
      const [updatedUser] = await tx
        .update(usersTable)
        .set({
          email: profile.email ?? identity.user.email,
          displayName: profile.displayName ?? identity.user.displayName,
          avatarUrl: profile.avatarUrl ?? identity.user.avatarUrl,
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        })
        .where(eq(usersTable.id, identity.user.id))
        .returning();

      await tx
        .update(userIdentitiesTable)
        .set({
          providerEmail: profile.email,
          providerDisplayName: profile.displayName,
          providerAvatarUrl: profile.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(userIdentitiesTable.id, identity.identity.id));

      return updatedUser;
    }

    const [createdUser] = await tx
      .insert(usersTable)
      .values({
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        lastLoginAt: new Date(),
      })
      .returning();

    await tx.insert(userIdentitiesTable).values({
      userId: createdUser.id,
      provider,
      providerSubject: profile.subject,
      providerEmail: profile.email,
      providerDisplayName: profile.displayName,
      providerAvatarUrl: profile.avatarUrl,
    });

    return createdUser;
  });
}

export async function createSession(input: {
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
}) {
  const token = createRandomToken();
  const tokenHash = hashToken(token);
  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId: input.userId,
      tokenHash,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    })
    .returning();

  return { token, session };
}

export async function getUserFromSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      session: sessionsTable,
      user: usersTable,
      identity: userIdentitiesTable,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .innerJoin(userIdentitiesTable, eq(userIdentitiesTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.tokenHash, tokenHash),
        gt(sessionsTable.expiresAt, new Date()),
        isNull(sessionsTable.revokedAt),
      ),
    )
    .limit(1);

  if (!row || !timingSafeEqualText(row.session.tokenHash, tokenHash)) {
    return null;
  }

  await db
    .update(sessionsTable)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessionsTable.id, row.session.id));

  return {
    id: row.user.id,
    email: row.user.email,
    displayName: row.user.displayName,
    avatarUrl: row.user.avatarUrl,
    lastLoginAt: row.user.lastLoginAt,
    provider: row.identity.provider as AuthProvider,
  } satisfies AuthenticatedUser;
}

export async function revokeSessionToken(token: string | undefined) {
  if (!token) {
    return;
  }

  await db
    .update(sessionsTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessionsTable.tokenHash, hashToken(token)),
        isNull(sessionsTable.revokedAt),
      ),
    );
}

export async function cleanupExpiredAuthRows() {
  await db.delete(oauthStatesTable).where(lt(oauthStatesTable.expiresAt, new Date()));
  await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
}
