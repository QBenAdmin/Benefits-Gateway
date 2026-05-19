import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";
import { benefitPlansTable } from "./benefit_plans";

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  planId: integer("plan_id").notNull().references(() => benefitPlansTable.id),
  status: text("status").notNull().default("pending"),
  coverageLevel: text("coverage_level"),
  effectiveDate: text("effective_date"),
  terminationDate: text("termination_date"),
  transmissionStatus: text("transmission_status").notNull().default("pending"),
  transmittedAt: timestamp("transmitted_at"),
  transmissionMethod: text("transmission_method"),
  dependents: integer("dependents").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit({ id: true, createdAt: true });
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
