export interface CitedArticle {
  article: string;
  rationale: string;
}

export interface ContractDraftResponse {
  title: string;
  detectedContractType?: string;
  contractTypeRationale?: string;
  contractText: string;
  legalArticlesCited: CitedArticle[];
  attorneyRecommendations: string[];
  keyRiskProtections: string[];
}

export interface IdentifiedThreat {
  clauseTitle: string;
  originalSnippet?: string;
  threatExplanation: string;
  severity: "high" | "medium" | "low";
  alternativeProposal: string;
  targetParty?: string; // which party is disadvantaged
}

export interface DetectedParty {
  id: string; // e.g. "party_1", "party_2"
  title: string; // e.g. "طرف اول: خریدار (کارفرما)"
  roleName: string; // e.g. "خریدار"
  disadvantagesCount: number;
}

export interface RiskAnalysisResponse {
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number;
  executiveSummary: string;
  detectedParties: DetectedParty[];
  identifiedThreats: IdentifiedThreat[];
  missingClauses: string[];
  negotiationAdvice: string[];
}

export interface LegalQAResponse {
  plainLanguageAnswer: string; // پاسخ ساده و شفاف (خودمانی و روان)
  directAnswer: string; // پاسخ صریح و رسمی
  detailedAnalysis: string; // تحلیل و استدلال حقوقی
  statutoryReferences: string[]; // استناد به مواد قانونی
  actionChecklist: string[]; // چک‌لیست اقدامات فوری
  competentAuthority: string; // مرجع صالح رسیدگی
  requiredDocuments: string[]; // مدارک و ضمائم مورد نیاز
}

export interface LegalQAMessage {
  id: string;
  sender: "user" | "dadban";
  timestamp: string;
  question?: string;
  text?: string;
  response?: LegalQAResponse;
}

export interface AmbiguousTerm {
  term: string;
  simpleMeaning: string;
}

export interface DocumentFutureConsequences {
  finalOutcomeSummary: string; // نتیجه نهایی و پیامد اجرایی سند
  inevitableConsequences: string[]; // اتفاقاتی که حتماً رخ می‌دهد (آثار حقوقی مستقیم و قطعی)
  worstCaseScenarios: string[]; // سناریوهای بدبینانه و اتفاقات بدی که ممکن است بیفتد (به دلیل فقدان بندها، ابهام متن، سوءنیت طرف یا قصد کلی سند)
  preventiveSafeguards: string[]; // راه‌های پیشگیری و مهار خطرات احتمالی
}

export interface CaseSummaryResponse {
  caseTitle: string;
  plainLanguageSummary: string;
  partiesAndClaims: string;
  keyEventsTimeline: string[];
  ambiguousPointsAndJargon: AmbiguousTerm[];
  legalStrengths: string[];
  legalVulnerabilities: string[];
  futureConsequences?: DocumentFutureConsequences;
  recommendedNextSteps: string[];
}

export interface LegalDocument {
  id: string;
  title: string;
  category: "contract" | "court_brief" | "advisory" | "case_summary";
  content: string;
  createdAtPersian: string;
  updatedAtPersian: string;
  status: "draft" | "reviewed" | "archived";
  documentHash?: string;
  tags: string[];
}

export interface PdfSection {
  heading: string;
  text: string;
}

export interface PdfExtractedMetadata {
  dates: string[];
  monetaryAmounts: string[];
  partiesMentioned: string[];
  courtOrOfficeBranch?: string;
  caseOrRegistrationNumber?: string;
}

export interface PdfExtractionResponse {
  documentTitle: string;
  documentCategory: string;
  fullCleanText: string;
  wordCount: number;
  estimatedPages: number;
  detectedFontsAndEncoding: string;
  confidenceScore: number;
  articlesOrSections: PdfSection[];
  extractedMetadata: PdfExtractedMetadata;
  handwritingOrStampNotes: string[];
  extractionQualityNotes: string;
}

export interface JudicialRiskAudit {
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  proceduralNotes: string[]; // نکات آیین دادرسی و مهلت‌های قانونی
  vulnerabilitiesToAvoid: string[]; // تله‌ها و ایرادات شکلی که در نگارش مسدود شدند
  riskMitigationHighlights: string[]; // اقدامات انجام شده برای استحکام سند
}

export type JudicialPaperType = "petition" | "complaint" | "brief" | "notice";

export interface JudicialDraftResponse {
  title: string;
  paperType: JudicialPaperType;
  paperTypePersian: string;
  formattedDocument: string;
  executiveSummary: string;
  statutoryBasis: CitedArticle[];
  riskAssessmentAndAudit: JudicialRiskAudit;
  proceduralNextSteps: string[];
  requiredAttachments: string[];
}

export interface DocumentInspectionResponse {
  documentTitle: string;
  documentCategory: string;
  authenticityAndFormatScore: number; // 0 to 100
  overallVerdict: "valid" | "suspicious" | "defective" | "high_risk";
  verdictSummary: string;
  extractedParties: string[];
  extractedDates: string[];
  extractedAmounts: string[];
  formalDefects: string[]; // ایرادات شکلی و نگارشی
  substantiveRisks: string[]; // ریسک‌های ماهوی و حقوقی
  stampsAndSignaturesAudit: string[]; // بررسی وضعیت امضاها، مهرها و دست‌نویس‌ها
  statutoryComplianceNotes: string[]; // تطبیق با قوانین آمره و شروط صحت معامله (ماده ۱۹۰ ق.م)
  actionableRecommendations: string[]; // اقدامات تکمیلی و اصلاحی لازم
}

export type ActiveTab =
  | "counsel"
  | "drafter"
  | "judicial"
  | "risk"
  | "inspector"
  | "summarizer"
  | "pdf_to_text"
  | "vault";

