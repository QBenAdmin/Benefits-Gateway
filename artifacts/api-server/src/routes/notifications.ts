import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListNotificationsQueryParams,
  MarkNotificationReadParams,
} from "@workspace/api-zod";

const router = Router();

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    ...n,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/notifications", async (req, res) => {
  const parsed = ListNotificationsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query" }); return; }

  const all = await db.select().from(notificationsTable).orderBy(notificationsTable.createdAt);
  let filtered = all.reverse();
  if (parsed.data.status) {
    filtered = filtered.filter((n) => n.status === parsed.data.status);
  }
  if (parsed.data.type) {
    filtered = filtered.filter((n) => n.type === parsed.data.type);
  }
  res.json(filtered.map(formatNotification));
});

router.post("/notifications/:id/read", async (req, res) => {
  const parsed = MarkNotificationReadParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [notification] = await db
    .update(notificationsTable)
    .set({ isRead: true, status: "read" })
    .where(eq(notificationsTable.id, parsed.data.id))
    .returning();
  if (!notification) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatNotification(notification));
});

router.post("/notifications/mark-all-read", async (req, res) => {
  const result = await db
    .update(notificationsTable)
    .set({ isRead: true, status: "read" })
    .where(eq(notificationsTable.isRead, false))
    .returning();
  res.json({ success: true, count: result.length });
});

router.get("/notifications/unread-count", async (req, res) => {
  const all = await db.select().from(notificationsTable).where(eq(notificationsTable.isRead, false));
  res.json({ count: all.length });
});

export default router;
