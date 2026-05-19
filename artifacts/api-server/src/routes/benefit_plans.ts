import { Router } from "express";
import { db } from "@workspace/db";
import { benefitPlansTable, carriersTable, enrollmentsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateBenefitPlanBody,
  UpdateBenefitPlanBody,
  GetBenefitPlanParams,
  UpdateBenefitPlanParams,
  DeleteBenefitPlanParams,
  ListBenefitPlansQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/benefits", async (req, res) => {
  const parsed = ListBenefitPlansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const plans = await db.select().from(benefitPlansTable).orderBy(benefitPlansTable.name);
  const carriers = await db.select().from(carriersTable);
  const carrierMap = new Map(carriers.map((c) => [c.id, c.name]));

  const enrollmentCounts = await db
    .select({ planId: enrollmentsTable.planId, cnt: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.status, "active"))
    .groupBy(enrollmentsTable.planId);
  const enrollMap = new Map(enrollmentCounts.map((e) => [e.planId, Number(e.cnt)]));

  let filtered = plans;
  if (parsed.data.type) {
    filtered = filtered.filter((p) => p.type === parsed.data.type);
  }
  if (parsed.data.carrierId) {
    filtered = filtered.filter((p) => p.carrierId === Number(parsed.data.carrierId));
  }

  const result = filtered.map((p) => ({
    ...p,
    carrierName: carrierMap.get(p.carrierId) ?? null,
    enrolledCount: enrollMap.get(p.id) ?? 0,
    employeeCost: p.employeeCost ? Number(p.employeeCost) : null,
    employerCost: p.employerCost ? Number(p.employerCost) : null,
    deductible: p.deductible ? Number(p.deductible) : null,
    outOfPocketMax: p.outOfPocketMax ? Number(p.outOfPocketMax) : null,
    createdAt: p.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/benefits", async (req, res) => {
  const parsed = CreateBenefitPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [plan] = await db.insert(benefitPlansTable).values({
    ...parsed.data,
    carrierId: Number(parsed.data.carrierId),
  }).returning();

  const [carrier] = await db.select().from(carriersTable).where(eq(carriersTable.id, plan.carrierId));

  res.status(201).json({
    ...plan,
    carrierName: carrier?.name ?? null,
    enrolledCount: 0,
    employeeCost: plan.employeeCost ? Number(plan.employeeCost) : null,
    employerCost: plan.employerCost ? Number(plan.employerCost) : null,
    deductible: plan.deductible ? Number(plan.deductible) : null,
    outOfPocketMax: plan.outOfPocketMax ? Number(plan.outOfPocketMax) : null,
    createdAt: plan.createdAt.toISOString(),
  });
});

router.get("/benefits/:id", async (req, res) => {
  const parsed = GetBenefitPlanParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [plan] = await db.select().from(benefitPlansTable).where(eq(benefitPlansTable.id, parsed.data.id));
  if (!plan) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [carrier] = await db.select().from(carriersTable).where(eq(carriersTable.id, plan.carrierId));
  const [enrollCount] = await db
    .select({ cnt: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.planId, plan.id));

  res.json({
    ...plan,
    carrierName: carrier?.name ?? null,
    enrolledCount: Number(enrollCount?.cnt ?? 0),
    employeeCost: plan.employeeCost ? Number(plan.employeeCost) : null,
    employerCost: plan.employerCost ? Number(plan.employerCost) : null,
    deductible: plan.deductible ? Number(plan.deductible) : null,
    outOfPocketMax: plan.outOfPocketMax ? Number(plan.outOfPocketMax) : null,
    createdAt: plan.createdAt.toISOString(),
  });
});

router.patch("/benefits/:id", async (req, res) => {
  const parsedParams = UpdateBenefitPlanParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateBenefitPlanBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsedBody.data };
  if (parsedBody.data.carrierId !== undefined) {
    updateData.carrierId = Number(parsedBody.data.carrierId);
  }

  const [plan] = await db
    .update(benefitPlansTable)
    .set(updateData as Partial<typeof benefitPlansTable.$inferInsert>)
    .where(eq(benefitPlansTable.id, parsedParams.data.id))
    .returning();

  if (!plan) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [carrier] = await db.select().from(carriersTable).where(eq(carriersTable.id, plan.carrierId));
  const [enrollCount] = await db
    .select({ cnt: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.planId, plan.id));

  res.json({
    ...plan,
    carrierName: carrier?.name ?? null,
    enrolledCount: Number(enrollCount?.cnt ?? 0),
    employeeCost: plan.employeeCost ? Number(plan.employeeCost) : null,
    employerCost: plan.employerCost ? Number(plan.employerCost) : null,
    deductible: plan.deductible ? Number(plan.deductible) : null,
    outOfPocketMax: plan.outOfPocketMax ? Number(plan.outOfPocketMax) : null,
    createdAt: plan.createdAt.toISOString(),
  });
});

router.delete("/benefits/:id", async (req, res) => {
  const parsed = DeleteBenefitPlanParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(benefitPlansTable).where(eq(benefitPlansTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
