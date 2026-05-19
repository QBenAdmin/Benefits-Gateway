import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedEmployeeId: integer("related_employee_id"),
  relatedEmployeeName: text("related_employee_name"),
  relatedDependentId: integer("related_dependent_id"),
  relatedChangeId: integer("related_change_id"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("unread"),
  actionUrl: text("action_url"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationRecord = typeof notificationsTable.$inferSelect;
