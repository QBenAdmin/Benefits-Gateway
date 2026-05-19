import { Router } from "express";
import { db } from "@workspace/db";
import { adminUsersTable, employersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateUserBody,
  UpdateUserBody,
  GetUserParams,
  UpdateUserParams,
  DeleteUserParams,
} from "@workspace/api-zod";

const router = Router();

async function enrichUser(user: typeof adminUsersTable.$inferSelect) {
  const employer = user.employerId
    ? (await db.select().from(employersTable).where(eq(employersTable.id, user.employerId)))[0]
    : null;
  return {
    ...user,
    employerName: employer?.name ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/users", async (req, res) => {
  const users = await db.select().from(adminUsersTable).orderBy(adminUsersTable.lastName);
  const result = await Promise.all(users.map(enrichUser));
  res.json(result);
});

router.post("/users", async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  if (parsed.data.employerId) {
    const [count_row] = await db
      .select({ cnt: count() })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.employerId, parsed.data.employerId));
    if (Number(count_row?.cnt ?? 0) >= 3) {
      res.status(409).json({ error: "Maximum of 3 users allowed per employer" });
      return;
    }
  }

  const [user] = await db.insert(adminUsersTable).values({
    ...parsed.data,
    employerId: parsed.data.employerId ?? null,
    role: parsed.data.role ?? "viewer",
  }).returning();
  res.status(201).json(await enrichUser(user));
});

router.get("/users/:id", async (req, res) => {
  const parsed = GetUserParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, parsed.data.id));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichUser(user));
});

router.patch("/users/:id", async (req, res) => {
  const parsedParams = UpdateUserParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateUserBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [user] = await db
    .update(adminUsersTable)
    .set(parsedBody.data)
    .where(eq(adminUsersTable.id, parsedParams.data.id))
    .returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichUser(user));
});

router.delete("/users/:id", async (req, res) => {
  const parsed = DeleteUserParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(adminUsersTable).where(eq(adminUsersTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
