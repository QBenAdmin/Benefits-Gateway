import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const carriersTable = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  enrollmentEmail: text("enrollment_email"),
  ediEnabled: boolean("edi_enabled").notNull().default(false),
  ediSenderId: text("edi_sender_id"),
  ediReceiverId: text("edi_receiver_id"),
  sftpEnabled: boolean("sftp_enabled").notNull().default(false),
  sftpHost: text("sftp_host"),
  sftpPort: integer("sftp_port"),
  sftpUsername: text("sftp_username"),
  sftpPassword: text("sftp_password"),
  sftpPath: text("sftp_path"),
  apiEnabled: boolean("api_enabled").notNull().default(false),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  connectionStatus: text("connection_status").notNull().default("untested"),
  lastTestedAt: timestamp("last_tested_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCarrierSchema = createInsertSchema(carriersTable).omit({ id: true, createdAt: true });
export type InsertCarrier = z.infer<typeof insertCarrierSchema>;
export type Carrier = typeof carriersTable.$inferSelect;
