import type { AIProviderName, ContractRunInput, ContractRunResult } from "../types.js";
import { reviewContractWithRules } from "../demoContractReview.js";

type ProviderConfig = {
  provider: AIProviderName;
  apiKey?: string;
  model?: string;
};

const providerConfig = (): ProviderConfig => {
  const requested = (process.env.AI_PROVIDER || "demo").toLowerCase() as AIProviderName;
  if (requested === "openai") {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4.1-mini" };
  }
  if (requested === "anthropic") {
    return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest" };
  }
  if (requested === "gemini") {
    return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-1.5-pro" };
  }
  return { provider: "demo" };
};

const systemPrompt = `You are ClausePilot AI, a contract review assistant for legal operations.
Return strict JSON matching this high-level shape:
{
  "summary": "short executive summary",
  "riskScore": 0-100,
  "reviewStatus": "approved|business_approval|legal_review|needs_legal_review",
  "suggestedAsks": ["negotiation ask"],
  "obligations": ["operational obligation"]
}
Do not give legal advice. Flag uncertainty conservatively.`;

async function askOpenAI(config: ProviderConfig, input: ContractRunInput) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(input) }
      ],
      temperature: 0.1
    })
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content || "{}";
}

async function askAnthropic(config: ProviderConfig, input: ContractRunInput) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": String(config.apiKey),
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1600,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: "user", content: JSON.stringify(input) }]
    })
  });
  if (!response.ok) throw new Error(`Anthropic request failed: ${response.status}`);
  const payload = await response.json() as { content?: Array<{ text?: string }> };
  return payload.content?.[0]?.text || "{}";
}

async function askGemini(config: ProviderConfig, input: ContractRunInput) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${JSON.stringify(input)}` }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
    })
  });
  if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

const extractJson = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || "{}";
};

export async function runContractReview(input: ContractRunInput): Promise<ContractRunResult> {
  const config = providerConfig();
  const deterministic = reviewContractWithRules(input, config.provider);

  if (config.provider === "demo" || !config.apiKey) {
    return {
      ...deterministic,
      provider: "demo",
      auditTrail: [
        ...deterministic.auditTrail,
        {
          step: "AI provider",
          detail: "No provider key detected; deterministic demo review was used.",
          timestamp: deterministic.createdAt
        }
      ]
    };
  }

  try {
    const raw =
      config.provider === "openai"
        ? await askOpenAI(config, input)
        : config.provider === "anthropic"
          ? await askAnthropic(config, input)
          : await askGemini(config, input);

    const parsed = JSON.parse(extractJson(raw)) as Partial<ContractRunResult>;

    return {
      ...deterministic,
      summary: parsed.summary || deterministic.summary,
      riskScore: typeof parsed.riskScore === "number" ? Math.min(100, Math.max(0, Math.round(parsed.riskScore))) : deterministic.riskScore,
      reviewStatus: parsed.reviewStatus || deterministic.reviewStatus,
      obligations: Array.isArray(parsed.obligations) && parsed.obligations.length ? parsed.obligations : deterministic.obligations,
      suggestedAsks: Array.isArray(parsed.suggestedAsks) && parsed.suggestedAsks.length ? parsed.suggestedAsks : deterministic.suggestedAsks,
      auditTrail: [
        ...deterministic.auditTrail,
        {
          step: "AI provider",
          detail: `${config.provider} model ${config.model} enriched the deterministic playbook review.`,
          timestamp: deterministic.createdAt
        }
      ]
    };
  } catch (error) {
    return {
      ...deterministic,
      provider: "demo",
      reviewStatus: deterministic.reviewStatus === "approved" ? "business_approval" : deterministic.reviewStatus,
      auditTrail: [
        ...deterministic.auditTrail,
        {
          step: "Provider fallback",
          detail: error instanceof Error ? error.message : "Provider failed; deterministic review used.",
          timestamp: deterministic.createdAt
        }
      ]
    };
  }
}
