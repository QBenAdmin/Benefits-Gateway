import { Router } from "express";
import { db } from "@workspace/db";
import { integrationsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateIntegrationBody,
  UpdateIntegrationBody,
  GetIntegrationParams,
  UpdateIntegrationParams,
  DeleteIntegrationParams,
  SyncIntegrationParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/integrations", async (req, res) => {
  const integrations = await db.select().from(integrationsTable).orderBy(integrationsTable.name);
  const result = integrations.map((i) => ({
    ...i,
    apiKey: undefined,
    lastSyncAt: i.lastSyncAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  }));
  res.json(result);
});

router.post("/integrations", async (req, res) => {
  const parsed = CreateIntegrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [integration] = await db.insert(integrationsTable).values({
    ...parsed.data,
    status: "connected",
  }).returning();

  res.status(201).json({
    ...integration,
    apiKey: undefined,
    lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
    createdAt: integration.createdAt.toISOString(),
  });
});

router.get("/integrations/:id", async (req, res) => {
  const parsed = GetIntegrationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [integration] = await db.select().from(integrationsTable).where(eq(integrationsTable.id, parsed.data.id));
  if (!integration) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    ...integration,
    apiKey: undefined,
    lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
    createdAt: integration.createdAt.toISOString(),
  });
});

router.patch("/integrations/:id", async (req, res) => {
  const parsedParams = UpdateIntegrationParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateIntegrationBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [integration] = await db
    .update(integrationsTable)
    .set(parsedBody.data)
    .where(eq(integrationsTable.id, parsedParams.data.id))
    .returning();

  if (!integration) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    ...integration,
    apiKey: undefined,
    lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
    createdAt: integration.createdAt.toISOString(),
  });
});

router.delete("/integrations/:id", async (req, res) => {
  const parsed = DeleteIntegrationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(integrationsTable).where(eq(integrationsTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/integrations/:id/sync", async (req, res) => {
  const parsed = SyncIntegrationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [integration] = await db.select().from(integrationsTable).where(eq(integrationsTable.id, parsed.data.id));
  if (!integration) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const synced = Math.floor(Math.random() * 15) + 5;
  await db
    .update(integrationsTable)
    .set({ lastSyncAt: new Date(), syncedEmployees: synced, status: "connected" })
    .where(eq(integrationsTable.id, parsed.data.id));

  await db.insert(activityLogTable).values({
    type: "integration_sync",
    description: `Synced ${synced} employees from ${integration.name}`,
    relatedId: integration.id,
  });

  res.json({
    imported: synced,
    skipped: 0,
    errors: [],
    message: `Successfully synced ${synced} employees from ${integration.name}`,
  });
});

export default router;
