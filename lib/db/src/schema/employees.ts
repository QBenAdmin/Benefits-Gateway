import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employersTable } from "./employers";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").references(() => employersTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  hireDate: text("hire_date"),
  department: text("department"),
  jobTitle: text("job_title"),
  employeeId: text("employee_id"),
  status: text("status").notNull().default("active"),
  invitationStatus: text("invitation_status").notNull().default("not_invited"),
  invitationSentAt: timestamp("invitation_sent_at"),
  ssn: text("ssn"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
