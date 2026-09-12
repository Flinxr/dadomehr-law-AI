import React, { useState } from "react";
import {
  FileSearch,
  Sparkles,
  HelpCircle,
  Clock,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  FolderLock,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  BookmarkCheck,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  FileDown,
  Compass,
  Flame,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { CaseSummaryResponse, LegalDocument } from "../types";
import { computeSHA256, getPersianNow } from "../utils/crypto";
import { exportToPersianPdf } from "../utils/pdfExport";

interface CaseSummarizerProps {
  onSaveDocument: (doc: Omit<LegalDocument, "id">) => void;
  initialCaseText?: string;
}

export const CaseSummarizer: React.FC<CaseSummarizerProps> = ({
  onSaveDocument,
  initialCaseText,
}) => {
  const [caseText, setCaseText] = useState(initialCaseText || "");
  const [documentType, setDocumentType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaseSummaryResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  
  // Two-page architecture: 'input' (Page 1) vs 'output' (Page 2)
  const [page, setPage] = useState<"input" | "output">("input");

  React.useEffect(() => {
    if (initialCaseText) {
      setCaseText(initialCaseText);
    }
  }, [initialCaseText]);

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseText.trim() || caseText.trim().length < 30) {
      setError("لطفاً متن دادنامه یا پرونده را وارد کنید (حداقل ۳۰ کاراکتر).");
      return;
    }

    setLoading(true);
    setError(null);
    setSavedToVault(false);
    setPage("output"); // Navigate to output page immediately to show loading state

    try {
      const res = await fetch("/api/case/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseText,
          documentType: documentType.trim() || "سند و اوراق قضایی",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.details || "خطا در تحلیل پرونده");
      }

      setResult(json.data);
    } catch (err: any) {
      setError(err.message || "خطا در برقراری ارتباط با سامانه تحلیل پرونده.");
      setPage("input"); // Return to input on fatal error so user can adjust
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const futureText = result.futureConsequences
      ? `\n\nنتیجه نهایی و پیش‌بینی رویدادهای بعد از سند:\n${result.futureConsequences.finalOutcomeSummary}\n\nرویدادهای قطعی:\n${result.futureConsequences.inevitableConsequences.map((c, i) => `${i + 1}- ${c}`).join("\n")}\n\nبدترین سناریوها و خطرات احتمالی:\n${result.futureConsequences.worstCaseScenarios.map((w, i) => `${i + 1}- ${w}`).join("\n")}`
      : "";
    const text = `${result.caseTitle}\n\nخلاصه به زبان ساده:\n${result.plainLanguageSummary}\n\nطرفین و خواسته:\n${result.partiesAndClaims}\n\nنقاط قوت:\n${result.legalStrengths.join("\n")}\n\nنقاط ضعف:\n${result.legalVulnerabilities.join("\n")}${futureText}\n\nاقدامات بعدی:\n${result.recommendedNextSteps.join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    const futurePdf = result.futureConsequences
      ? `\n\nنتیجه نهایی و پیش‌بینی پیامدهای بعدی این سند:
${result.futureConsequences.finalOutcomeSummary}

آثار و اتفاقاتی که حتماً رخ می‌دهد (روال قانونی قطعی):
${result.futureConsequences.inevitableConsequences.map((c, i) => `${i + 1}- ${c}`).join("\n")}

بدترین سناریوها و اتفاقات بدی که ممکن است بیفتد (سکوت متن، فقدان شروط، سوءنیت):
${result.futureConsequences.worstCaseScenarios.map((w, i) => `${i + 1}- ${w}`).join("\n")}

اقدامات بازدارنده و راه‌های پیشگیری:
${result.futureConsequences.preventiveSafeguards.map((p, i) => `${i + 1}- ${p}`).join("\n")}`
      : "";

    const reportContent = `گزارش تحلیلی و خلاصه‌سازی پرونده:
عنوان: ${result.caseTitle}
نوع سند: ${documentType.trim() || "سند و اوراق قضایی"}

خلاصه ماجرا به زبان ساده و قابل درک برای موکل:
${result.plainLanguageSummary}

طرفین و موضوع ادعا:
${result.partiesAndClaims}

گاه‌شمار وقایع و مواعد کلیدی:
${result.keyEventsTimeline?.map((t, i) => `${i + 1}- ${t}`).join("\n") || "—"}

ابهام‌زدایی از اصطلاحات تخصصی و عبارات سنگین:
${result.ambiguousPointsAndJargon?.map((j) => `• ${j.term}: ${j.simpleMeaning}`).join("\n") || "—"}

نقاط قوت و فرصت‌های پرونده:
${result.legalStrengths?.map((s) => `✓ ${s}`).join("\n") || "—"}

نقاط ضعف، تهدیدات و مواعد جاری:
${result.legalVulnerabilities?.map((v) => `⚠ ${v}`).join("\n") || "—"}${futurePdf}

نقشه راه و پیشنهادات اقدام دفاعی مرحله بعد:
${result.recommendedNextSteps?.map((r, i) => `${i + 1}. ${r}`).join("\n") || "—"}`;

    exportToPersianPdf({
      title: `گزارش تحلیلی: ${result.caseTitle}`,
      category: "خلاصه و ابهام‌زدایی پرونده",
      content: reportContent,
      datePersian: getPersianNow(),
    });
  };

  const handleSaveToVault = async () => {
    if (!result) return;
    const futureVault = result.futureConsequences
      ? `\n\n۷. نتیجه نهایی و پیش‌بینی رویدادهای پس از این سند:
${result.futureConsequences.finalOutcomeSummary}
- اتفاقات قطعی:
${result.futureConsequences.inevitableConsequences.join("\n")}
- بدترین سناریوهای احتمالی:
${result.futureConsequences.worstCaseScenarios.join("\n")}`
      : "";

    const content = `گزارش تحلیلی و خلاصه پرونده
عنوان: ${result.caseTitle}
نوع سند: ${documentType.trim() || "سند و اوراق قضایی"}
تاریخ تحلیل: ${getPersianNow()}

۱. خلاصه اجرایی به زبان ساده:
${result.plainLanguageSummary}

۲. شرح طرفین، خواسته و ادعا:
${result.partiesAndClaims}

۳. گاه‌شمار وقایع:
${result.keyEventsTimeline.map((t, i) => `${i + 1}- ${t}`).join("\n")}

۴. ابهام‌زدایی از اصطلاحات تخصصی و عبارات سنگین:
${result.ambiguousPointsAndJargon.map((j) => `• ${j.term}: ${j.simpleMeaning}`).join("\n")}

۵. نقاط قوت حقوقی پرونده:
${result.legalStrengths.map((s) => `+ ${s}`).join("\n")}

۶. نقاط ضعف و ریسک‌های جاری:
${result.legalVulnerabilities.map((v) => `- ${v}`).join("\n")}${futureVault}

۸. اقدامات پیشنهادی بعدی:
${result.recommendedNextSteps.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;

    const hash = await computeSHA256(content);
    const now = getPersianNow();

    onSaveDocument({
      title: `خلاصه پرونده: ${result.caseTitle}`,
      category: "case_summary",
      content,
      createdAtPersian: now,
      updatedAtPersian: now,
      status: "reviewed",
      documentHash: hash,
      tags: ["تحلیل پرونده", documentType],
    });

    setSavedToVault(true);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                <FileSearch className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                خلاصه‌سازی هوشمند پرونده قضایی و ابهام‌زدایی از دادنامه‌ها
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              رمزگشایی از اصطلاحات سنگین فقهی و حقوقی، استخراج پیام اصلی رای دادگاه یا لایحه، شفاف‌سازی برنده و بازنده، تعیین مواعد تجدیدنظرخواهی و نقشه راه دفاعی برای موکل و وکیل.
            </p>
          </div>

          {/* Step Indicator Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start md:self-center shrink-0 text-xs font-bold">
            <button
              onClick={() => setPage("input")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                page === "input"
                  ? "bg-white text-teal-700 shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center font-mono">
                ۱
              </span>
              <span>ورود متن سند</span>
            </button>

            <button
              onClick={() => {
                if (result || loading) setPage("output");
              }}
              disabled={!result && !loading}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                page === "output"
                  ? "bg-white text-teal-700 shadow-xs font-extrabold"
                  : result
                  ? "text-slate-600 hover:text-slate-900 cursor-pointer"
                  : "text-slate-400 cursor-not-allowed opacity-60"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center font-mono">
                ۲
              </span>
              <span>گزارش خلاصه و ابهام‌زدایی</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGE 1: INPUT BOX (صفحه اول: ورود متن و اطلاعات)          */}
      {/* ======================================================== */}
      {page === "input" && (
        <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200">
          {result && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-teal-900">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>شما یک گزارش خلاصه‌سازی آماده برای مشاهده دارید.</span>
              </div>
              <button
                onClick={() => setPage("output")}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <span>مشاهده گزارش تحلیلی</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleSummarize}
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>متن سند حقوقی یا اوراق پرونده</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">حداقل ۳۰ کاراکتر</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  نوع سند، پرونده یا موضوع قضایی
                </label>
                <span className="text-[11px] text-slate-400">
                  تایپ دلخواه یا انتخاب سریع
                </span>
              </div>
              <input
                type="text"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                placeholder="مثال: دادنامه شعبه ۱۰۵ کیفری دو، لایحه دفاعیه خلع ید، صلح‌نامه ملکی، اظهارنامه..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
              {/* Quick Preset Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400 font-medium ml-1">پیشنهاد سریع:</span>
                {[
                  "دادنامه و رای دادگاه",
                  "لایحه دفاعیه",
                  "دادخواست حقوقی",
                  "شکواییه و کیفرخواست",
                  "نظریه کارشناس رسمی",
                  "صلح‌نامه و توافق‌نامه",
                  "اظهارنامه رسمی",
                  "گزارش کلانتری/مرجع انتظامی",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDocumentType(item)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      documentType === item
                        ? "bg-teal-50 border-teal-300 text-teal-700 font-bold"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                متن کامل دادنامه، لایحه یا اوراق پرونده <span className="text-teal-600">*</span>
              </label>
              <textarea
                value={caseText}
                onChange={(e) => setCaseText(e.target.value)}
                rows={14}
                placeholder="متن کامل سند قضایی، دادنامه یا دادخواست را اینجا الصاق نمایید..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 resize-y font-mono leading-relaxed"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                اطلاعات وارد شده در این کادر هنگام رفت و برگشت به صفحه نتایج محفوظ مانده و پاک نمی‌شود.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال مطالعه عمیق، رمزگشایی و خلاصه‌سازی پرونده...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>خلاصه‌سازی پرونده و ابهام‌زدایی تخصصی</span>
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
                <span>بازگشت به متن پرونده</span>
              </button>

              {result && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <BookmarkCheck className="w-4 h-4 text-teal-600" />
                    <span>{result.caseTitle}</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    نوع سند: {documentType} • متن پرونده حفظ شده است
                  </span>
                </div>
              )}
            </div>

            {result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "کپی شد" : "کپی خلاصه"}</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="دانلود فایل PDF گزارش"
                >
                  <FileDown className="w-3.5 h-3.5 text-teal-600" />
                  <span>دانلود PDF</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ</span>
                </button>

                <button
                  onClick={handleSaveToVault}
                  disabled={savedToVault}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    savedToVault
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20"
                  }`}
                >
                  <FolderLock className="w-3.5 h-3.5" />
                  <span>{savedToVault ? "در پرونده ذخیره شد" : "ذخیره در پرونده"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full border-4 border-teal-100 border-t-teal-600 animate-spin" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800">
                  در حال استخراج ادله اثباتی، تصمیم دادگاه و مواعد قانونی...
                </h4>
                <p className="text-xs text-slate-500">
                  رمزگشایی از اصطلاحات سنگین فقهی و حقوقی و ارزیابی شانس دفاعی
                </p>
              </div>
            </div>
          )}

          {/* Empty State fallback if navigated without result */}
          {!loading && !result && (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px] text-slate-400 space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                <FileSearch className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                هنوز پرونده‌ای خلاصه‌سازی نشده است
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
                برای مشاهده گزارش تحلیلی، ابتدا در صفحه ورود متن، سند را قرار دهید و دکمه خلاصه‌سازی را بزنید.
              </p>
              <button
                onClick={() => setPage("input")}
                className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-teal-700 cursor-pointer"
              >
                ورود به صفحه متن پرونده
              </button>
            </div>
          )}

          {/* Result Content */}
          {result && !loading && (
            <div className="space-y-5">
              {/* Plain Language Summary */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 border-r-4 border-r-teal-600 shadow-sm">
                <span className="text-xs sm:text-sm font-bold text-teal-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>خلاصه ماجرا به زبان ساده و قابل درک برای موکل:</span>
                </span>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans select-text">
                  {result.plainLanguageSummary}
                </p>
                <div className="pt-3 text-xs text-slate-600 border-t border-slate-100 flex items-start gap-1">
                  <strong className="text-slate-800 shrink-0">طرفین و موضوع ادعا: </strong>
                  <span>{result.partiesAndClaims}</span>
                </div>
              </div>

              {/* Ambiguous Terms & Legal Jargon Explained */}
              {result.ambiguousPointsAndJargon && result.ambiguousPointsAndJargon.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      شرح و ابهام‌زدایی از اصطلاحات سنگین و عبارات حقوقی متن:
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.ambiguousPointsAndJargon.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                      >
                        <span className="text-xs font-bold text-amber-800 block font-mono">
                          «{item.term}»
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {item.simpleMeaning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline & Chronology */}
              {result.keyEventsTimeline && result.keyEventsTimeline.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      گاه‌شمار وقایع و مواعد کلیدی پرونده:
                    </h4>
                  </div>
                  <div className="space-y-2.5 border-r-2 border-slate-200 pr-3.5">
                    {result.keyEventsTimeline.map((event, idx) => (
                      <div key={idx} className="relative text-xs text-slate-700 flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                        <span className="leading-relaxed">{event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths & Vulnerabilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>نقاط قوت و فرصت‌های پرونده:</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {result.legalStrengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold shrink-0">✓</span>
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                  <h4 className="text-xs sm:text-sm font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>نقاط ضعف، تهدیدات و مواعد جاری:</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {result.legalVulnerabilities.map((v, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold shrink-0">⚠</span>
                        <span className="leading-relaxed">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Future Consequences & Bad Case Scenarios Box (باکس نتیجه آخر، عواقب و بدترین سناریوهای پس از سند) */}
              {result.futureConsequences && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 border-r-4 border-r-amber-500">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>سرانجام و نتیجه آخر سند: پس از این سند چه اتفاقاتی می‌افتد؟</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            پیش‌بینی عواقب و خطرات
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          آثار حقوقی قطعی، خطرات پنهان ناشی از قصد کلی یا فقدان بندهای سند
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Final Outcome Direct Summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1.5">
                    <span className="text-slate-900 font-bold flex items-center gap-1.5 text-xs">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>جمع‌بندی پیامد اجرایی و سرنوشت حقوقی سند:</span>
                    </span>
                    <p className="text-slate-800 leading-relaxed">{result.futureConsequences.finalOutcomeSummary}</p>
                  </div>

                  {/* Two Sub-Columns: Inevitable Next Events vs Worst Case Threats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Inevitable / What definitely happens next */}
                    <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 border-b border-sky-100 pb-2">
                        <Compass className="w-4 h-4 text-sky-600" />
                        <span>اتفاقات و آثار قطعی بعدی (روال قانونی):</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {result.futureConsequences.inevitableConsequences.map((event, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0 mt-1.5" />
                            <span className="leading-relaxed">{event}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Worst Case Scenarios / What bad things could happen */}
                    <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 border-b border-rose-100 pb-2">
                        <Flame className="w-4 h-4 text-rose-600" />
                        <span>چه اتفاقات بدی ممکن است بیفتد؟ (خطرات و سناریوهای فاجعه‌بار):</span>
                      </div>
                      <ul className="space-y-2 text-xs text-rose-950">
                        {result.futureConsequences.worstCaseScenarios.map((risk, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-rose-600 font-bold shrink-0">✕</span>
                            <span className="leading-relaxed">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Preventive Safeguards */}
                  {result.futureConsequences.preventiveSafeguards &&
                    result.futureConsequences.preventiveSafeguards.length > 0 && (
                      <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          <span>اقدامات پیشگیرانه جهت مهار و خنثی‌سازی خطرات احتمالی:</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                          {result.futureConsequences.preventiveSafeguards.map((safeguard, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-600 font-bold shrink-0">•</span>
                              <span className="leading-relaxed">{safeguard}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Recommended Next Steps */}
              {result.recommendedNextSteps && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-6 space-y-3 shadow-sm">
                  <h4 className="text-xs sm:text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-indigo-600" />
                    <span>نقشه راه و پیشنهادات اقدام دفاعی مرحله بعد:</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {result.recommendedNextSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white border border-indigo-100 text-xs text-slate-800 flex items-start gap-2 shadow-2xs"
                      >
                        <span className="text-indigo-600 font-bold shrink-0">{idx + 1}.</span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Back Button */}
              <div className="pt-2 flex justify-start">
                <button
                  onClick={() => setPage("input")}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>بازگشت و ویرایش متن پرونده</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
