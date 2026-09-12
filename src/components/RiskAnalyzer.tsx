import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Info,
  CheckCircle2,
  FileText,
  Users,
  Layers,
  ArrowLeftRight,
  FolderLock,
  Printer,
  ChevronRight,
  FileDown,
} from "lucide-react";
import { RiskAnalysisResponse, LegalDocument } from "../types";
import { computeSHA256, getPersianNow } from "../utils/crypto";
import { exportToPersianPdf } from "../utils/pdfExport";

interface RiskAnalyzerProps {
  onSendToDraft?: (text: string) => void;
  onSendToDrafter?: (text: string) => void;
  onSaveDocument?: (doc: Omit<LegalDocument, "id">) => void;
  initialContractText?: string;
}

const SAMPLE_HIGH_RISK_CONTRACT = `قرارداد واگذاری امتیاز و توسعه نرم‌افزار
ماده ۱: طرف اول (کارفرما) شرکت تجارت نوین و طرف دوم (مجری) آقای محمدرضا حسینی.
ماده ۲: مبلغ کل پروژه ۱۰۰ میلیون تومان بوده که پس از تایید نهایی و بلاشرط کارفرما در پایان سال پرداخت خواهد شد.
ماده ۳: در صورت هرگونه تاخیر ولو خارج از اراده مجری، روزانه مبلغ ۵ میلیون تومان وجه التزام از مطالبات ایشان کسر می‌گردد.
ماده ۴: کلیه خیارات قانونی ولو خیار غبن فاحش یا افحش، عیب و تدلیس از طرفین اسقاط گردید.
ماده ۵: مجری تا ۵ سال پس از خاتمه حق فعالیت در هیچ شرکت مشابه یا ارائه خدمات در این حوزه را ندارد.
ماده ۶: حل هرگونه اختلاف منحصراً از طریق داور منتخب کارفرما صورت می‌گیرد و نظر داور قطعی و غیرقابل اعتراض است.`;

export const RiskAnalyzer: React.FC<RiskAnalyzerProps> = ({
  onSendToDraft,
  onSaveDocument,
  initialContractText,
}) => {
  const [contractText, setContractText] = useState(initialContractText || "");
  const [specificConcerns, setSpecificConcerns] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskAnalysisResponse | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("all");
  const [savedToVault, setSavedToVault] = useState(false);

  // Two-page architecture: 'input' (Page 1) vs 'output' (Page 2)
  const [page, setPage] = useState<"input" | "output">("input");

  React.useEffect(() => {
    if (initialContractText) {
      setContractText(initialContractText);
    }
  }, [initialContractText]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractText.trim() || contractText.trim().length < 30) {
      setError("لطفاً متن قرارداد را وارد کنید (حداقل ۳۰ کاراکتر).");
      return;
    }

    setLoading(true);
    setError(null);
    setSavedToVault(false);
    setPage("output"); // Move to output page to display analysis progress & results

    try {
      const res = await fetch("/api/contract/analyze-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractText,
          specificConcerns: specificConcerns.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.details || "خطا در تحلیل ریسک قرارداد");
      }

      setResult(json.data);
      if (json.data.detectedParties && json.data.detectedParties.length > 0) {
        setSelectedPartyId("all");
      }
    } catch (err: any) {
      setError(err.message || "خطا در ارتباط با سامانه تحلیل هوشمند ریسک.");
      setPage("input"); // Return to input on failure so user can fix
    } finally {
      setLoading(false);
    }
  };

  const handleCopyProposal = (proposal: string, index: number) => {
    navigator.clipboard.writeText(proposal);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyReport = () => {
    if (!result) return;
    const report = `گزارش ممیزی ریسک قرارداد
شاخص ریسک: ${result.riskScore}/۱۰۰ (${result.overallRiskLevel})
خلاصه: ${result.executiveSummary}

تله‌های شناسایی شده:
${result.identifiedThreats.map((t, i) => `${i + 1}- ${t.clauseTitle}: ${t.threatExplanation}\nاصلاحی: ${t.alternativeProposal}`).join("\n\n")}

شروط غایب و مفقوده:
${result.missingClauses.join("\n")}

توصیه‌های مذاکره:
${result.negotiationAdvice.join("\n")}`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    const content = `گزارش ممیزی و تحلیل ریسک قرارداد:
شاخص کلی ریسک: ${result.riskScore} از ۱۰۰ (${result.overallRiskLevel})

خلاصه اجرایی تحلیل:
${result.executiveSummary}

تله‌ها و خطرات حقوقی شناسایی‌شده (${result.identifiedThreats.length} مورد):
${result.identifiedThreats
  .map(
    (t, i) => `--- بند ${i + 1}: ${t.clauseTitle} [سطح خطر: ${t.severity}]
عبارت در سند: "${t.originalSnippet || "-"}"
تحلیل ریسک: ${t.threatExplanation}
بند اصلاحی پیشنهادی دادومهر:
${t.alternativeProposal}`
  )
  .join("\n\n")}

شروط مفقوده و بندهای حیاتی غایب در قرارداد:
${result.missingClauses.map((c, i) => `${i + 1}- ${c}`).join("\n")}

راهکارها و تاکتیک‌های مذاکره و تعدیل قرارداد:
${result.negotiationAdvice.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;

    exportToPersianPdf({
      title: `گزارش ممیزی ریسک قرارداد (شاخص ${result.riskScore}/۱۰۰)`,
      category: "ممیزی ریسک حقوقی",
      content,
      datePersian: getPersianNow(),
    });
  };

  const handleSaveToVault = async () => {
    if (!result || !onSaveDocument) return;

    const content = `گزارش ممیزی و تحلیل ریسک قرارداد
تاریخ تحلیل: ${getPersianNow()}
شاخص کلی ریسک: ${result.riskScore} از ۱۰۰ (${result.overallRiskLevel})

۱. خلاصه اجرایی تحلیل:
${result.executiveSummary}

۲. خطرات و تله‌های حقوقی شناسایی‌شده:
${result.identifiedThreats
  .map(
    (t, i) => `---
بند ${i + 1}: ${t.clauseTitle} [شدت: ${t.severity}] ${t.targetParty ? `(طرف متضرر: ${t.targetParty})` : ""}
عبارت اصلی در سند: "${t.originalSnippet || "-"}"
ریسک حقوقی: ${t.threatExplanation}
متن اصلاحی پیشنهادی دادومهر:
${t.alternativeProposal}`
  )
  .join("\n\n")}

۳. شروط مفقوده و بندهای حیاتی غایب:
${result.missingClauses.map((c, i) => `${i + 1}- ${c}`).join("\n")}

۴. راهکارها و تاکتیک‌های مذاکره:
${result.negotiationAdvice.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;

    const hash = await computeSHA256(content);
    const now = getPersianNow();

    onSaveDocument({
      title: `گزارش ممیزی ریسک قرارداد (شاخص ${result.riskScore}/۱۰۰)`,
      category: "advisory",
      content,
      createdAtPersian: now,
      updatedAtPersian: now,
      status: "reviewed",
      documentHash: hash,
      tags: ["تحلیل ریسک", "ممیزی قرارداد", result.overallRiskLevel],
    });

    setSavedToVault(true);
  };

  const getRiskBadge = (score: number, level: string) => {
    if (score >= 70 || level === "critical" || level === "high") {
      return {
        label: "ریسک بالا و پرخطر",
        bg: "bg-red-500/20 text-red-200 border-red-500/30",
        barColor: "bg-red-400",
      };
    }
    if (score >= 40 || level === "medium") {
      return {
        label: "ریسک متوسط و نیازمند اصلاح",
        bg: "bg-amber-500/20 text-amber-200 border-amber-500/30",
        barColor: "bg-amber-400",
      };
    }
    return {
      label: "ریسک پایین و قابل قبول",
      bg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
      barColor: "bg-emerald-400",
    };
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                ممیزی هوشمند قراردادها و کشف تله‌های پنهان حقوقی
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              اسکن دقیق شروط تحمیلی، اسقاط نامتقارن خیارات، عدم تناسب وجه التزام، تعهدات مبهم و ارائه متن جایگزین و اصلاحی برای بازگرداندن توازن حقوقی به نفع شما.
            </p>
          </div>

          {/* Step Indicator Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start md:self-center shrink-0 text-xs font-bold">
            <button
              onClick={() => setPage("input")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                page === "input"
                  ? "bg-white text-indigo-700 shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-mono">
                ۱
              </span>
              <span>ورود متن قرارداد</span>
            </button>

            <button
              onClick={() => {
                if (result || loading) setPage("output");
              }}
              disabled={!result && !loading}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                page === "output"
                  ? "bg-white text-indigo-700 shadow-xs font-extrabold"
                  : result
                  ? "text-slate-600 hover:text-slate-900 cursor-pointer"
                  : "text-slate-400 cursor-not-allowed opacity-60"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-mono">
                ۲
              </span>
              <span>گزارش ممیزی و تله‌های حقوقی</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGE 1: INPUT BOX (صفحه اول: ورود و تنظیم قرارداد)         */}
      {/* ======================================================== */}
      {page === "input" && (
        <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200">
          {result && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-indigo-900">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  شما یک گزارش ممیزی با شاخص ریسک {result.riskScore}/۱۰۰ آماده دارید.
                </span>
              </div>
              <button
                onClick={() => setPage("output")}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <span>مشاهده گزارش تحلیل</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleAnalyze}
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>متن پیش‌نویس قرارداد</span>
              </span>
              <button
                type="button"
                onClick={() => setContractText(SAMPLE_HIGH_RISK_CONTRACT)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline underline-offset-4"
              >
                درج متن نمونه پرخطر
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                متن کامل یا بندهای مورد نظر قرارداد <span className="text-indigo-600">*</span>
              </label>
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                rows={13}
                placeholder="متن قرارداد پیشنهادی طرف مقابل یا پیش‌نویس توافق را اینجا الصاق نمایید..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 resize-y font-mono leading-relaxed"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                متن و دغدغه‌های وارد شده در این فرم پس از بازگشت از صفحه نتایج حفظ خواهند ماند.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                دغدغه یا حساسیت خاص شما (اختیاری)
              </label>
              <input
                type="text"
                value={specificConcerns}
                onChange={(e) => setSpecificConcerns(e.target.value)}
                placeholder="مثلاً: من مجری هستم و نگران تاخیر در پرداخت و مصادره چک ضمانتم هستم..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال اسکن حقوقی، استخراج طرفین و تحلیل خطرات سند...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>آغاز ممیزی و تحلیل ریسک قرارداد</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* PAGE 2: OUTPUT / REPORT (صفحه دوم: نمایش خروجی با دکمه بازگشت) */}
      {/* ======================================================== */}
      {page === "output" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top Bar with Back Button */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage("input")}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 group"
              >
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <span>بازگشت به ویرایش متن قرارداد</span>
              </button>

              {result && (
                <div className="hidden sm:block">
                  <span className="text-xs font-bold text-slate-800">
                    گزارش ممیزی قرارداد با هوش مصنوعی دادومهر
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {result.identifiedThreats.length} تله و بند مخاطره‌آمیز شناسایی گردید
                  </span>
                </div>
              )}
            </div>

            {result && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopyReport}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedReport ? "کپی شد" : "کپی گزارش"}</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="دانلود فایل PDF گزارش ممیزی"
                >
                  <FileDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>دانلود PDF</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ</span>
                </button>

                {onSaveDocument && (
                  <button
                    onClick={handleSaveToVault}
                    disabled={savedToVault}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      savedToVault
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20"
                    }`}
                  >
                    <FolderLock className="w-3.5 h-3.5" />
                    <span>{savedToVault ? "در پرونده ذخیره شد" : "ذخیره در پرونده"}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800">
                  در حال بررسی و تطبیق شروط با قواعد آمره قانون مدنی...
                </h4>
                <p className="text-xs text-slate-500">
                  ارزیابی خیارات، وجه التزام‌ها، شروط تحمیلی و تضامین متقابل
                </p>
              </div>
            </div>
          )}

          {/* Empty State fallback */}
          {!loading && !result && (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px] text-slate-400 space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                هنوز قراردادی جهت ممیزی تحلیل نشده است
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
                متن قرارداد را در کادر صفحه قبل قرار دهید تا هوش مصنوعی خطرات پنهان و شروط باطل را تفکیک کند.
              </p>
              <button
                onClick={() => setPage("input")}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 cursor-pointer"
              >
                ورود به صفحه متن قرارداد
              </button>
            </div>
          )}

          {/* Result Content */}
          {result && !loading && (
            <div className="space-y-5">
              {/* Detected Parties Selection Bar */}
              {result.detectedParties && result.detectedParties.length > 0 && (
                <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                        <Users className="w-5 h-5" />
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          طرفین شناسایی‌شده در قرارداد؛ شما کدام طرف هستید؟
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          با انتخاب نقش خود، خطرات تحمیلی و شروط پیشنهادی اختصاصی منافع شما تفکیک می‌شوند:
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedPartyId("all")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        selectedPartyId === "all"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      }`}
                    >
                      دیدگاه کلان (تمام {result.identifiedThreats.length} بند مخاطره‌آمیز)
                    </button>

                    {result.detectedParties.map((p) => {
                      const isSelected = selectedPartyId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPartyId(p.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200"
                              : "bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80"
                          }`}
                        >
                          <span>{p.title || p.roleName}</span>
                          {p.disadvantagesCount > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isSelected ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {p.disadvantagesCount} ریسک
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Score & Risk Level Header */}
              {(() => {
                const badge = getRiskBadge(result.riskScore, result.overallRiskLevel);
                const currentParty = result.detectedParties?.find((p) => p.id === selectedPartyId);
                const roleDisplay = currentParty
                  ? currentParty.title || currentParty.roleName
                  : "دیدگاه جامع و بی‌طرف (هر دو طرف)";

                return (
                  <div className="bg-indigo-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-3.5 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-xs text-indigo-200">
                            دیدگاه ممیزی: <strong className="text-white">{roleDisplay}</strong>
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed max-w-2xl">
                          {result.executiveSummary}
                        </p>
                      </div>

                      {/* Score Gauge */}
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 border border-white/15 shrink-0 w-36 backdrop-blur-xs">
                        <span className="text-[11px] text-indigo-200 font-medium">شاخص ریسک</span>
                        <span className="text-3xl font-black text-white">
                          {result.riskScore}
                          <span className="text-xs text-indigo-300 font-normal">/۱۰۰</span>
                        </span>
                        <div className="w-full bg-white/20 h-2 rounded-full mt-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${badge.barColor}`}
                            style={{ width: `${Math.min(100, Math.max(5, result.riskScore))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Identified Threats & Clauses */}
              {(() => {
                const currentParty = result.detectedParties?.find((p) => p.id === selectedPartyId);
                const filtered =
                  selectedPartyId === "all" || !currentParty
                    ? result.identifiedThreats
                    : result.identifiedThreats.filter((threat) => {
                        if (!threat.targetParty) return true;
                        const target = threat.targetParty.toLowerCase();
                        const role = currentParty.roleName.toLowerCase();
                        const title = currentParty.title.toLowerCase();
                        return (
                          target.includes(role) ||
                          role.includes(target) ||
                          target.includes(title) ||
                          title.includes(target) ||
                          threat.threatExplanation.toLowerCase().includes(role)
                        );
                      });
                const displayList = filtered.length > 0 ? filtered : result.identifiedThreats;

                return (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span>نقاط ضعف، خطرات شناسایی شده و پیشنهادات اصلاحی</span>
                      </h3>
                      <span className="text-xs text-slate-500">
                        {displayList.length} بند مخاطره‌آمیز
                        {filtered.length === 0 && selectedPartyId !== "all" && " (نمایش تمام بندها)"}
                      </span>
                    </div>

                    {displayList.map((threat, idx) => {
                      const isHigh = threat.severity === "high";
                      const isMed = threat.severity === "medium";
                      const cardBg = isHigh
                        ? "bg-red-50/70 border-red-200"
                        : isMed
                        ? "bg-amber-50/70 border-amber-200"
                        : "bg-slate-50 border-slate-200";

                      return (
                        <div
                          key={idx}
                          className={`border rounded-2xl p-5 space-y-3.5 transition-colors shadow-xs ${cardBg}`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  isHigh ? "bg-red-500" : isMed ? "bg-amber-500" : "bg-slate-400"
                                }`}
                              />
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                {threat.clauseTitle}
                              </h4>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {threat.targetParty && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                                  طرف متضرر: <strong>{threat.targetParty}</strong>
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                                  isHigh
                                    ? "bg-red-100 text-red-700 border border-red-200"
                                    : isMed
                                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                                    : "bg-slate-200 text-slate-700 border border-slate-300"
                                }`}
                              >
                                {isHigh ? "شدت بالا" : isMed ? "شدت متوسط" : "شدت جزیی"}
                              </span>
                            </div>
                          </div>

                          {threat.originalSnippet && (
                            <div className="p-3 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-800 font-mono">
                              <span className="text-[10px] text-slate-500 block mb-1 font-sans">
                                عبارت فعلی در سند:
                              </span>
                              {threat.originalSnippet}
                            </div>
                          )}

                          {/* Threat explanation */}
                          <div className="text-xs leading-relaxed flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-slate-200 text-slate-800">
                            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold text-slate-900">ریسک حقوقی: </strong>
                              <span>{threat.threatExplanation}</span>
                            </div>
                          </div>

                          {/* Alternative Proposal */}
                          <div className="p-4 rounded-xl bg-white border border-emerald-200 border-r-4 border-r-emerald-500 space-y-2.5 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>متن اصلاحی پیشنهادی دادومهر (جهت جایگزینی در قرارداد):</span>
                              </span>
                              <button
                                onClick={() => handleCopyProposal(threat.alternativeProposal, idx)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>کپی شد</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-emerald-600" />
                                    <span>کپی بند اصلاحی</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed font-sans select-text">
                              {threat.alternativeProposal}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Missing Clauses & Negotiation advice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.missingClauses && result.missingClauses.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>شروط حیاتی و بندهای مفقوده در متن قرارداد:</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600">
                      {result.missingClauses.map((clause, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-600 shrink-0 font-bold">✕</span>
                          <span>{clause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.negotiationAdvice && result.negotiationAdvice.length > 0 && (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 space-y-2.5 shadow-sm">
                    <h4 className="text-xs sm:text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                      <span>تاکتیک‌های مذاکره و اقناع طرف مقابل:</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-indigo-950">
                      {result.negotiationAdvice.map((adv, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-600 shrink-0 font-bold">•</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom Actions and Back Button */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setPage("input")}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>بازگشت به ویرایش متن قرارداد</span>
                </button>

                {onSendToDraft && (
                  <button
                    onClick={() => onSendToDraft(contractText)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-indigo-600/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>انتقال متن به تنظیم هوشمند قرارداد</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
