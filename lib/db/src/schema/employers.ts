import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employersTable = pgTable("employers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ein: text("ein"),
  industry: text("industry"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  phone: text("phone"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  logoUrl: text("logo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmployerSchema = createInsertSchema(employersTable).omit({ id: true, createdAt: true });
export type InsertEmployer = z.infer<typeof insertEmployerSchema>;
export type Employer = typeof employersTable.$inferSelect;
