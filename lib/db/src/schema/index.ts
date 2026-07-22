import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  inet,
  integer,
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerSubjectIdx: uniqueIndex("user_identities_provider_subject_idx").on(
      table.provider,
      table.providerSubject,
    ),
    userIdx: index("user_identities_user_idx").on(table.userId),
    providerCheck: check(
      "user_identities_provider_check",
      sql`${table.provider} in ('google', 'kakao')`,
    ),
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
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    stateHashIdx: uniqueIndex("oauth_states_state_hash_idx").on(
      table.stateHash,
    ),
    expiresAtIdx: index("oauth_states_expires_at_idx").on(table.expiresAt),
    providerCheck: check(
      "oauth_states_provider_check",
      sql`${table.provider} in ('google', 'kakao')`,
    ),
  }),
).enableRLS();

export const bookmarksTable = pgTable(
  "bookmarks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    placeId: text("place_id").notNull(),
    placeNameAtSave: text("place_name_at_save").notNull(),
    regionAtSave: text("region_at_save"),
    source: text("source").default("place_detail").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.placeId] }),
    userIdx: index("bookmarks_user_idx").on(table.userId),
    placeIdx: index("bookmarks_place_idx").on(table.placeId),
  }),
).enableRLS();

export const recommendationSessionsTable = pgTable(
  "recommendation_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    conditions: jsonb("conditions").$type<Record<string, unknown>>().notNull(),
    policyVersion: text("policy_version").notNull(),
    fallbackUsed: boolean("fallback_used").default(false).notNull(),
    fallbackReason: text("fallback_reason"),
    decisionAudit: jsonb("decision_audit").$type<unknown>(),
    originStatus: text("origin_status"),
    originNotice: text("origin_notice"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userCreatedAtIdx: index("recommendation_sessions_user_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    policyCreatedAtIdx: index(
      "recommendation_sessions_policy_created_at_idx",
    ).on(table.policyVersion, table.createdAt),
    fallbackCreatedAtIdx: index(
      "recommendation_sessions_fallback_created_at_idx",
    )
      .on(table.createdAt)
      .where(sql`${table.fallbackUsed} = true`),
    policyVersionCheck: check(
      "recommendation_sessions_policy_version_check",
      sql`length(btrim(${table.policyVersion})) > 0`,
    ),
    decisionAuditCheck: check(
      "recommendation_sessions_decision_audit_check",
      sql`${table.decisionAudit} is null or jsonb_typeof(${table.decisionAudit}) = 'object'`,
    ),
    originStatusCheck: check(
      "recommendation_sessions_origin_status_check",
      sql`${table.originStatus} is null or ${table.originStatus} in ('APPLIED', 'SKIPPED', 'UNAVAILABLE')`,
    ),
  }),
).enableRLS();

export const recommendationRequestsTable = pgTable(
  "recommendation_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").default("PROCESSING").notNull(),
    recommendationId: uuid("recommendation_id").references(
      () => recommendationSessionsTable.id,
      { onDelete: "set null" },
    ),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userKeyIdx: uniqueIndex("recommendation_requests_user_key_idx").on(
      table.userId,
      table.idempotencyKey,
    ),
    recommendationIdx: index("recommendation_requests_recommendation_idx").on(
      table.recommendationId,
    ),
    statusCheck: check(
      "recommendation_requests_status_check",
      sql`${table.status} in ('PROCESSING', 'COMPLETED', 'FAILED')`,
    ),
  }),
).enableRLS();

export const recommendationSessionPlacesTable = pgTable(
  "recommendation_session_places",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendationSessionsTable.id, {
        onDelete: "cascade",
      }),
    placeId: text("place_id").notNull(),
    placeNameAtRecommendation: text("place_name_at_recommendation").notNull(),
    regionAtRecommendation: text("region_at_recommendation"),
    rank: integer("rank").notNull(),
    role: text("role").notNull(),
    score: integer("score").notNull(),
    scoreDetails: jsonb("score_details")
      .$type<unknown>()
      .notNull(),
    reasons: jsonb("reasons").$type<string[]>().notNull(),
    moodScore: integer("mood_score"),
    conditionScore: integer("condition_score"),
    baseScore: integer("base_score"),
    originDistanceBonus: integer("origin_distance_bonus"),
    routeInfo: jsonb("route_info").$type<{
      from: "ORIGIN" | "FIRST_CARD";
      fromLabel: string;
      distanceKm: number;
      durationMin?: number;
      source: "KAKAO_ROUTE" | "HAVERSINE";
      estimated: boolean;
      scoreApplied: boolean;
    }>(),
    routeDistanceBonus: integer("route_distance_bonus"),
    duplicatePenalty: integer("duplicate_penalty"),
    exposurePenalty: integer("exposure_penalty"),
    coverageBoost: integer("coverage_boost"),
    lowExposureBoost: integer("low_exposure_boost"),
    selectionScore: integer("selection_score"),
    displayScore: integer("display_score"),
    cautions: jsonb("cautions").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    recommendationIdx: index(
      "recommendation_session_places_recommendation_idx",
    ).on(table.recommendationId),
    recommendationPlaceIdx: uniqueIndex(
      "recommendation_session_places_recommendation_place_idx",
    ).on(table.recommendationId, table.placeId),
    recommendationRankIdx: uniqueIndex(
      "recommendation_session_places_recommendation_rank_idx",
    ).on(table.recommendationId, table.rank),
    rankCheck: check(
      "recommendation_session_places_rank_check",
      sql`${table.rank} between 1 and 3`,
    ),
    moodScoreCheck: check(
      "recommendation_session_places_mood_score_check",
      sql`${table.moodScore} is null or ${table.moodScore} between 0 and 45`,
    ),
    conditionScoreCheck: check(
      "recommendation_session_places_condition_score_check",
      sql`${table.conditionScore} is null or ${table.conditionScore} between 0 and 45`,
    ),
    baseScoreCheck: check(
      "recommendation_session_places_base_score_check",
      sql`${table.baseScore} is null or ${table.baseScore} between 0 and 90`,
    ),
    originDistanceBonusCheck: check(
      "recommendation_session_places_origin_distance_bonus_check",
      sql`${table.originDistanceBonus} is null or ${table.originDistanceBonus} between 0 and 10`,
    ),
    routeInfoCheck: check(
      "recommendation_session_places_route_info_check",
      sql`${table.routeInfo} is null or jsonb_typeof(${table.routeInfo}) = 'object'`,
    ),
    routeDistanceBonusCheck: check(
      "recommendation_session_places_route_distance_bonus_check",
      sql`${table.routeDistanceBonus} is null or ${table.routeDistanceBonus} between 0 and 10`,
    ),
    duplicatePenaltyCheck: check(
      "recommendation_session_places_duplicate_penalty_check",
      sql`${table.duplicatePenalty} is null or ${table.duplicatePenalty} between 0 and 6`,
    ),
    exposurePenaltyCheck: check(
      "recommendation_session_places_exposure_penalty_check",
      sql`${table.exposurePenalty} is null or ${table.exposurePenalty} between 0 and 5`,
    ),
    coverageBoostCheck: check(
      "recommendation_session_places_coverage_boost_check",
      sql`${table.coverageBoost} is null or ${table.coverageBoost} between 0 and 3`,
    ),
    lowExposureBoostCheck: check(
      "recommendation_session_places_low_exposure_boost_check",
      sql`${table.lowExposureBoost} is null or ${table.lowExposureBoost} between 0 and 3`,
    ),
    selectionScoreCheck: check(
      "recommendation_session_places_selection_score_check",
      sql`${table.selectionScore} is null or ${table.selectionScore} between -11 and 116`,
    ),
    displayScoreCheck: check(
      "recommendation_session_places_display_score_check",
      sql`${table.displayScore} is null or ${table.displayScore} between 0 and 100`,
    ),
    cautionsCheck: check(
      "recommendation_session_places_cautions_check",
      sql`jsonb_typeof(${table.cautions}) = 'array'`,
    ),
    placeCreatedAtIdx: index(
      "recommendation_session_places_place_created_at_idx",
    ).on(table.placeId, table.createdAt),
  }),
).enableRLS();

export const recommendationSessionWarningsTable = pgTable(
  "recommendation_session_warnings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendationSessionsTable.id, {
        onDelete: "cascade",
      }),
    warningCode: text("warning_code").notNull(),
    warningMessage: text("warning_message").notNull(),
    warningDetails: jsonb("warning_details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    recommendationCodeIdx: uniqueIndex(
      "recommendation_session_warnings_recommendation_code_idx",
    ).on(table.recommendationId, table.warningCode),
    codeCreatedAtIdx: index(
      "recommendation_session_warnings_code_created_at_idx",
    ).on(table.warningCode, table.createdAt),
    codeCheck: check(
      "recommendation_session_warnings_code_check",
      sql`length(btrim(${table.warningCode})) > 0`,
    ),
    detailsCheck: check(
      "recommendation_session_warnings_details_check",
      sql`${table.warningDetails} is null or jsonb_typeof(${table.warningDetails}) = 'object'`,
    ),
  }),
).enableRLS();

export const recommendedCoursesTable = pgTable(
  "recommended_courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendationSessionsTable.id, {
        onDelete: "cascade",
      }),
    selectedPlaceId: text("selected_place_id").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    mode: text("mode").notNull(),
    course: jsonb("course").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    recommendationIdx: uniqueIndex("recommended_courses_recommendation_idx").on(
      table.recommendationId,
    ),
  }),
).enableRLS();

export const recommendationFeedbackTable = pgTable(
  "recommendation_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendationSessionsTable.id, {
        onDelete: "cascade",
      }),
    placeId: text("place_id").notNull(),
    feedbackType: text("feedback_type").notNull(),
    reasonCode: text("reason_code"),
    reasonText: text("reason_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userRecommendationPlaceIdx: uniqueIndex(
      "recommendation_feedback_user_recommendation_place_idx",
    ).on(table.userId, table.recommendationId, table.placeId),
    userPlaceIdx: index("recommendation_feedback_user_place_idx").on(
      table.userId,
      table.placeId,
    ),
    recommendationIdx: index("recommendation_feedback_recommendation_idx").on(
      table.recommendationId,
    ),
    typeCheck: check(
      "recommendation_feedback_type_check",
      sql`${table.feedbackType} in ('LIKE', 'DISLIKE')`,
    ),
  }),
).enableRLS();

export const recommendationLogsTable = pgTable(
  "recommendation_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    moodId: text("mood_id"),
    referenceCardId: text("reference_card_id"),
    request: jsonb("request").notNull(),
    recommendedPlaceIds: jsonb("recommended_place_ids")
      .$type<string[]>()
      .notNull(),
    excludedPlaceIds: jsonb("excluded_place_ids")
      .$type<string[]>()
      .default([])
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userCreatedAtIdx: index("recommendation_logs_user_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    moodIdx: index("recommendation_logs_mood_idx").on(table.moodId),
    referenceCardIdx: index("recommendation_logs_reference_card_idx").on(
      table.referenceCardId,
    ),
  }),
).enableRLS();

export const usersRelations = relations(usersTable, ({ many }) => ({
  bookmarks: many(bookmarksTable),
  recommendationFeedback: many(recommendationFeedbackTable),
  recommendationRequests: many(recommendationRequestsTable),
  recommendationSessions: many(recommendationSessionsTable),
  identities: many(userIdentitiesTable),
  recommendationLogs: many(recommendationLogsTable),
  sessions: many(sessionsTable),
}));

export const recommendationSessionsRelations = relations(
  recommendationSessionsTable,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [recommendationSessionsTable.userId],
      references: [usersTable.id],
    }),
    places: many(recommendationSessionPlacesTable),
    warnings: many(recommendationSessionWarningsTable),
    courses: many(recommendedCoursesTable),
    feedback: many(recommendationFeedbackTable),
    requests: many(recommendationRequestsTable),
  }),
);

export const recommendationSessionPlacesRelations = relations(
  recommendationSessionPlacesTable,
  ({ one }) => ({
    recommendation: one(recommendationSessionsTable, {
      fields: [recommendationSessionPlacesTable.recommendationId],
      references: [recommendationSessionsTable.id],
    }),
  }),
);

export const recommendationSessionWarningsRelations = relations(
  recommendationSessionWarningsTable,
  ({ one }) => ({
    recommendation: one(recommendationSessionsTable, {
      fields: [recommendationSessionWarningsTable.recommendationId],
      references: [recommendationSessionsTable.id],
    }),
  }),
);

export const recommendedCoursesRelations = relations(
  recommendedCoursesTable,
  ({ one }) => ({
    recommendation: one(recommendationSessionsTable, {
      fields: [recommendedCoursesTable.recommendationId],
      references: [recommendationSessionsTable.id],
    }),
  }),
);

export const recommendationFeedbackRelations = relations(
  recommendationFeedbackTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [recommendationFeedbackTable.userId],
      references: [usersTable.id],
    }),
    recommendation: one(recommendationSessionsTable, {
      fields: [recommendationFeedbackTable.recommendationId],
      references: [recommendationSessionsTable.id],
    }),
  }),
);

export const recommendationRequestsRelations = relations(
  recommendationRequestsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [recommendationRequestsTable.userId],
      references: [usersTable.id],
    }),
    recommendation: one(recommendationSessionsTable, {
      fields: [recommendationRequestsTable.recommendationId],
      references: [recommendationSessionsTable.id],
    }),
  }),
);

export const userIdentitiesRelations = relations(
  userIdentitiesTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [userIdentitiesTable.userId],
      references: [usersTable.id],
    }),
  }),
);

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

export const recommendationLogsRelations = relations(
  recommendationLogsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [recommendationLogsTable.userId],
      references: [usersTable.id],
    }),
  }),
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});
export const insertUserIdentitySchema = createInsertSchema(
  userIdentitiesTable,
).omit({
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
export const insertOauthStateSchema = createInsertSchema(oauthStatesTable).omit(
  {
    id: true,
    createdAt: true,
    usedAt: true,
  },
);
export const insertBookmarkSchema = createInsertSchema(bookmarksTable).omit({
  createdAt: true,
});
export const insertRecommendationSessionSchema = createInsertSchema(
  recommendationSessionsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertRecommendationRequestSchema = createInsertSchema(
  recommendationRequestsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertRecommendationSessionPlaceSchema = createInsertSchema(
  recommendationSessionPlacesTable,
).omit({ id: true, createdAt: true });
export const insertRecommendationSessionWarningSchema = createInsertSchema(
  recommendationSessionWarningsTable,
).omit({ id: true, createdAt: true });
export const insertRecommendedCourseSchema = createInsertSchema(
  recommendedCoursesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertRecommendationFeedbackSchema = createInsertSchema(
  recommendationFeedbackTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertRecommendationLogSchema = createInsertSchema(
  recommendationLogsTable,
).omit({
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
export type RecommendationSession =
  typeof recommendationSessionsTable.$inferSelect;
export type RecommendationRequest =
  typeof recommendationRequestsTable.$inferSelect;
export type RecommendationSessionPlace =
  typeof recommendationSessionPlacesTable.$inferSelect;
export type RecommendationSessionWarning =
  typeof recommendationSessionWarningsTable.$inferSelect;
export type InsertRecommendationSessionWarning = z.infer<
  typeof insertRecommendationSessionWarningSchema
>;
export type RecommendedCourse = typeof recommendedCoursesTable.$inferSelect;
export type RecommendationFeedback =
  typeof recommendationFeedbackTable.$inferSelect;
export type InsertRecommendationLog = z.infer<
  typeof insertRecommendationLogSchema
>;
export type RecommendationLog = typeof recommendationLogsTable.$inferSelect;
