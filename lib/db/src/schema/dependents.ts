import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const dependentsTable = pgTable("dependents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  relationship: text("relationship").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  ssn: text("ssn"),
  gender: text("gender"),
  status: text("status").notNull().default("active"),
  ageOutNotifiedAt: timestamp("age_out_notified_at"),
  cobraNoticeSentAt: timestamp("cobra_notice_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDependentSchema = createInsertSchema(dependentsTable).omit({ id: true, createdAt: true });
export type InsertDependent = z.infer<typeof insertDependentSchema>;
export type Dependent = typeof dependentsTable.$inferSelect;
