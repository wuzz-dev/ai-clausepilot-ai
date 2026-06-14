# ClausePilot AI

AI contract review and approval routing for teams that need structured risk checks without a heavy CLM rollout.

## What It Does

- Extracts key contract clauses from pasted text or future document ingestion.
- Scores liability, indemnity, renewal, privacy, payment, termination, and governing-law risk against a company playbook.
- Produces negotiation asks, approval routes, obligations, renewal reminders, and an audit trail.
- Runs in deterministic demo mode when no AI key is configured, then can enrich results through OpenAI, Anthropic, or Gemini.

## Quick Start

```bash
npm install
npm run dev
```

Open the Vite URL for the web app. The API runs on port `8080` by default.

```bash
npm run build
npm start
```

## API

Health:

```bash
curl http://localhost:8080/api/health
```

Run a contract review:

```bash
curl -X POST http://localhost:8080/api/runs/contract \
  -H "content-type: application/json" \
  -d "{\"contractText\":\"Paste at least 80 characters of contract language here.\",\"contractName\":\"Vendor MSA\"}"
```

## Environment

Copy `.env.example` to `.env`.

- `PORT`: API port.
- `WEB_ORIGIN`: allowed browser origin for local development.
- `AI_PROVIDER`: `demo`, `openai`, `anthropic`, or `gemini`.
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`: optional provider keys.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: placeholders for metered billing.
- `DATABASE_URL`: production database connection.
- `WEBHOOK_SIGNING_SECRET`: signing secret for async review delivery.

## Production Architecture

- Frontend: Vite/React static app deployed to Vercel, Netlify, or Render Static Sites.
- API: Express service on Render, Railway, Fly.io, or a container host.
- Database: Supabase/Postgres for runs, playbooks, users, and audit events.
- Queue: BullMQ/Redis for long document parsing and provider retries.
- Billing: Stripe metered subscriptions keyed by review credits.

## Cost Controls

- Use deterministic policy rules first, then call the selected LLM only for enrichment.
- Cap contract text length per plan and chunk very long agreements.
- Cache review results by content hash and playbook version.
- Route low-confidence results to human review instead of looping provider calls.

## Launch Checklist

- Publish sample contracts and screenshots.
- Add Product Hunt, Indie Hackers, legal-ops, procurement, and founder launch posts.
- Create comparison pages for manual review, generic ChatGPT review, and heavyweight CLM rollout.
- Offer concierge onboarding for the first 10 teams to tune playbooks.

## License

MIT
