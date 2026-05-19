import { Router } from "express";
import { db } from "@workspace/db";
import { employersTable, employeesTable, activityLogTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateEmployerBody,
  UpdateEmployerBody,
  GetEmployerParams,
  UpdateEmployerParams,
  DeleteEmployerParams,
  UploadEmployerCensusParams,
  ImportEmployeesCsvBody,
} from "@workspace/api-zod";

const router = Router();

async function getEmployeeCount(employerId: number): Promise<number> {
  const [row] = await db
    .select({ cnt: count() })
    .from(employeesTable)
    .where(eq(employeesTable.employerId, employerId));
  return Number(row?.cnt ?? 0);
}

router.get("/employers", async (req, res) => {
  const employers = await db.select().from(employersTable).orderBy(employersTable.name);

  const result = await Promise.all(
    employers.map(async (emp) => ({
      ...emp,
      employeeCount: await getEmployeeCount(emp.id),
      createdAt: emp.createdAt.toISOString(),
    }))
  );
  res.json(result);
});

router.post("/employers", async (req, res) => {
  const parsed = CreateEmployerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [employer] = await db.insert(employersTable).values(parsed.data).returning();
  await db.insert(activityLogTable).values({
    type: "employer_added",
    description: `Employer "${employer.name}" created`,
  });
  res.status(201).json({ ...employer, employeeCount: 0, createdAt: employer.createdAt.toISOString() });
});

router.get("/employers/:id", async (req, res) => {
  const parsed = GetEmployerParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [employer] = await db.select().from(employersTable).where(eq(employersTable.id, parsed.data.id));
  if (!employer) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...employer, employeeCount: await getEmployeeCount(employer.id), createdAt: employer.createdAt.toISOString() });
});

router.patch("/employers/:id", async (req, res) => {
  const parsedParams = UpdateEmployerParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateEmployerBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [employer] = await db
    .update(employersTable)
    .set(parsedBody.data)
    .where(eq(employersTable.id, parsedParams.data.id))
    .returning();
  if (!employer) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...employer, employeeCount: await getEmployeeCount(employer.id), createdAt: employer.createdAt.toISOString() });
});

router.delete("/employers/:id", async (req, res) => {
  const parsed = DeleteEmployerParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(employersTable).where(eq(employersTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/employers/:id/upload-census", async (req, res) => {
  const parsedParams = UploadEmployerCensusParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = ImportEmployeesCsvBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [employer] = await db.select().from(employersTable).where(eq(employersTable.id, parsedParams.data.id));
  if (!employer) { res.status(404).json({ error: "Employer not found" }); return; }

  const lines = parsedBody.data.csvData.trim().split("\n");
  if (lines.length < 2) {
    res.json({ imported: 0, skipped: 0, errors: ["CSV must have header and at least one data row"], message: "No data rows found" });
    return;
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/['"]/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

    const firstName = row["first_name"] || row["firstname"] || row["first name"] || "";
    const lastName = row["last_name"] || row["lastname"] || row["last name"] || "";
    const email = row["email"] || "";

    if (!firstName || !lastName || !email) {
      errors.push(`Row ${i + 1}: Missing required fields`);
      skipped++;
      continue;
    }

    try {
      await db.insert(employeesTable).values({
        employerId: employer.id,
        firstName, lastName, email,
        phone: row["phone"] || null,
        department: row["department"] || null,
        jobTitle: row["job_title"] || row["title"] || null,
        employeeId: row["employee_id"] || null,
        hireDate: row["hire_date"] || null,
      }).onConflictDoNothing();
      imported++;
    } catch {
      errors.push(`Row ${i + 1}: Failed to import ${email}`);
      skipped++;
    }
  }

  if (imported > 0) {
    await db.insert(activityLogTable).values({
      type: "census_upload",
      description: `Census uploaded for ${employer.name}: ${imported} employees imported`,
    });
  }

  res.json({ imported, skipped, errors, message: `Uploaded ${imported} employees for ${employer.name}` });
});

export default router;
