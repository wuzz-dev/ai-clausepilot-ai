export type AIProviderName = "demo" | "openai" | "anthropic" | "gemini";

export type ContractRunInput = {
  contractText: string;
  contractName?: string;
  companyName?: string;
  counterparty?: string;
  dealValue?: number;
  reviewerEmail?: string;
  playbook?: Partial<Playbook>;
};

export type Playbook = {
  liabilityCapMaxMonths: number;
  indemnityRequiresMutuality: boolean;
  renewalNoticeDaysMin: number;
  dataProcessingRequired: boolean;
  governingLawAllowed: string[];
  maxPaymentTermDays: number;
  requiresTerminationForConvenience: boolean;
};

export type ClauseFinding = {
  label: string;
  summary: string;
  extractedText: string;
  risk: "low" | "medium" | "high";
  playbookStatus: "approved" | "needs_revision" | "missing" | "not_applicable";
  suggestedAsk: string;
};

export type AuditEvent = {
  step: string;
  detail: string;
  timestamp: string;
};

export type ContractRunResult = {
  id: string;
  contractName: string;
  provider: AIProviderName;
  reviewStatus: "approved" | "business_approval" | "legal_review" | "needs_legal_review";
  riskScore: number;
  confidence: number;
  summary: string;
  clauseMap: ClauseFinding[];
  obligations: string[];
  approvalRoute: string[];
  suggestedAsks: string[];
  renewalReminder?: string;
  auditTrail: AuditEvent[];
  metrics: {
    estimatedMinutesSaved: number;
    aiCostUsd: number;
    creditsUsed: number;
    tokensEstimated: number;
  };
  createdAt: string;
};
