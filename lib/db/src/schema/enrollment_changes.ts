import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const enrollmentChangesTable = pgTable("enrollment_changes", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  changeType: text("change_type").notNull(),
  description: text("description").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  submittedOutsidePeriod: text("submitted_outside_period").notNull().default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEnrollmentChangeSchema = createInsertSchema(enrollmentChangesTable).omit({ id: true, createdAt: true });
export type InsertEnrollmentChange = z.infer<typeof insertEnrollmentChangeSchema>;
export type EnrollmentChange = typeof enrollmentChangesTable.$inferSelect;
