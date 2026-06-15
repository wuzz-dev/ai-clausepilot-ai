import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  Gavel,
  Gauge,
  History,
  KeyRound,
  Layers3,
  LockKeyhole,
  Play,
  Route,
  Scale,
  ShieldCheck,
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

const contractSamples = [
  {
    label: "Vendor MSA",
    name: "VendorCo MSA",
    counterparty: "VendorCo",
    dealValue: 120000,
    text: `Master Services Agreement between Northstar Analytics and VendorCo.
The customer shall indemnify and hold VendorCo harmless from all claims arising out of customer data.
VendorCo's aggregate liability is unlimited for all claims and excludes consequential damages only at VendorCo's discretion.
This agreement automatically renews unless either party gives 30 days notice before the renewal date.
Payment is due Net 60 after receipt of invoice.
The agreement is governed by the laws of Texas.
VendorCo may process personal data but the parties have not attached a data processing agreement.
Termination is permitted only for uncured material breach after 45 days notice.`
  },
  {
    label: "Customer order form",
    name: "Acme Analytics Order Form",
    counterparty: "Acme Analytics",
    dealValue: 42000,
    text: `Order Form for hosted analytics services.
Fees are payable Net 30. Either party may terminate for convenience on 30 days notice.
The service provider's aggregate liability is limited to 12 months of fees paid under this order.
Each party indemnifies the other for third-party claims caused by breach, negligence, or willful misconduct.
Customer data is processed under the attached Data Processing Addendum.
Governing law is Delaware. Renewal requires written agreement by both parties.`
  },
  {
    label: "High-risk data deal",
    name: "Healthcare Data Pilot",
    counterparty: "WellPath Labs",
    dealValue: 260000,
    text: `Pilot Agreement for healthcare data enrichment.
Customer grants Vendor access to regulated personal data. No data processing agreement is attached.
Vendor may use subcontractors without notice. Vendor disclaims security warranties.
Customer must indemnify Vendor for all claims, including Vendor negligence.
Liability is uncapped for Customer and capped at one month of fees for Vendor.
Payment terms are Net 75. Governing law is Nevada.
The agreement auto-renews for one year unless notice is sent 15 days before renewal.`
  }
];

const pricing = [
  { name: "Solo", price: "$149", volume: "50 reviews", note: "Founders and small sales teams" },
  { name: "Team", price: "$399", volume: "250 reviews", note: "Shared playbooks and routing" },
  { name: "Legal Ops", price: "$999", volume: "1,000 reviews", note: "Portfolio reporting and controls" }
];

const statusLabels: Record<ContractResult["reviewStatus"], string> = {
  approved: "Approved",
  business_approval: "Business approval",
  legal_review: "Legal review",
  needs_legal_review: "Legal priority"
};

const defaultRoute = ["Contract owner", "Legal counsel", "Finance leadership"];

function App() {
  const [selectedSample, setSelectedSample] = useState(0);
  const [contractText, setContractText] = useState(contractSamples[0].text);
  const [contractName, setContractName] = useState(contractSamples[0].name);
  const [counterparty, setCounterparty] = useState(contractSamples[0].counterparty);
  const [dealValue, setDealValue] = useState(contractSamples[0].dealValue);
  const [liabilityCapMaxMonths, setLiabilityCapMaxMonths] = useState(12);
  const [renewalNoticeDaysMin, setRenewalNoticeDaysMin] = useState(45);
  const [maxPaymentTermDays, setMaxPaymentTermDays] = useState(45);
  const [result, setResult] = useState<ContractResult | null>(null);
  const [history, setHistory] = useState<ContractResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [monthlyContracts, setMonthlyContracts] = useState(85);
  const [minutesPerReview, setMinutesPerReview] = useState(70);
  const [hourlyCost, setHourlyCost] = useState(135);

  const roi = useMemo(() => {
    const hoursSaved = Math.round((monthlyContracts * minutesPerReview * 0.64) / 60);
    const value = hoursSaved * hourlyCost;
    return { hoursSaved, value, net: value - 399 };
  }, [hourlyCost, minutesPerReview, monthlyContracts]);

  function chooseSample(index: number) {
    const sample = contractSamples[index];
    setSelectedSample(index);
    setContractText(sample.text);
    setContractName(sample.name);
    setCounterparty(sample.counterparty);
    setDealValue(sample.dealValue);
    setError("");
  }

  async function runReview(event?: React.FormEvent) {
    event?.preventDefault();
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
      const nextResult = payload as ContractResult;
      setResult(nextResult);
      setHistory((current) => [nextResult, ...current].slice(0, 6));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  const active = result;
  const findingPreview = active?.clauseMap ?? [];
  const highCount = findingPreview.filter((finding) => finding.risk === "high").length;
  const mediumCount = findingPreview.filter((finding) => finding.risk === "medium").length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Scale size={22} aria-hidden="true" />
          <div>
            <strong>ClausePilot</strong>
            <span>Contract review desk</span>
          </div>
        </div>
        <nav aria-label="Workspace">
          {[
            ["Intake", UploadCloud],
            ["Risk", Gauge],
            ["Routing", Route],
            ["Playbook", BookOpenCheck]
          ].map(([label, Icon]) => (
            <a href={`#${String(label).toLowerCase()}`} key={String(label)}>
              {React.createElement(Icon as typeof UploadCloud, { size: 17, "aria-hidden": true })}
              {String(label)}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Review output is a triage aid. High-risk agreements stay human-in-the-loop.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Legal operations</p>
            <h1>Contract risk review and approval routing</h1>
          </div>
          <button className="primary-action" onClick={() => void runReview()} disabled={loading}>
            <Play size={17} aria-hidden="true" />
            {loading ? "Reviewing" : "Run review"}
          </button>
        </header>

        <section className="metric-grid">
          <Metric icon={<FileSearch size={19} />} label="Reviews this month" value="214" detail="42 routed to legal" />
          <Metric icon={<AlertTriangle size={19} />} label="High-risk clauses" value={String(active ? highCount : 18)} detail="Privacy and liability lead" />
          <Metric icon={<Clock3 size={19} />} label="Time returned" value="167h" detail="Estimated from review minutes" />
          <Metric icon={<WalletCards size={19} />} label="Credit burn" value="$38.60" detail="Demo costs are zero" />
        </section>

        <section className="workbench" id="intake">
          <form className="panel intake-panel" onSubmit={(event) => void runReview(event)}>
            <div className="panel-header">
              <div>
                <p>Contract intake</p>
                <h2>Review a real clause set against your playbook</h2>
              </div>
              <Gavel size={20} aria-hidden="true" />
            </div>

            <div className="sample-tabs" role="tablist" aria-label="Contract samples">
              {contractSamples.map((sample, index) => (
                <button className={selectedSample === index ? "active" : ""} type="button" key={sample.label} onClick={() => chooseSample(index)}>
                  {sample.label}
                </button>
              ))}
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
            <label>
              Deal value
              <input type="number" value={dealValue} onChange={(event) => setDealValue(Number(event.target.value))} />
            </label>
            {error ? <p className="error-line">{error}</p> : null}
            <button className="primary-action wide" disabled={loading}>
              {loading ? "Reviewing agreement" : "Extract clauses and route"}
            </button>
          </form>

          <section className="panel risk-panel" id="risk">
            <div className="panel-header">
              <div>
                <p>Risk report</p>
                <h2>{active ? statusLabels[active.reviewStatus] : "Awaiting review"}</h2>
              </div>
              <Gauge size={20} aria-hidden="true" />
            </div>

            {active ? (
              <div className="risk-output">
                <div className={`risk-score ${active.reviewStatus}`}>
                  <strong>{active.riskScore}</strong>
                  <span>{Math.round(active.confidence * 100)}% confidence</span>
                </div>
                <p className="summary">{active.summary}</p>
                <div className="facts-grid">
                  <Fact label="High risk" value={String(highCount)} />
                  <Fact label="Medium risk" value={String(mediumCount)} />
                  <Fact label="Credits" value={String(active.metrics.creditsUsed)} />
                  <Fact label="Tokens est." value={active.metrics.tokensEstimated.toLocaleString()} />
                </div>
                <div className="finding-list">
                  {active.clauseMap.slice(0, 6).map((finding) => (
                    <article className={`finding ${finding.risk}`} key={finding.label}>
                      <div>
                        <strong>{finding.label}</strong>
                        <span>{finding.playbookStatus.replace("_", " ")}</span>
                      </div>
                      <p>{finding.summary}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <FileSearch size={34} aria-hidden="true" />
                <p>Run a contract to see clause extraction, risk score, suggested asks, and approval routing.</p>
              </div>
            )}
          </section>
        </section>

        <section className="two-column">
          <section className="panel" id="routing">
            <div className="panel-header">
              <div>
                <p>Approval route</p>
                <h2>Who needs to review next</h2>
              </div>
              <Route size={20} aria-hidden="true" />
            </div>
            <div className="route-list">
              {(active?.approvalRoute ?? defaultRoute).map((route, index) => (
                <div className="route-row" key={route}>
                  <span>{index + 1}</span>
                  <strong>{route}</strong>
                </div>
              ))}
            </div>
            <div className="ask-list">
              <h3>Negotiation asks</h3>
              {(active?.suggestedAsks ?? [
                "Limit aggregate liability to 12 months of fees.",
                "Attach the current data processing addendum.",
                "Require 45 days notice before renewal."
              ]).slice(0, 4).map((ask) => (
                <p key={ask}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {ask}
                </p>
              ))}
            </div>
          </section>

          <section className="panel" id="playbook">
            <div className="panel-header">
              <div>
                <p>Playbook controls</p>
                <h2>Policy thresholds</h2>
              </div>
              <BookOpenCheck size={20} aria-hidden="true" />
            </div>
            <div className="calculator-grid">
              <label>
                Liability cap max months
                <input type="number" value={liabilityCapMaxMonths} onChange={(event) => setLiabilityCapMaxMonths(Number(event.target.value))} />
              </label>
              <label>
                Renewal notice minimum
                <input type="number" value={renewalNoticeDaysMin} onChange={(event) => setRenewalNoticeDaysMin(Number(event.target.value))} />
              </label>
              <label>
                Max payment terms
                <input type="number" value={maxPaymentTermDays} onChange={(event) => setMaxPaymentTermDays(Number(event.target.value))} />
              </label>
            </div>
            <div className="settings-list">
              <p>
                <span>Allowed law</span>
                <strong>NY, DE, CA, Singapore</strong>
              </p>
              <p>
                <span>Security review</span>
                <strong>Required when personal data appears</strong>
              </p>
              <p>
                <span>Fallback</span>
                <strong>Route uncertain results to legal</strong>
              </p>
            </div>
          </section>
        </section>

        <section className="two-column">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p>ROI model</p>
                <h2>Review hours reclaimed</h2>
              </div>
              <Layers3 size={20} aria-hidden="true" />
            </div>
            <div className="calculator-grid">
              <label>
                Contracts/month
                <input type="number" value={monthlyContracts} min={5} onChange={(event) => setMonthlyContracts(Number(event.target.value))} />
              </label>
              <label>
                Minutes/review today
                <input type="number" value={minutesPerReview} min={15} onChange={(event) => setMinutesPerReview(Number(event.target.value))} />
              </label>
              <label>
                Reviewer hourly cost
                <input type="number" value={hourlyCost} min={50} onChange={(event) => setHourlyCost(Number(event.target.value))} />
              </label>
            </div>
            <div className="roi-result">
              <strong>${roi.net.toLocaleString()}</strong>
              <span>estimated monthly net value from {roi.hoursSaved} hours returned</span>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p>Controls</p>
                <h2>Operational guardrails</h2>
              </div>
              <LockKeyhole size={20} aria-hidden="true" />
            </div>
            <div className="rule-list">
              {[
                "Human approval is required for high-risk output",
                "Provider fallback keeps a deterministic rules pass",
                "No secrets are shipped to the browser",
                "Webhook delivery is documented for async review results"
              ].map((rule) => (
                <p key={rule}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  {rule}
                </p>
              ))}
            </div>
          </section>
        </section>

        <section className="panel pricing-panel">
          <div className="panel-header">
            <div>
              <p>Pricing</p>
              <h2>Metered plans for contract volume</h2>
            </div>
            <WalletCards size={20} aria-hidden="true" />
          </div>
          <div className="pricing-grid">
            {pricing.map((plan) => (
              <article key={plan.name}>
                <span>{plan.name}</span>
                <strong>{plan.price}<small>/mo</small></strong>
                <p>{plan.volume}</p>
                <em>{plan.note}</em>
              </article>
            ))}
          </div>
        </section>

        {history.length ? (
          <section className="panel history-panel">
            <div className="panel-header">
              <div>
                <p>Run history</p>
                <h2>Recent reviews</h2>
              </div>
              <History size={20} aria-hidden="true" />
            </div>
            <div className="history-list">
              {history.map((item) => (
                <button type="button" key={item.id} onClick={() => setResult(item)}>
                  <span>{item.contractName}</span>
                  <strong>{statusLabels[item.reviewStatus]}</strong>
                  <em>{item.riskScore}</em>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
