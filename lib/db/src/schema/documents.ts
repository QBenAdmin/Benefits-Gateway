import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  carrierId: integer("carrier_id"),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  isPdfFillable: boolean("is_pdf_fillable").notNull().default(false),
  transmissionStatus: text("transmission_status").notNull().default("pending"),
  lastTransmittedAt: timestamp("last_transmitted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
