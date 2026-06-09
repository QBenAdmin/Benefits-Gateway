import { pgTable, serial, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditStatisticalResultsTable = pgTable("audit_statistical_results", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  metricType: text("metric_type").notNull(),
  groupA: text("group_a").notNull(),
  groupB: text("group_b").notNull(),
  groupARate: real("group_a_rate"),
  groupBRate: real("group_b_rate"),
  value: real("value"),
  threshold: real("threshold"),
  passed: boolean("passed"),
  riskLevel: text("risk_level"),
  pValue: real("p_value"),
  significant: boolean("significant"),
  testType: text("test_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditStatisticalResultSchema = createInsertSchema(auditStatisticalResultsTable).omit({ id: true, createdAt: true });
export type InsertAuditStatisticalResult = z.infer<typeof insertAuditStatisticalResultSchema>;
export type AuditStatisticalResult = typeof auditStatisticalResultsTable.$inferSelect;
