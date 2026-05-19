import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, carriersTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateDocumentBody,
  GetDocumentParams,
  DeleteDocumentParams,
  TransmitDocumentEmailParams,
  TransmitDocumentEmailBody,
  ListDocumentsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/documents", async (req, res) => {
  const parsed = ListDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const docs = await db.select().from(documentsTable).orderBy(documentsTable.createdAt);
  const carriers = await db.select().from(carriersTable);
  const carrierMap = new Map(carriers.map((c) => [c.id, c.name]));

  let filtered = docs;
  if (parsed.data.type) {
    filtered = filtered.filter((d) => d.type === parsed.data.type);
  }
  if (parsed.data.carrierId) {
    filtered = filtered.filter((d) => d.carrierId === Number(parsed.data.carrierId));
  }

  const result = filtered.map((d) => ({
    ...d,
    carrierName: d.carrierId ? (carrierMap.get(d.carrierId) ?? null) : null,
    lastTransmittedAt: d.lastTransmittedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/documents", async (req, res) => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [doc] = await db.insert(documentsTable).values({
    ...parsed.data,
    carrierId: parsed.data.carrierId ?? null,
    isPdfFillable: parsed.data.isPdfFillable ?? false,
  }).returning();

  const carrier = doc.carrierId
    ? (await db.select().from(carriersTable).where(eq(carriersTable.id, doc.carrierId)))[0]
    : null;

  res.status(201).json({
    ...doc,
    carrierName: carrier?.name ?? null,
    lastTransmittedAt: doc.lastTransmittedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  });
});

router.get("/documents/:id", async (req, res) => {
  const parsed = GetDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, parsed.data.id));
  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const carrier = doc.carrierId
    ? (await db.select().from(carriersTable).where(eq(carriersTable.id, doc.carrierId)))[0]
    : null;

  res.json({
    ...doc,
    carrierName: carrier?.name ?? null,
    lastTransmittedAt: doc.lastTransmittedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  });
});

router.delete("/documents/:id", async (req, res) => {
  const parsed = DeleteDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(documentsTable).where(eq(documentsTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/documents/:id/transmit-email", async (req, res) => {
  const parsedParams = TransmitDocumentEmailParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = TransmitDocumentEmailBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, parsedParams.data.id));
  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db
    .update(documentsTable)
    .set({ transmissionStatus: "sent", lastTransmittedAt: new Date() })
    .where(eq(documentsTable.id, parsedParams.data.id));

  await db.insert(activityLogTable).values({
    type: "document_transmitted",
    description: `Document "${doc.name}" emailed to ${parsedBody.data.recipientEmail}`,
    relatedId: doc.id,
  });

  res.json({
    success: true,
    message: `Document emailed successfully to ${parsedBody.data.recipientEmail}`,
    referenceId: `EMAIL-${Date.now()}`,
  });
});

export default router;
