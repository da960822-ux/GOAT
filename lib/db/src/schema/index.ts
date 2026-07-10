import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  inet,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  }),
).enableRLS();

export const userIdentitiesTable = pgTable(
  "user_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerSubject: text("provider_subject").notNull(),
    providerEmail: text("provider_email"),
    providerDisplayName: text("provider_display_name"),
    providerAvatarUrl: text("provider_avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    providerSubjectIdx: uniqueIndex("user_identities_provider_subject_idx").on(
      table.provider,
      table.providerSubject,
    ),
    userIdx: index("user_identities_user_idx").on(table.userId),
    providerCheck: check("user_identities_provider_check", sql`${table.provider} in ('google', 'kakao')`),
  }),
).enableRLS();

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    userIdx: index("sessions_user_idx").on(table.userId),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  }),
).enableRLS();

export const oauthStatesTable = pgTable(
  "oauth_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stateHash: text("state_hash").notNull(),
    provider: text("provider").notNull(),
    redirectTo: text("redirect_to"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    stateHashIdx: uniqueIndex("oauth_states_state_hash_idx").on(table.stateHash),
    expiresAtIdx: index("oauth_states_expires_at_idx").on(table.expiresAt),
    providerCheck: check("oauth_states_provider_check", sql`${table.provider} in ('google', 'kakao')`),
  }),
).enableRLS();

export const bookmarksTable = pgTable(
  "bookmarks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    placeId: text("place_id").notNull(),
    source: text("source").default("place_detail").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.placeId] }),
    userIdx: index("bookmarks_user_idx").on(table.userId),
    placeIdx: index("bookmarks_place_idx").on(table.placeId),
  }),
).enableRLS();

export const recommendationLogsTable = pgTable(
  "recommendation_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    moodId: text("mood_id"),
    referenceCardId: text("reference_card_id"),
    request: jsonb("request").notNull(),
    recommendedPlaceIds: jsonb("recommended_place_ids").$type<string[]>().notNull(),
    excludedPlaceIds: jsonb("excluded_place_ids").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedAtIdx: index("recommendation_logs_user_created_at_idx").on(table.userId, table.createdAt),
    moodIdx: index("recommendation_logs_mood_idx").on(table.moodId),
    referenceCardIdx: index("recommendation_logs_reference_card_idx").on(table.referenceCardId),
  }),
).enableRLS();

export const usersRelations = relations(usersTable, ({ many }) => ({
  bookmarks: many(bookmarksTable),
  identities: many(userIdentitiesTable),
  recommendationLogs: many(recommendationLogsTable),
  sessions: many(sessionsTable),
}));

export const userIdentitiesRelations = relations(userIdentitiesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userIdentitiesTable.userId],
    references: [usersTable.id],
  }),
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
}));

export const bookmarksRelations = relations(bookmarksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [bookmarksTable.userId],
    references: [usersTable.id],
  }),
}));

export const recommendationLogsRelations = relations(recommendationLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [recommendationLogsTable.userId],
    references: [usersTable.id],
  }),
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});
export const insertUserIdentitySchema = createInsertSchema(userIdentitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  id: true,
  createdAt: true,
  lastSeenAt: true,
  revokedAt: true,
});
export const insertOauthStateSchema = createInsertSchema(oauthStatesTable).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});
export const insertBookmarkSchema = createInsertSchema(bookmarksTable).omit({
  createdAt: true,
});
export const insertRecommendationLogSchema = createInsertSchema(recommendationLogsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type InsertUserIdentity = z.infer<typeof insertUserIdentitySchema>;
export type UserIdentity = typeof userIdentitiesTable.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
export type InsertOauthState = z.infer<typeof insertOauthStateSchema>;
export type OauthState = typeof oauthStatesTable.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarksTable.$inferSelect;
export type InsertRecommendationLog = z.infer<typeof insertRecommendationLogSchema>;
export type RecommendationLog = typeof recommendationLogsTable.$inferSelect;
