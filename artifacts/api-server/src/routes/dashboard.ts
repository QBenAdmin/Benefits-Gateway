import { Router } from "express";
import { db } from "@workspace/db";
import {
  employeesTable,
  enrollmentsTable,
  carriersTable,
  benefitPlansTable,
  activityLogTable,
} from "@workspace/db";
import { eq, count, ne } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const [empCount] = await db.select({ cnt: count() }).from(employeesTable);
  const [enrolledCount] = await db
    .select({ cnt: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.status, "active"));
  const [pendingCount] = await db
    .select({ cnt: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.status, "pending"));
  const [carrierCount] = await db.select({ cnt: count() }).from(carriersTable);
  const [planCount] = await db
    .select({ cnt: count() })
    .from(benefitPlansTable)
    .where(eq(benefitPlansTable.isActive, true));
  const [transmitPendingCount] = await db
    .select({ cnt: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.transmissionStatus, "pending"));

  const total = Number(empCount?.cnt ?? 0);
  const enrolled = Number(enrolledCount?.cnt ?? 0);

  res.json({
    totalEmployees: total,
    enrolledEmployees: enrolled,
    pendingEnrollments: Number(pendingCount?.cnt ?? 0),
    activeCarriers: Number(carrierCount?.cnt ?? 0),
    activePlans: Number(planCount?.cnt ?? 0),
    transmissionsPending: Number(transmitPendingCount?.cnt ?? 0),
    enrollmentCompletionRate: total > 0 ? Math.round((enrolled / total) * 100) : 0,
  });
});

router.get("/dashboard/enrollment-activity", async (req, res) => {
  const activity = await db
    .select()
    .from(activityLogTable)
    .orderBy(activityLogTable.createdAt)
    .limit(20);

  const result = activity.reverse().map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  res.json(result);
});

router.get("/dashboard/enrollment-by-plan", async (req, res) => {
  const plans = await db.select().from(benefitPlansTable).where(eq(benefitPlansTable.isActive, true));
  const carriers = await db.select().from(carriersTable);
  const carrierMap = new Map(carriers.map((c) => [c.id, c.name]));

  const enrollmentCounts = await db
    .select({ planId: enrollmentsTable.planId, cnt: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.status, "active"))
    .groupBy(enrollmentsTable.planId);
  const enrollMap = new Map(enrollmentCounts.map((e) => [e.planId, Number(e.cnt)]));

  const result = plans.map((p) => ({
    planId: p.id,
    planName: p.name,
    planType: p.type,
    enrolledCount: enrollMap.get(p.id) ?? 0,
    carrierName: carrierMap.get(p.carrierId) ?? "Unknown",
  }));

  res.json(result);
});

export default router;
