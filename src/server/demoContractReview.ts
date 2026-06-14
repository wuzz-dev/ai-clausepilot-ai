import type { ClauseFinding, ContractRunInput, ContractRunResult, Playbook } from "./types.js";

const defaultPlaybook: Playbook = {
  liabilityCapMaxMonths: 12,
  indemnityRequiresMutuality: true,
  renewalNoticeDaysMin: 45,
  dataProcessingRequired: true,
  governingLawAllowed: ["New York", "Delaware", "California", "Singapore"],
  maxPaymentTermDays: 45,
  requiresTerminationForConvenience: true
};

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

const findSentence = (text: string, patterns: RegExp[]) => {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(compact)
    .filter(Boolean);

  return (
    sentences.find((sentence) => patterns.some((pattern) => pattern.test(sentence))) ??
    ""
  );
};

const extractNumber = (value: string, fallback = 0) => {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : fallback;
};

const riskWeight = (risk: ClauseFinding["risk"]) => {
  if (risk === "high") return 26;
  if (risk === "medium") return 14;
  return 4;
};

export const mergedPlaybook = (playbook?: Partial<Playbook>): Playbook => ({
  ...defaultPlaybook,
  ...playbook,
  governingLawAllowed: playbook?.governingLawAllowed?.length
    ? playbook.governingLawAllowed
    : defaultPlaybook.governingLawAllowed
});

export function reviewContractWithRules(input: ContractRunInput, provider: ContractRunResult["provider"] = "demo"): ContractRunResult {
  const now = new Date().toISOString();
  const playbook = mergedPlaybook(input.playbook);
  const text = compact(input.contractText);
  const lower = text.toLowerCase();

  const liabilityText = findSentence(text, [/liabil/i, /cap/i, /consequential/i]);
  const indemnityText = findSentence(text, [/indemn/i, /hold harmless/i]);
  const renewalText = findSentence(text, [/renew/i, /auto-renew/i, /notice/i]);
  const privacyText = findSentence(text, [/data processing/i, /personal data/i, /security/i, /privacy/i]);
  const terminationText = findSentence(text, [/termination/i, /convenience/i, /cause/i]);
  const paymentText = findSentence(text, [/payment/i, /net\s*\d+/i, /invoice/i]);
  const lawText = findSentence(text, [/governing law/i, /jurisdiction/i, /venue/i]);

  const liabilityMonths = /uncapped|unlimited/i.test(liabilityText)
    ? 999
    : /month/i.test(liabilityText)
      ? extractNumber(liabilityText, playbook.liabilityCapMaxMonths)
      : /fees paid/i.test(liabilityText)
        ? 12
        : 0;

  const paymentDays = /net\s*(\d+)/i.exec(paymentText)?.[1]
    ? Number(/net\s*(\d+)/i.exec(paymentText)?.[1])
    : extractNumber(paymentText, 30);

  const renewalNotice = /(\d+)\s*days?.{0,32}notice/i.exec(renewalText)?.[1]
    ? Number(/(\d+)\s*days?.{0,32}notice/i.exec(renewalText)?.[1])
    : extractNumber(renewalText, 30);

  const allowedLaw = playbook.governingLawAllowed.some((law) => lawText.toLowerCase().includes(law.toLowerCase()));
  const unilateralIndemnity = /customer|client|company/i.test(indemnityText) && !/mutual|each party|both parties/i.test(indemnityText);
  const hasDpa = /data processing agreement|dpa|personal data|security measures|soc 2|iso 27001/i.test(privacyText);
  const hasTerminationConvenience = /convenience/i.test(terminationText);

  const findings: ClauseFinding[] = [
    {
      label: "Liability cap",
      summary: liabilityText
        ? liabilityMonths >= 999
          ? "Liability appears uncapped or unlimited."
          : `Liability cap appears near ${liabilityMonths || playbook.liabilityCapMaxMonths} months of fees.`
        : "No clear liability cap was found.",
      extractedText: liabilityText || "Not found",
      risk: !liabilityText || liabilityMonths > playbook.liabilityCapMaxMonths ? "high" : "low",
      playbookStatus: !liabilityText || liabilityMonths > playbook.liabilityCapMaxMonths ? "needs_revision" : "approved",
      suggestedAsk: `Limit aggregate liability to no more than ${playbook.liabilityCapMaxMonths} months of fees and exclude only narrow, mutual carveouts.`
    },
    {
      label: "Indemnity",
      summary: indemnityText
        ? unilateralIndemnity
          ? "Indemnity language appears one-sided."
          : "Indemnity language appears mutual or limited."
        : "No indemnity language was found.",
      extractedText: indemnityText || "Not found",
      risk: !indemnityText || unilateralIndemnity ? "medium" : "low",
      playbookStatus: !indemnityText ? "missing" : unilateralIndemnity ? "needs_revision" : "approved",
      suggestedAsk: "Make indemnities mutual, capped where possible, and limited to third-party claims caused by breach or negligence."
    },
    {
      label: "Renewal and notice",
      summary: renewalText
        ? `Renewal notice appears to be ${renewalNotice} days.`
        : "No renewal or notice period was found.",
      extractedText: renewalText || "Not found",
      risk: renewalText && renewalNotice >= playbook.renewalNoticeDaysMin ? "low" : "medium",
      playbookStatus: renewalText && renewalNotice >= playbook.renewalNoticeDaysMin ? "approved" : "needs_revision",
      suggestedAsk: `Require at least ${playbook.renewalNoticeDaysMin} days notice before any auto-renewal deadline and add calendar reminders.`
    },
    {
      label: "Privacy and security",
      summary: hasDpa
        ? "Privacy or data-processing protections were detected."
        : "Privacy, security, or DPA obligations are thin or missing.",
      extractedText: privacyText || "Not found",
      risk: playbook.dataProcessingRequired && !hasDpa ? "high" : "low",
      playbookStatus: playbook.dataProcessingRequired && !hasDpa ? "missing" : "approved",
      suggestedAsk: "Attach the current DPA, security exhibit, breach notification timing, and subprocessors disclosure obligations."
    },
    {
      label: "Termination rights",
      summary: hasTerminationConvenience
        ? "Termination for convenience appears available."
        : "Termination rights may be limited to breach or cause.",
      extractedText: terminationText || "Not found",
      risk: playbook.requiresTerminationForConvenience && !hasTerminationConvenience ? "medium" : "low",
      playbookStatus: playbook.requiresTerminationForConvenience && !hasTerminationConvenience ? "needs_revision" : "approved",
      suggestedAsk: "Add termination for convenience with a practical notice period and survival terms limited to necessary clauses."
    },
    {
      label: "Payment terms",
      summary: paymentText ? `Payment term appears to be Net ${paymentDays}.` : "No payment term was found.",
      extractedText: paymentText || "Not found",
      risk: paymentDays > playbook.maxPaymentTermDays ? "medium" : "low",
      playbookStatus: paymentDays > playbook.maxPaymentTermDays ? "needs_revision" : "approved",
      suggestedAsk: `Keep payment terms at Net ${playbook.maxPaymentTermDays} or faster, with late-fee and suspension rights preserved.`
    },
    {
      label: "Governing law",
      summary: lawText
        ? allowedLaw
          ? "Governing law matches the approved playbook list."
          : "Governing law may fall outside the approved list."
        : "No governing law clause was found.",
      extractedText: lawText || "Not found",
      risk: lawText && allowedLaw ? "low" : "medium",
      playbookStatus: lawText && allowedLaw ? "approved" : lawText ? "needs_revision" : "missing",
      suggestedAsk: `Use one of the approved forums: ${playbook.governingLawAllowed.join(", ")}.`
    }
  ];

  const nonStandardSignals = [
    /exclusive remedy/i,
    /most favored/i,
    /audit rights/i,
    /source code escrow/i,
    /non-solicit/i,
    /assignment without consent/i
  ].filter((pattern) => pattern.test(lower)).length;

  const riskScore = Math.min(
    100,
    Math.round(findings.reduce((score, finding) => score + riskWeight(finding.risk), 0) + nonStandardSignals * 7)
  );

  const reviewStatus: ContractRunResult["reviewStatus"] =
    riskScore >= 70 ? "needs_legal_review" : riskScore >= 45 ? "legal_review" : riskScore >= 28 ? "business_approval" : "approved";

  const approvalRoute = [
    ...(riskScore >= 28 ? ["Sales or procurement owner"] : []),
    ...(riskScore >= 45 ? ["Legal counsel"] : []),
    ...(riskScore >= 70 || Number(input.dealValue ?? 0) >= 100000 ? ["Finance leadership"] : []),
    ...(findings.some((finding) => finding.label === "Privacy and security" && finding.risk === "high") ? ["Security reviewer"] : [])
  ];

  const suggestedAsks = findings
    .filter((finding) => finding.playbookStatus !== "approved")
    .map((finding) => finding.suggestedAsk);

  const obligations = [
    paymentText ? `Track invoice payment obligation: ${paymentText}` : "Confirm invoice timing before signature.",
    renewalText ? `Create renewal notice reminder from clause: ${renewalText}` : "Add renewal reminder once notice period is clarified.",
    privacyText ? `Confirm security/privacy owner accepts: ${privacyText}` : "Confirm whether customer data is processed under the agreement.",
    terminationText ? `Review termination operations: ${terminationText}` : "Confirm termination assistance obligations."
  ];

  const tokensEstimated = Math.max(700, Math.round(text.length / 3.8) + 900);
  const creditsUsed = Math.max(1, Math.ceil(tokensEstimated / 1800));
  const aiCostUsd = provider === "demo" ? 0 : Number((tokensEstimated * 0.0000025).toFixed(4));

  return {
    id: `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    contractName: input.contractName || `${input.counterparty || "Counterparty"} agreement`,
    provider,
    reviewStatus,
    riskScore,
    confidence: Math.max(0.68, Number((0.94 - riskScore / 350).toFixed(2))),
    summary:
      riskScore >= 70
        ? "High-risk agreement. Legal review is required before signature, with liability, privacy, and renewal terms prioritized."
        : riskScore >= 45
          ? "Moderate-risk agreement. Route to legal with a focused negotiation checklist."
          : "Agreement is mostly aligned with the playbook. Complete business approval and store the audit trail.",
    clauseMap: findings,
    obligations,
    approvalRoute: approvalRoute.length ? Array.from(new Set(approvalRoute)) : ["Contract owner"],
    suggestedAsks,
    renewalReminder: renewalText ? `Schedule reminder ${Math.max(renewalNotice - 7, 1)} days before notice deadline.` : undefined,
    auditTrail: [
      { step: "Text intake", detail: `${text.length.toLocaleString()} characters normalized for review.`, timestamp: now },
      { step: "Clause extraction", detail: `${findings.length} clause families classified.`, timestamp: now },
      { step: "Playbook comparison", detail: `${suggestedAsks.length} negotiation asks generated.`, timestamp: now },
      { step: "Approval routing", detail: `Route: ${approvalRoute.length ? approvalRoute.join(" -> ") : "Contract owner"}.`, timestamp: now }
    ],
    metrics: {
      estimatedMinutesSaved: Math.max(35, Math.round(text.length / 120)),
      aiCostUsd,
      creditsUsed,
      tokensEstimated
    },
    createdAt: now
  };
}
