import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditCsvUploadsTable = pgTable("audit_csv_uploads", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  filename: text("filename").notNull(),
  rowCount: integer("row_count"),
  columnMap: text("column_map"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditCsvUploadSchema = createInsertSchema(auditCsvUploadsTable).omit({ id: true, createdAt: true });
export type InsertAuditCsvUpload = z.infer<typeof insertAuditCsvUploadSchema>;
export type AuditCsvUpload = typeof auditCsvUploadsTable.$inferSelect;
