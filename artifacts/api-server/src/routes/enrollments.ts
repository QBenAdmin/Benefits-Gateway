import { Router } from "express";
import { db } from "@workspace/db";
import { enrollmentsTable, employeesTable, benefitPlansTable, carriersTable, activityLogTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateEnrollmentBody,
  UpdateEnrollmentBody,
  GetEnrollmentParams,
  UpdateEnrollmentParams,
  TransmitEnrollmentParams,
  TransmitEnrollmentBody,
  ListEnrollmentsQueryParams,
} from "@workspace/api-zod";

const router = Router();

async function enrichEnrollment(enrollment: typeof enrollmentsTable.$inferSelect) {
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, enrollment.employeeId));
  const [plan] = await db.select().from(benefitPlansTable).where(eq(benefitPlansTable.id, enrollment.planId));
  const carrier = plan ? (await db.select().from(carriersTable).where(eq(carriersTable.id, plan.carrierId)))[0] : null;

  return {
    ...enrollment,
    employeeName: employee ? `${employee.firstName} ${employee.lastName}` : null,
    employeeEmail: employee?.email ?? null,
    planName: plan?.name ?? null,
    planType: plan?.type ?? null,
    carrierId: plan?.carrierId ?? null,
    carrierName: carrier?.name ?? null,
    effectiveDate: enrollment.effectiveDate ?? null,
    terminationDate: enrollment.terminationDate ?? null,
    transmittedAt: enrollment.transmittedAt?.toISOString() ?? null,
    createdAt: enrollment.createdAt.toISOString(),
  };
}

router.get("/enrollments", async (req, res) => {
  const parsed = ListEnrollmentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const allEnrollments = await db.select().from(enrollmentsTable).orderBy(enrollmentsTable.createdAt);

  let filtered = allEnrollments;
  if (parsed.data.status) {
    filtered = filtered.filter((e) => e.status === parsed.data.status);
  }
  if (parsed.data.employeeId) {
    filtered = filtered.filter((e) => e.employeeId === Number(parsed.data.employeeId));
  }
  if (parsed.data.planId) {
    filtered = filtered.filter((e) => e.planId === Number(parsed.data.planId));
  }

  const result = await Promise.all(filtered.map(enrichEnrollment));
  res.json(result);
});

router.post("/enrollments", async (req, res) => {
  const parsed = CreateEnrollmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [enrollment] = await db.insert(enrollmentsTable).values({
    ...parsed.data,
    employeeId: Number(parsed.data.employeeId),
    planId: Number(parsed.data.planId),
    dependents: parsed.data.dependents ?? 0,
  }).returning();

  const enriched = await enrichEnrollment(enrollment);

  await db.insert(activityLogTable).values({
    type: "enrollment_created",
    description: `${enriched.employeeName ?? "Employee"} enrolled in ${enriched.planName ?? "plan"}`,
    employeeName: enriched.employeeName ?? undefined,
    relatedId: enrollment.id,
  });

  res.status(201).json(enriched);
});

router.get("/enrollments/:id", async (req, res) => {
  const parsed = GetEnrollmentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [enrollment] = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.id, parsed.data.id));
  if (!enrollment) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(await enrichEnrollment(enrollment));
});

router.patch("/enrollments/:id", async (req, res) => {
  const parsedParams = UpdateEnrollmentParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateEnrollmentBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [enrollment] = await db
    .update(enrollmentsTable)
    .set(parsedBody.data)
    .where(eq(enrollmentsTable.id, parsedParams.data.id))
    .returning();

  if (!enrollment) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(await enrichEnrollment(enrollment));
});

router.post("/enrollments/:id/transmit", async (req, res) => {
  const parsedParams = TransmitEnrollmentParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = TransmitEnrollmentBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [enrollment] = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.id, parsedParams.data.id));
  if (!enrollment) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db
    .update(enrollmentsTable)
    .set({
      transmissionStatus: "transmitted",
      transmittedAt: new Date(),
      transmissionMethod: parsedBody.data.method,
    })
    .where(eq(enrollmentsTable.id, parsedParams.data.id));

  const enriched = await enrichEnrollment(enrollment);

  await db.insert(activityLogTable).values({
    type: "enrollment_transmitted",
    description: `Enrollment transmitted via ${parsedBody.data.method} for ${enriched.employeeName ?? "employee"}`,
    employeeName: enriched.employeeName ?? undefined,
    relatedId: enrollment.id,
  });

  const referenceId = `TX-${Date.now()}-${parsedParams.data.id}`;
  res.json({
    success: true,
    message: `Enrollment transmitted successfully via ${parsedBody.data.method}`,
    referenceId,
  });
});

export default router;
