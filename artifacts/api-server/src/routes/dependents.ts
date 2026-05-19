import { Router } from "express";
import { db } from "@workspace/db";
import { dependentsTable, employeesTable, notificationsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListDependentsParams,
  CreateDependentParams,
  CreateDependentBody,
  UpdateDependentParams,
  UpdateDependentBody,
  DeleteDependentParams,
} from "@workspace/api-zod";

const router = Router();

function daysUntilAge26(dob: string): number | null {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const turns26 = new Date(birth);
  turns26.setFullYear(turns26.getFullYear() + 26);
  const now = new Date();
  const diff = Math.floor((turns26.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function turnsAge26On(dob: string): string | null {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const turns26 = new Date(birth);
  turns26.setFullYear(turns26.getFullYear() + 26);
  return turns26.toISOString().split("T")[0];
}

async function enrichDependent(dep: typeof dependentsTable.$inferSelect) {
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, dep.employeeId));
  return {
    ...dep,
    employeeName: employee ? `${employee.firstName} ${employee.lastName}` : null,
    ssn: dep.ssn ? `***-**-${dep.ssn.slice(-4)}` : null,
    daysUntilAgeOut: daysUntilAge26(dep.dateOfBirth),
    ageOutNotifiedAt: dep.ageOutNotifiedAt?.toISOString() ?? null,
    cobraNoticeSentAt: dep.cobraNoticeSentAt?.toISOString() ?? null,
    createdAt: dep.createdAt.toISOString(),
  };
}

router.get("/employees/:employeeId/dependents", async (req, res) => {
  const parsed = ListDependentsParams.safeParse({ employeeId: Number(req.params.employeeId) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const deps = await db
    .select()
    .from(dependentsTable)
    .where(eq(dependentsTable.employeeId, parsed.data.employeeId))
    .orderBy(dependentsTable.lastName);

  const result = await Promise.all(deps.map(enrichDependent));
  res.json(result);
});

router.post("/employees/:employeeId/dependents", async (req, res) => {
  const parsedParams = CreateDependentParams.safeParse({ employeeId: Number(req.params.employeeId) });
  const parsedBody = CreateDependentBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [dep] = await db.insert(dependentsTable).values({
    ...parsedBody.data,
    employeeId: parsedParams.data.employeeId,
    ssn: parsedBody.data.ssn ?? null,
    gender: parsedBody.data.gender ?? null,
  }).returning();

  const days = daysUntilAge26(dep.dateOfBirth);
  if (days !== null && days <= 60 && days >= 0) {
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, dep.employeeId));
    await db.insert(notificationsTable).values({
      type: "dependent_age_out",
      title: "Dependent Approaching Age 26",
      message: `${dep.firstName} ${dep.lastName} will age out of coverage in ${days} days (${turnsAge26On(dep.dateOfBirth)}).`,
      relatedEmployeeId: dep.employeeId,
      relatedEmployeeName: employee ? `${employee.firstName} ${employee.lastName}` : undefined,
      relatedDependentId: dep.id,
      priority: days <= 30 ? "high" : "normal",
      actionUrl: `/employees/${dep.employeeId}`,
    });
  }

  res.status(201).json(await enrichDependent(dep));
});

router.patch("/dependents/:id", async (req, res) => {
  const parsedParams = UpdateDependentParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateDependentBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [dep] = await db
    .update(dependentsTable)
    .set(parsedBody.data)
    .where(eq(dependentsTable.id, parsedParams.data.id))
    .returning();

  if (!dep) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichDependent(dep));
});

router.delete("/dependents/:id", async (req, res) => {
  const parsed = DeleteDependentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(dependentsTable).where(eq(dependentsTable.id, parsed.data.id));
  res.status(204).send();
});

router.get("/dependents/aging-out", async (req, res) => {
  const allDeps = await db
    .select()
    .from(dependentsTable)
    .where(eq(dependentsTable.status, "active"));

  const employees = await db.select().from(employeesTable);
  const empMap = new Map(employees.map((e) => [e.id, e]));

  const agingOut = allDeps
    .map((dep) => {
      const days = daysUntilAge26(dep.dateOfBirth);
      const emp = empMap.get(dep.employeeId);
      return { dep, days, emp };
    })
    .filter(({ days }) => days !== null && days >= 0 && days <= 60)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
    .map(({ dep, days, emp }) => ({
      id: dep.id,
      employeeId: dep.employeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
      employeeEmail: emp?.email ?? "",
      firstName: dep.firstName,
      lastName: dep.lastName,
      relationship: dep.relationship,
      dateOfBirth: dep.dateOfBirth,
      turnsAge26On: turnsAge26On(dep.dateOfBirth) ?? "",
      daysUntilAgeOut: days ?? 0,
      ageOutNotifiedAt: dep.ageOutNotifiedAt?.toISOString() ?? null,
      cobraNoticeSentAt: dep.cobraNoticeSentAt?.toISOString() ?? null,
    }));

  res.json(agingOut);
});

export default router;
