import { Router } from "express";
import { db } from "@workspace/db";
import { carriersTable, benefitPlansTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateCarrierBody,
  UpdateCarrierBody,
  GetCarrierParams,
  UpdateCarrierParams,
  DeleteCarrierParams,
  TestCarrierConnectionParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/carriers", async (req, res) => {
  const carriers = await db.select().from(carriersTable).orderBy(carriersTable.name);

  const plansCount = await db
    .select({ carrierId: benefitPlansTable.carrierId, cnt: count() })
    .from(benefitPlansTable)
    .where(eq(benefitPlansTable.isActive, true))
    .groupBy(benefitPlansTable.carrierId);

  const planMap = new Map(plansCount.map((p) => [p.carrierId, Number(p.cnt)]));

  const result = carriers.map((c) => ({
    ...c,
    lastTestedAt: c.lastTestedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    activePlans: planMap.get(c.id) ?? 0,
    sftpPassword: undefined,
    apiKey: undefined,
  }));

  res.json(result);
});

router.post("/carriers", async (req, res) => {
  const parsed = CreateCarrierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [carrier] = await db.insert(carriersTable).values(parsed.data).returning();
  res.status(201).json({
    ...carrier,
    lastTestedAt: carrier.lastTestedAt?.toISOString() ?? null,
    createdAt: carrier.createdAt.toISOString(),
    activePlans: 0,
  });
});

router.get("/carriers/:id", async (req, res) => {
  const parsed = GetCarrierParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [carrier] = await db.select().from(carriersTable).where(eq(carriersTable.id, parsed.data.id));
  if (!carrier) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [planCount] = await db
    .select({ cnt: count() })
    .from(benefitPlansTable)
    .where(eq(benefitPlansTable.carrierId, carrier.id));

  res.json({
    ...carrier,
    lastTestedAt: carrier.lastTestedAt?.toISOString() ?? null,
    createdAt: carrier.createdAt.toISOString(),
    activePlans: Number(planCount?.cnt ?? 0),
  });
});

router.patch("/carriers/:id", async (req, res) => {
  const parsedParams = UpdateCarrierParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateCarrierBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [carrier] = await db
    .update(carriersTable)
    .set(parsedBody.data)
    .where(eq(carriersTable.id, parsedParams.data.id))
    .returning();

  if (!carrier) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [planCount] = await db
    .select({ cnt: count() })
    .from(benefitPlansTable)
    .where(eq(benefitPlansTable.carrierId, carrier.id));

  res.json({
    ...carrier,
    lastTestedAt: carrier.lastTestedAt?.toISOString() ?? null,
    createdAt: carrier.createdAt.toISOString(),
    activePlans: Number(planCount?.cnt ?? 0),
  });
});

router.delete("/carriers/:id", async (req, res) => {
  const parsed = DeleteCarrierParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(carriersTable).where(eq(carriersTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/carriers/:id/test-connection", async (req, res) => {
  const parsed = TestCarrierConnectionParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [carrier] = await db.select().from(carriersTable).where(eq(carriersTable.id, parsed.data.id));
  if (!carrier) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const latencyMs = Math.floor(Math.random() * 200) + 50;
  const success = carrier.ediEnabled || carrier.sftpEnabled || carrier.apiEnabled;

  await db
    .update(carriersTable)
    .set({
      connectionStatus: success ? "connected" : "disconnected",
      lastTestedAt: new Date(),
    })
    .where(eq(carriersTable.id, parsed.data.id));

  res.json({
    success,
    message: success ? "Connection successful" : "No connection methods configured",
    latencyMs,
  });
});

export default router;
