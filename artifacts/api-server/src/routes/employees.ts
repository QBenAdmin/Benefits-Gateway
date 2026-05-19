import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, activityLogTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import {
  CreateEmployeeBody,
  UpdateEmployeeBody,
  GetEmployeeParams,
  UpdateEmployeeParams,
  DeleteEmployeeParams,
  SendEmployeeInvitationParams,
  SendBulkInvitationsBody,
  ImportEmployeesCsvBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/employees", async (req, res) => {
  const { status, search, employerId } = req.query as { status?: string; search?: string; employerId?: string };

  const employees = await db
    .select()
    .from(employeesTable)
    .orderBy(employeesTable.lastName, employeesTable.firstName);

  let filtered = employees;

  if (employerId) {
    filtered = filtered.filter((e) => e.employerId === Number(employerId));
  }

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.firstName.toLowerCase().includes(s) ||
        e.lastName.toLowerCase().includes(s) ||
        e.email.toLowerCase().includes(s) ||
        (e.department?.toLowerCase().includes(s) ?? false)
    );
  }

  if (status) {
    filtered = filtered.filter((e) => e.status === status);
  }

  const result = filtered.map((e) => ({
    ...e,
    ssn: e.ssn ? `***-**-${e.ssn.slice(-4)}` : null,
    invitationSentAt: e.invitationSentAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/employees", async (req, res) => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [employee] = await db.insert(employeesTable).values(parsed.data).returning();

  await db.insert(activityLogTable).values({
    type: "employee_added",
    description: `New employee ${employee.firstName} ${employee.lastName} added`,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    relatedId: employee.id,
  });

  res.status(201).json({
    ...employee,
    ssn: employee.ssn ? `***-**-${employee.ssn.slice(-4)}` : null,
    invitationSentAt: employee.invitationSentAt?.toISOString() ?? null,
    createdAt: employee.createdAt.toISOString(),
  });
});

router.post("/employees/import-csv", async (req, res) => {
  const parsed = ImportEmployeesCsvBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const lines = parsed.data.csvData.trim().split("\n");
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
      errors.push(`Row ${i + 1}: Missing required fields (first_name, last_name, email)`);
      skipped++;
      continue;
    }

    try {
      await db.insert(employeesTable).values({
        employerId: parsed.data.employerId ?? null,
        firstName,
        lastName,
        email,
        phone: row["phone"] || null,
        department: row["department"] || null,
        jobTitle: row["job_title"] || row["jobtitle"] || row["title"] || null,
        employeeId: row["employee_id"] || row["employeeid"] || null,
        hireDate: row["hire_date"] || row["hiredate"] || null,
      }).onConflictDoNothing();
      imported++;
    } catch {
      errors.push(`Row ${i + 1}: Failed to import ${email}`);
      skipped++;
    }
  }

  if (imported > 0) {
    await db.insert(activityLogTable).values({
      type: "csv_import",
      description: `Imported ${imported} employees from CSV`,
    });
  }

  res.json({
    imported,
    skipped,
    errors,
    message: `Successfully imported ${imported} employees`,
  });
});

router.get("/employees/:id", async (req, res) => {
  const parsed = GetEmployeeParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsed.data.id));
  if (!employee) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    ...employee,
    ssn: employee.ssn ? `***-**-${employee.ssn.slice(-4)}` : null,
    invitationSentAt: employee.invitationSentAt?.toISOString() ?? null,
    createdAt: employee.createdAt.toISOString(),
  });
});

router.patch("/employees/:id", async (req, res) => {
  const parsedParams = UpdateEmployeeParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateEmployeeBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [employee] = await db
    .update(employeesTable)
    .set(parsedBody.data)
    .where(eq(employeesTable.id, parsedParams.data.id))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    ...employee,
    ssn: employee.ssn ? `***-**-${employee.ssn.slice(-4)}` : null,
    invitationSentAt: employee.invitationSentAt?.toISOString() ?? null,
    createdAt: employee.createdAt.toISOString(),
  });
});

router.delete("/employees/:id", async (req, res) => {
  const parsed = DeleteEmployeeParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(employeesTable).where(eq(employeesTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/employees/:id/invite", async (req, res) => {
  const parsed = SendEmployeeInvitationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsed.data.id));
  if (!employee) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db
    .update(employeesTable)
    .set({ invitationStatus: "invited", invitationSentAt: new Date() })
    .where(eq(employeesTable.id, parsed.data.id));

  await db.insert(activityLogTable).values({
    type: "invitation_sent",
    description: `Enrollment invitation sent to ${employee.firstName} ${employee.lastName}`,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    relatedId: employee.id,
  });

  res.json({
    success: true,
    message: "Invitation sent successfully",
    sentTo: employee.email,
  });
});

router.post("/invitations/bulk", async (req, res) => {
  const parsed = SendBulkInvitationsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { employeeIds } = parsed.data;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const empId of employeeIds) {
    try {
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, empId));
      if (emp) {
        await db
          .update(employeesTable)
          .set({ invitationStatus: "invited", invitationSentAt: new Date() })
          .where(eq(employeesTable.id, empId));
        sent++;
      } else {
        failed++;
        errors.push(`Employee ${empId} not found`);
      }
    } catch {
      failed++;
      errors.push(`Failed to send invitation to employee ${empId}`);
    }
  }

  if (sent > 0) {
    await db.insert(activityLogTable).values({
      type: "bulk_invitation",
      description: `Bulk enrollment invitations sent to ${sent} employees`,
    });
  }

  res.json({ sent, failed, errors });
});

export default router;
