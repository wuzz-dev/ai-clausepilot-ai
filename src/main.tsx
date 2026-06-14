import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileSearch,
  Gauge,
  KeyRound,
  Layers3,
  LockKeyhole,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WalletCards,
  Webhook
} from "lucide-react";
import "./styles.css";

type ClauseFinding = {
  label: string;
  summary: string;
  extractedText: string;
  risk: "low" | "medium" | "high";
  playbookStatus: "approved" | "needs_revision" | "missing" | "not_applicable";
  suggestedAsk: string;
};

type ContractResult = {
  id: string;
  contractName: string;
  provider: "demo" | "openai" | "anthropic" | "gemini";
  reviewStatus: "approved" | "business_approval" | "legal_review" | "needs_legal_review";
  riskScore: number;
  confidence: number;
  summary: string;
  clauseMap: ClauseFinding[];
  obligations: string[];
  approvalRoute: string[];
  suggestedAsks: string[];
  renewalReminder?: string;
  auditTrail: Array<{ step: string; detail: string; timestamp: string }>;
  metrics: {
    estimatedMinutesSaved: number;
    aiCostUsd: number;
    creditsUsed: number;
    tokensEstimated: number;
  };
  createdAt: string;
};

const sampleContract = `Master Services Agreement between Northstar Analytics and VendorCo.
The customer shall indemnify and hold VendorCo harmless from all claims arising out of customer data.
VendorCo's aggregate liability is unlimited for all claims and excludes consequential damages only at VendorCo's discretion.
This agreement automatically renews unless either party gives 30 days notice before the renewal date.
Payment is due Net 60 after receipt of invoice.
The agreement is governed by the laws of Texas.
VendorCo may process personal data but the parties have not attached a data processing agreement.
Termination is permitted only for uncured material breach after 45 days notice.`;

const pricing = [
  { name: "Solo", price: "$149", volume: "50 reviews", best: false },
  { name: "Team", price: "$399", volume: "250 reviews + playbooks", best: true },
  { name: "Legal Ops", price: "$999", volume: "1,000 reviews + routing", best: false }
];

const routeLabels: Record<ContractResult["reviewStatus"], string> = {
  approved: "Approved",
  business_approval: "Business approval",
  legal_review: "Legal review",
  needs_legal_review: "Legal priority"
};

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Gauge }) {
  return (
    <div className="stat">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function App() {
  const [contractText, setContractText] = useState(sampleContract);
  const [contractName, setContractName] = useState("VendorCo MSA");
  const [counterparty, setCounterparty] = useState("VendorCo");
  const [dealValue, setDealValue] = useState(120000);
  const [liabilityCapMaxMonths, setLiabilityCapMaxMonths] = useState(12);
  const [renewalNoticeDaysMin, setRenewalNoticeDaysMin] = useState(45);
  const [maxPaymentTermDays, setMaxPaymentTermDays] = useState(45);
  const [result, setResult] = useState<ContractResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [monthlyContracts, setMonthlyContracts] = useState(85);
  const [minutesPerReview, setMinutesPerReview] = useState(70);
  const [hourlyCost, setHourlyCost] = useState(135);

  const roi = useMemo(() => {
    const hoursSaved = (monthlyContracts * minutesPerReview * 0.72) / 60;
    const value = hoursSaved * hourlyCost;
    const net = value - 399;
    return { hoursSaved, value, net };
  }, [monthlyContracts, minutesPerReview, hourlyCost]);

  async function runReview() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/runs/contract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractText,
          contractName,
          counterparty,
          dealValue,
          reviewerEmail: "",
          playbook: {
            liabilityCapMaxMonths,
            renewalNoticeDaysMin,
            maxPaymentTermDays,
            indemnityRequiresMutuality: true,
            dataProcessingRequired: true,
            governingLawAllowed: ["New York", "Delaware", "California", "Singapore"],
            requiresTerminationForConvenience: true
          }
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Review failed");
      }
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  const activeResult = result;
  const highRisk = activeResult?.clauseMap.filter((finding) => finding.risk === "high").length ?? 2;
  const mediumRisk = activeResult?.clauseMap.filter((finding) => finding.risk === "medium").length ?? 3;

  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="Primary">
          <div className="brand">
            <Scale size={24} aria-hidden="true" />
            <span>ClausePilot AI</span>
          </div>
          <div className="nav-actions">
            <a href="#dashboard">Dashboard</a>
            <a href="#pricing">Pricing</a>
            <button className="icon-button" aria-label="API keys">
              <KeyRound size={18} />
            </button>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Contract risk review and approval routing</p>
            <h1>Turn messy contracts into a routed legal playbook in minutes.</h1>
            <p className="lede">
              ClausePilot extracts key clauses, checks them against your policy, creates negotiation asks,
              and gives sales, procurement, and legal the same audit trail.
            </p>
            <div className="hero-actions">
              <a className="primary" href="#dashboard">
                Run review <ArrowRight size={18} />
              </a>
              <a className="secondary" href="#workflow">View workflow</a>
            </div>
            <div className="hero-stats">
              <Stat label="Review time cut" value="72%" icon={Clock3} />
              <Stat label="Gross margin target" value="82%" icon={WalletCards} />
              <Stat label="Fallback mode" value="Demo safe" icon={ShieldCheck} />
            </div>
          </div>

          <div className="hero-visual" aria-label="Contract review workflow preview">
            <div className="document-sheet">
              <div className="sheet-top">
                <span>VendorCo MSA</span>
                <strong>Risk 78</strong>
              </div>
              <div className="clause-line danger" />
              <div className="clause-line medium" />
              <div className="clause-line ok" />
              <div className="finding-stack">
                <span><AlertTriangle size={15} /> Liability uncapped</span>
                <span><BookOpenCheck size={15} /> DPA missing</span>
                <span><Route size={15} /> Legal + finance route</span>
              </div>
            </div>
            <div className="route-card">
              <Sparkles size={18} />
              <strong>AI playbook pass</strong>
              <p>7 clause families extracted, 4 asks drafted, 3 approvals routed.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="workflow">
        <div className="section-head">
          <p className="eyebrow">Before vs after</p>
          <h2>Replace copy-paste legal triage with structured review.</h2>
        </div>
        <div className="comparison">
          <div>
            <h3>Manual workflow</h3>
            <ol>
              <li>Read full agreement and hunt for key terms.</li>
              <li>Paste notes into email threads and spreadsheets.</li>
              <li>Ask legal, finance, and security the same questions again.</li>
              <li>Lose renewal and approval context after signature.</li>
            </ol>
          </div>
          <div>
            <h3>ClausePilot workflow</h3>
            <ol>
              <li>Extract clauses into a strict risk schema.</li>
              <li>Compare terms to your playbook thresholds.</li>
              <li>Route approvals with suggested negotiation asks.</li>
              <li>Store audit events and renewal reminders automatically.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="band compact">
        <div className="roi">
          <div>
            <p className="eyebrow">ROI calculator</p>
            <h2>${roi.net.toLocaleString(undefined, { maximumFractionDigits: 0 })} estimated monthly net value</h2>
            <p>
              Based on {monthlyContracts} contracts/month, {minutesPerReview} minutes per manual review,
              and ${hourlyCost}/hour loaded reviewer cost.
            </p>
          </div>
          <div className="sliders">
            <label>
              Contracts/month
              <input type="range" min="10" max="300" value={monthlyContracts} onChange={(event) => setMonthlyContracts(Number(event.target.value))} />
            </label>
            <label>
              Minutes/review
              <input type="range" min="20" max="180" value={minutesPerReview} onChange={(event) => setMinutesPerReview(Number(event.target.value))} />
            </label>
            <label>
              Loaded hourly cost
              <input type="range" min="60" max="260" value={hourlyCost} onChange={(event) => setHourlyCost(Number(event.target.value))} />
            </label>
          </div>
        </div>
      </section>

      <section className="dashboard" id="dashboard">
        <div className="section-head">
          <p className="eyebrow">Live automation dashboard</p>
          <h2>Review intake, playbook checks, routing, and usage in one surface.</h2>
        </div>

        <div className="dashboard-grid">
          <form className="panel intake" onSubmit={(event) => { event.preventDefault(); void runReview(); }}>
            <div className="panel-title">
              <UploadCloud size={20} />
              <h3>Contract intake</h3>
            </div>
            <div className="field-row">
              <label>
                Contract name
                <input value={contractName} onChange={(event) => setContractName(event.target.value)} />
              </label>
              <label>
                Counterparty
                <input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} />
              </label>
            </div>
            <label>
              Contract text
              <textarea value={contractText} onChange={(event) => setContractText(event.target.value)} />
            </label>
            <div className="field-row">
              <label>
                Deal value
                <input type="number" value={dealValue} onChange={(event) => setDealValue(Number(event.target.value))} />
              </label>
              <label>
                Liability cap max months
                <input type="number" value={liabilityCapMaxMonths} onChange={(event) => setLiabilityCapMaxMonths(Number(event.target.value))} />
              </label>
            </div>
            <div className="field-row">
              <label>
                Renewal notice minimum
                <input type="number" value={renewalNoticeDaysMin} onChange={(event) => setRenewalNoticeDaysMin(Number(event.target.value))} />
              </label>
              <label>
                Max payment terms
                <input type="number" value={maxPaymentTermDays} onChange={(event) => setMaxPaymentTermDays(Number(event.target.value))} />
              </label>
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button className="primary wide" disabled={loading}>
              {loading ? "Reviewing..." : "Run contract review"}
            </button>
          </form>

          <div className="panel score-panel">
            <div className="panel-title">
              <Gauge size={20} />
              <h3>Risk report</h3>
            </div>
            <div className="risk-meter" style={{ "--risk": `${activeResult?.riskScore ?? 64}%` } as React.CSSProperties}>
              <strong>{activeResult?.riskScore ?? 64}</strong>
              <span>{activeResult ? routeLabels[activeResult.reviewStatus] : "Demo ready"}</span>
            </div>
            <p className="summary">{activeResult?.summary ?? "Run the sample agreement to generate a structured risk report, approval route, and negotiation checklist."}</p>
            <div className="mini-grid">
              <Stat label="High risk" value={String(highRisk)} icon={AlertTriangle} />
              <Stat label="Medium risk" value={String(mediumRisk)} icon={BarChart3} />
              <Stat label="Confidence" value={`${Math.round((activeResult?.confidence ?? 0.82) * 100)}%`} icon={BadgeCheck} />
              <Stat label="Credits" value={String(activeResult?.metrics.creditsUsed ?? 2)} icon={WalletCards} />
            </div>
          </div>

          <div className="panel findings">
            <div className="panel-title">
              <FileSearch size={20} />
              <h3>Clause map</h3>
            </div>
            {(activeResult?.clauseMap ?? []).slice(0, 7).map((finding) => (
              <article className={`finding ${finding.risk}`} key={finding.label}>
                <div>
                  <strong>{finding.label}</strong>
                  <span>{finding.playbookStatus.replace("_", " ")}</span>
                </div>
                <p>{finding.summary}</p>
              </article>
            ))}
            {!activeResult ? (
              <div className="placeholder-list">
                <span>Liability cap</span>
                <span>Privacy and DPA</span>
                <span>Renewal notice</span>
                <span>Payment terms</span>
              </div>
            ) : null}
          </div>

          <div className="panel route">
            <div className="panel-title">
              <Route size={20} />
              <h3>Approval route</h3>
            </div>
            <div className="route-list">
              {(activeResult?.approvalRoute ?? ["Sales owner", "Legal counsel", "Finance leadership"]).map((routeItem) => (
                <span key={routeItem}>{routeItem}</span>
              ))}
            </div>
            <h4>Negotiation asks</h4>
            <ul>
              {(activeResult?.suggestedAsks ?? [
                "Limit liability to 12 months of fees.",
                "Attach current DPA and breach notice language.",
                "Move payment terms to Net 45 or faster."
              ]).slice(0, 4).map((ask) => (
                <li key={ask}>{ask}</li>
              ))}
            </ul>
          </div>

          <div className="panel usage">
            <div className="panel-title">
              <Layers3 size={20} />
              <h3>Usage and audit</h3>
            </div>
            <div className="usage-bars">
              <div><span style={{ width: "64%" }} /> Reviews used</div>
              <div><span style={{ width: "38%" }} /> Credit burn</div>
              <div><span style={{ width: "82%" }} /> Time saved</div>
            </div>
            <div className="audit">
              {(activeResult?.auditTrail ?? [
                { step: "Text intake", detail: "Sample contract ready for review.", timestamp: new Date().toISOString() },
                { step: "Playbook", detail: "Default company policy loaded.", timestamp: new Date().toISOString() },
                { step: "Webhook", detail: "Routing webhook configured in demo mode.", timestamp: new Date().toISOString() }
              ]).map((event) => (
                <p key={`${event.step}-${event.timestamp}`}><strong>{event.step}</strong>{event.detail}</p>
              ))}
            </div>
          </div>

          <div className="panel settings">
            <div className="panel-title">
              <LockKeyhole size={20} />
              <h3>Controls</h3>
            </div>
            <div className="control-grid">
              <span><CheckCircle2 size={16} /> Human approval for high risk</span>
              <span><Webhook size={16} /> Webhook delivery ready</span>
              <span><ShieldCheck size={16} /> No secrets in client code</span>
              <span><Sparkles size={16} /> OpenAI, Anthropic, Gemini envs</span>
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="pricing">
        <div className="section-head">
          <p className="eyebrow">Pricing</p>
          <h2>Metered plans that preserve AI margin.</h2>
        </div>
        <div className="pricing">
          {pricing.map((plan) => (
            <article className={plan.best ? "price-card featured" : "price-card"} key={plan.name}>
              <span>{plan.name}</span>
              <strong>{plan.price}<small>/mo</small></strong>
              <p>{plan.volume}</p>
              <button>{plan.best ? "Start team trial" : "Choose plan"}</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
