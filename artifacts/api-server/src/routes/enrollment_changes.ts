import { Router } from "express";
import { db } from "@workspace/db";
import { enrollmentChangesTable, employeesTable, notificationsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListEnrollmentChangesQueryParams,
  ApproveEnrollmentChangeParams,
  DenyEnrollmentChangeParams,
  ApproveEnrollmentChangeBody,
  DenyEnrollmentChangeBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichChange(change: typeof enrollmentChangesTable.$inferSelect) {
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, change.employeeId));
  return {
    ...change,
    employeeName: employee ? `${employee.firstName} ${employee.lastName}` : null,
    employeeEmail: employee?.email ?? null,
    reviewedAt: change.reviewedAt?.toISOString() ?? null,
    createdAt: change.createdAt.toISOString(),
  };
}

router.get("/enrollment-changes", async (req, res) => {
  const parsed = ListEnrollmentChangesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query" }); return; }

  const changes = await db.select().from(enrollmentChangesTable).orderBy(enrollmentChangesTable.createdAt);
  let filtered = changes;
  if (parsed.data.status) {
    filtered = filtered.filter((c) => c.status === parsed.data.status);
  }
  const result = await Promise.all(filtered.reverse().map(enrichChange));
  res.json(result);
});

router.post("/enrollment-changes/:id/approve", async (req, res) => {
  const parsedParams = ApproveEnrollmentChangeParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = ApproveEnrollmentChangeBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [change] = await db
    .update(enrollmentChangesTable)
    .set({
      status: "approved",
      reviewedBy: parsedBody.data.reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: parsedBody.data.notes ?? null,
    })
    .where(eq(enrollmentChangesTable.id, parsedParams.data.id))
    .returning();

  if (!change) { res.status(404).json({ error: "Not found" }); return; }

  await db.insert(activityLogTable).values({
    type: "change_approved",
    description: `Enrollment change approved by ${parsedBody.data.reviewedBy}`,
    relatedId: change.id,
  });

  res.json(await enrichChange(change));
});

router.post("/enrollment-changes/:id/deny", async (req, res) => {
  const parsedParams = DenyEnrollmentChangeParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = DenyEnrollmentChangeBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [change] = await db
    .update(enrollmentChangesTable)
    .set({
      status: "denied",
      reviewedBy: parsedBody.data.reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: parsedBody.data.notes ?? null,
    })
    .where(eq(enrollmentChangesTable.id, parsedParams.data.id))
    .returning();

  if (!change) { res.status(404).json({ error: "Not found" }); return; }

  await db.insert(activityLogTable).values({
    type: "change_denied",
    description: `Enrollment change denied by ${parsedBody.data.reviewedBy}`,
    relatedId: change.id,
  });

  res.json(await enrichChange(change));
});

export default router;
