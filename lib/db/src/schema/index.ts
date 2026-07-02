import { relations } from "drizzle-orm";
import {
  index,
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
    authProvider: text("auth_provider").notNull(),
    authSubject: text("auth_subject").notNull(),
    email: text("email"),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    authIdentityIdx: uniqueIndex("users_auth_identity_idx").on(table.authProvider, table.authSubject),
    emailIdx: index("users_email_idx").on(table.email),
  }),
);

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
);

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
);

export const usersRelations = relations(usersTable, ({ many }) => ({
  bookmarks: many(bookmarksTable),
  recommendationLogs: many(recommendationLogsTable),
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
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarksTable.$inferSelect;
export type InsertRecommendationLog = z.infer<typeof insertRecommendationLogSchema>;
export type RecommendationLog = typeof recommendationLogsTable.$inferSelect;
