import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employersTable } from "./employers";

export const enrollmentPeriodsTable = pgTable("enrollment_periods", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").references(() => employersTable.id),
  name: text("name").notNull(),
  type: text("type").notNull().default("open"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  allowEmployeeChanges: boolean("allow_employee_changes").notNull().default(true),
  requireApprovalOutsidePeriod: boolean("require_approval_outside_period").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEnrollmentPeriodSchema = createInsertSchema(enrollmentPeriodsTable).omit({ id: true, createdAt: true });
export type InsertEnrollmentPeriod = z.infer<typeof insertEnrollmentPeriodSchema>;
export type EnrollmentPeriod = typeof enrollmentPeriodsTable.$inferSelect;
