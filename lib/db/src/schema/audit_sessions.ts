import { pgTable, serial, text, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditSessionsTable = pgTable("audit_sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vendorSystem: text("vendor_system"),
  cadence: text("cadence").notNull(),
  windowStart: date("window_start", { mode: "string" }),
  windowEnd: date("window_end", { mode: "string" }),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAuditSessionSchema = createInsertSchema(auditSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAuditSession = z.infer<typeof insertAuditSessionSchema>;
export type AuditSession = typeof auditSessionsTable.$inferSelect;
