import { relations } from "drizzle-orm";
import {
  users,
  refreshTokens,
  passwordResetTokens,
  emailVerificationTokens,
  institutions,
  courses,
  modules,
  lectures,
  materials,
  studyAids,
  userPreferences,
  enrollments,
  progress,
  messagePacks,
  messagePackPurchases,
  chatSessions,
  chatMessages,
  courseUploads,
  generationJobs,
} from "./schema";

// ── User Relations ──

export const usersRelations = relations(users, ({ many, one }) => ({
  refreshTokens: many(refreshTokens),
  passwordResetTokens: many(passwordResetTokens),
  emailVerificationTokens: many(emailVerificationTokens),
  courses: many(courses),
  enrollments: many(enrollments),
  progress: many(progress),
  chatSessions: many(chatSessions),
  preferences: one(userPreferences),
  purchases: many(messagePackPurchases),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  })
);

export const emailVerificationTokensRelations = relations(
  emailVerificationTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [emailVerificationTokens.userId],
      references: [users.id],
    }),
  })
);

// ── Institution Relations ──

export const institutionsRelations = relations(institutions, ({ many }) => ({
  courses: many(courses),
}));

// ── Course Relations ──

export const coursesRelations = relations(courses, ({ one, many }) => ({
  institution: one(institutions, {
    fields: [courses.institutionId],
    references: [institutions.id],
  }),
  creator: one(users, {
    fields: [courses.createdBy],
    references: [users.id],
  }),
  modules: many(modules),
  enrollments: many(enrollments),
  uploads: many(courseUploads),
  generationJobs: many(generationJobs),
}));

// ── Module Relations ──

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lectures: many(lectures),
}));

// ── Lecture Relations ──

export const lecturesRelations = relations(lectures, ({ one, many }) => ({
  module: one(modules, {
    fields: [lectures.moduleId],
    references: [modules.id],
  }),
  materials: many(materials),
  studyAid: one(studyAids),
  progress: many(progress),
  chatSessions: many(chatSessions),
}));

// ── Material Relations ──

export const materialsRelations = relations(materials, ({ one }) => ({
  lecture: one(lectures, {
    fields: [materials.lectureId],
    references: [lectures.id],
  }),
}));

// ── Study Aid Relations ──

export const studyAidsRelations = relations(studyAids, ({ one }) => ({
  lecture: one(lectures, {
    fields: [studyAids.lectureId],
    references: [lectures.id],
  }),
}));

// ── User Preferences Relations ──

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
  })
);

// ── Enrollment Relations ──

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

// ── Progress Relations ──

export const progressRelations = relations(progress, ({ one }) => ({
  user: one(users, {
    fields: [progress.userId],
    references: [users.id],
  }),
  lecture: one(lectures, {
    fields: [progress.lectureId],
    references: [lectures.id],
  }),
}));

// ── Message Pack Relations ──

export const messagePacksRelations = relations(messagePacks, ({ many }) => ({
  purchases: many(messagePackPurchases),
}));

export const messagePackPurchasesRelations = relations(
  messagePackPurchases,
  ({ one }) => ({
    user: one(users, {
      fields: [messagePackPurchases.userId],
      references: [users.id],
    }),
    course: one(courses, {
      fields: [messagePackPurchases.courseId],
      references: [courses.id],
    }),
    pack: one(messagePacks, {
      fields: [messagePackPurchases.packId],
      references: [messagePacks.id],
    }),
  })
);

// ── Chat Relations ──

// ── Course Upload Relations ──

export const courseUploadsRelations = relations(courseUploads, ({ one }) => ({
  course: one(courses, {
    fields: [courseUploads.courseId],
    references: [courses.id],
  }),
}));

// ── Generation Job Relations ──

export const generationJobsRelations = relations(
  generationJobs,
  ({ one }) => ({
    course: one(courses, {
      fields: [generationJobs.courseId],
      references: [courses.id],
    }),
  })
);

export const chatSessionsRelations = relations(
  chatSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [chatSessions.userId],
      references: [users.id],
    }),
    lecture: one(lectures, {
      fields: [chatSessions.lectureId],
      references: [lectures.id],
    }),
    messages: many(chatMessages),
  })
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));
