import { Router } from "express";
import { db } from "@workspace/db";
import { enrollmentPeriodsTable, employersTable, employeesTable, activityLogTable } from "@workspace/db";
import { eq, and, lte, gte } from "drizzle-orm";
import {
  CreateEnrollmentPeriodBody,
  UpdateEnrollmentPeriodBody,
  UpdateEnrollmentPeriodParams,
  DeleteEnrollmentPeriodParams,
} from "@workspace/api-zod";
import { sendEnrollmentNotice } from "../lib/mailer";

const router = Router();

function isCurrentlyOpen(period: typeof enrollmentPeriodsTable.$inferSelect): boolean {
  if (!period.isActive) return false;
  const now = new Date().toISOString().split("T")[0];
  return period.startDate <= now && period.endDate >= now;
}

async function enrichPeriod(period: typeof enrollmentPeriodsTable.$inferSelect) {
  const employer = period.employerId
    ? (await db.select().from(employersTable).where(eq(employersTable.id, period.employerId)))[0]
    : null;
  return {
    ...period,
    employerName: employer?.name ?? null,
    isCurrentlyOpen: isCurrentlyOpen(period),
    createdAt: period.createdAt.toISOString(),
  };
}

router.get("/enrollment-periods", async (req, res) => {
  const periods = await db.select().from(enrollmentPeriodsTable).orderBy(enrollmentPeriodsTable.startDate);
  const result = await Promise.all(periods.map(enrichPeriod));
  res.json(result);
});

router.post("/enrollment-periods", async (req, res) => {
  const parsed = CreateEnrollmentPeriodBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [period] = await db.insert(enrollmentPeriodsTable).values({
    ...parsed.data,
    employerId: parsed.data.employerId ?? null,
    type: parsed.data.type ?? "open",
    allowEmployeeChanges: parsed.data.allowEmployeeChanges ?? true,
    requireApprovalOutsidePeriod: parsed.data.requireApprovalOutsidePeriod ?? true,
  }).returning();
  res.status(201).json(await enrichPeriod(period));
});

router.patch("/enrollment-periods/:id", async (req, res) => {
  const parsedParams = UpdateEnrollmentPeriodParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateEnrollmentPeriodBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [period] = await db
    .update(enrollmentPeriodsTable)
    .set(parsedBody.data)
    .where(eq(enrollmentPeriodsTable.id, parsedParams.data.id))
    .returning();
  if (!period) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichPeriod(period));
});

router.delete("/enrollment-periods/:id", async (req, res) => {
  const parsed = DeleteEnrollmentPeriodParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(enrollmentPeriodsTable).where(eq(enrollmentPeriodsTable.id, parsed.data.id));
  res.status(204).send();
});

router.get("/enrollment-periods/active", async (req, res) => {
  const now = new Date().toISOString().split("T")[0];
  const periods = await db.select().from(enrollmentPeriodsTable).where(eq(enrollmentPeriodsTable.isActive, true));
  const activePeriod = periods.find((p) => p.startDate <= now && p.endDate >= now);

  if (!activePeriod) {
    res.json({
      isOpen: false,
      activePeriod: null,
      message: "No enrollment period is currently open",
    });
    return;
  }

  res.json({
    isOpen: true,
    activePeriod: await enrichPeriod(activePeriod),
    message: `Open enrollment is active through ${activePeriod.endDate}`,
  });
});

router.post("/enrollment-periods/:id/send-notices", async (req, res) => {
  const periodId = Number(req.params.id);
  if (isNaN(periodId)) {
    res.status(400).json({ error: "Invalid period id" });
    return;
  }

  const { employerId } = req.body as { employerId?: number };

  const [period] = await db.select().from(enrollmentPeriodsTable).where(eq(enrollmentPeriodsTable.id, periodId));
  if (!period) {
    res.status(404).json({ error: "Enrollment period not found" });
    return;
  }

  const resolvedEmployerId = employerId ?? period.employerId;
  if (!resolvedEmployerId) {
    res.status(400).json({ error: "employerId is required when the period has no employer assigned" });
    return;
  }

  const [employer] = await db.select().from(employersTable).where(eq(employersTable.id, resolvedEmployerId));
  if (!employer) {
    res.status(404).json({ error: "Employer not found" });
    return;
  }

  const employees = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.employerId, resolvedEmployerId));

  const activeEmployees = employees.filter((e) => e.status === "active");

  let sent = 0;
  let failed = 0;
  let emailsDelivered = false;
  const errors: string[] = [];

  for (const emp of activeEmployees) {
    try {
      const result = await sendEnrollmentNotice({
        to: emp.email,
        firstName: emp.firstName,
        lastName: emp.lastName,
        periodName: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        employerName: employer.name,
      });

      await db
        .update(employeesTable)
        .set({ invitationStatus: "invited", invitationSentAt: new Date() })
        .where(eq(employeesTable.id, emp.id));

      if (result.delivered) emailsDelivered = true;
      sent++;
    } catch {
      failed++;
      errors.push(`Failed to send notice to ${emp.email}`);
    }
  }

  if (sent > 0) {
    await db.insert(activityLogTable).values({
      type: "enrollment_notices_sent",
      description: `Open enrollment notices sent to ${sent} employees at ${employer.name} for "${period.name}"`,
    });
  }

  res.json({
    sent,
    failed,
    emailsDelivered,
    errors,
    periodName: period.name,
    employerName: employer.name,
  });
});

export default router;
