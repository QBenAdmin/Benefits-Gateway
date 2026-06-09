import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditErtResponsesTable = pgTable("audit_ert_responses", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  questionId: text("question_id").notNull(),
  answered: boolean("answered").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAuditErtResponseSchema = createInsertSchema(auditErtResponsesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAuditErtResponse = z.infer<typeof insertAuditErtResponseSchema>;
export type AuditErtResponse = typeof auditErtResponsesTable.$inferSelect;
