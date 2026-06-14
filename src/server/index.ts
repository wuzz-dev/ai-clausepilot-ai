import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { runContractReview } from "./providers/aiProvider.js";
import type { ContractRunInput, ContractRunResult } from "./types.js";

const app = express();
const port = Number(process.env.PORT || 8080);
const runs: ContractRunResult[] = [];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDist = path.resolve(__dirname, "../dist");

const runSchema = z.object({
  contractText: z.string().min(80, "Add at least a few contract clauses for review."),
  contractName: z.string().optional(),
  companyName: z.string().optional(),
  counterparty: z.string().optional(),
  dealValue: z.coerce.number().nonnegative().optional(),
  reviewerEmail: z.string().email().optional().or(z.literal("")),
  playbook: z
    .object({
      liabilityCapMaxMonths: z.coerce.number().positive().optional(),
      indemnityRequiresMutuality: z.boolean().optional(),
      renewalNoticeDaysMin: z.coerce.number().positive().optional(),
      dataProcessingRequired: z.boolean().optional(),
      governingLawAllowed: z.array(z.string()).optional(),
      maxPaymentTermDays: z.coerce.number().positive().optional(),
      requiresTerminationForConvenience: z.boolean().optional()
    })
    .optional()
});

app.use(cors({ origin: process.env.WEB_ORIGIN || true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "clausepilot-ai",
    provider: process.env.AI_PROVIDER || "demo",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/runs", (_request, response) => {
  response.json({ runs: runs.slice(0, 25) });
});

app.post("/api/runs/contract", async (request, response) => {
  const parsed = runSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid contract run request",
      details: parsed.error.flatten()
    });
    return;
  }

  const input: ContractRunInput = {
    ...parsed.data,
    reviewerEmail: parsed.data.reviewerEmail || undefined
  };

  const result = await runContractReview(input);
  runs.unshift(result);
  response.status(201).json(result);
});

app.use(express.static(webDist));

app.get(/^\/(?!api).*/, (_request, response) => {
  response.sendFile(path.join(webDist, "index.html"));
});

app.listen(port, () => {
  console.log(`ClausePilot AI API listening on http://localhost:${port}`);
});
